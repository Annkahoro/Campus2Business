import { LearnerProfile } from '../models/LearnerProfile.js';
import { User } from '../models/User.js';
import { ROLES } from '../models/_shared.js';
import { ApiError } from '../utils/ApiError.js';
import { randomToken } from '../utils/tokens.js';
import { PROFILE, assertTransition } from '../utils/transitions.js';
import { deleteAsset, signedRawUrl, uploadBuffer } from './upload.service.js';
import { extractPdfText, looksLikePdf } from './cv.service.js';
import { notifyAdmins, notifyUser } from './notification.service.js';
import { Organization } from '../models/Organization.js';
import { emitProfileStatus } from '../sockets/events.js';

export const SUBMIT_THRESHOLD = 80;
const LOCKED_STATUSES = ['submitted', 'under_review'];

/* ─────────────────────────── completion ─────────────────────────── */

const filled = (v) => v !== undefined && v !== null && String(v).trim() !== '';
const ratio = (checks) => checks.filter(Boolean).length / checks.length;

/**
 * Section completeness (0–1) and the weighted completion percent (docs/03 §2):
 * personal 10, education 20, employment 15 (employees) / 5 (students), skills 20, goals 25, CV 10.
 * Students' weights total 90, so the result is normalised to 100.
 */
export function computeCompletion(p) {
  const isEmployee = p.learnerType === 'employee';
  const edu = p.education ?? [];
  const emp = p.employment ?? {};
  const goals = p.careerGoals ?? {};
  const prefs = p.learningPreferences ?? {};

  const sections = {
    personal: ratio([filled(p.country), filled(p.city), (p.languages ?? []).length > 0, (p.bio ?? '').trim().length >= 20]),
    education: edu.some((e) => filled(e.institution) && filled(e.qualification || e.fieldOfStudy))
      ? 1
      : edu.length > 0
        ? 0.5
        : 0,
    employment: isEmployee
      ? ratio([filled(emp.department), filled(emp.jobTitle), filled(emp.totalYearsExperience), filled(emp.responsibilities)])
      : // Students: any work experience or a job title counts, but it is optional (low weight).
        filled(emp.jobTitle) || (p.pastExperience ?? []).length > 0
        ? 1
        : 0,
    skills: Math.min((p.skills ?? []).length / 3, 1),
    goals: ratio([
      filled(goals.shortTerm),
      filled(goals.longTerm),
      (goals.targetRoles ?? []).length > 0,
      (p.interests ?? []).length > 0,
      filled(prefs.hoursPerWeek),
    ]),
    cv: p.cv?.url ? 1 : 0,
  };

  const weights = { personal: 10, education: 20, employment: isEmployee ? 15 : 5, skills: 20, goals: 25, cv: 10 };
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const earned = Object.entries(weights).reduce((sum, [k, w]) => sum + w * sections[k], 0);

  return { percent: Math.round((earned / total) * 100), sections };
}

/**
 * Recalculates completion and applies the automatic transitions:
 * draft ⇄ complete around 80 %, and pathway_published → complete when the learner edits.
 */
function refreshStatus(profile, { edited }) {
  const { percent } = computeCompletion(profile);
  profile.completionPercent = percent;
  const ready = percent >= SUBMIT_THRESHOLD;

  if (edited && profile.status === 'pathway_published') {
    assertTransition(PROFILE, 'pathway_published', 'complete');
    profile.status = 'complete';
  }
  if (profile.status === 'draft' && ready) profile.status = 'complete';
  else if (profile.status === 'complete' && !ready) profile.status = 'draft';
}

/* ─────────────────────────── DTO ─────────────────────────── */

const plain = (doc) => (doc?.toObject ? doc.toObject({ depopulate: false }) : doc);

/** Learner's own view. Never includes cv.extractedText. Remarks are included read-only. */
export function toLearnerProfileDTO(doc) {
  const p = plain(doc);
  const { percent, sections } = computeCompletion(p);
  return {
    id: String(p._id),
    learnerType: p.learnerType,
    organization: p.organization ? String(p.organization._id ?? p.organization) : null,
    personal: {
      phone: p.phone ?? '',
      dateOfBirth: p.dateOfBirth ?? null,
      gender: p.gender ?? null,
      country: p.country ?? '',
      city: p.city ?? '',
      languages: p.languages ?? [],
      bio: p.bio ?? '',
    },
    education: {
      education: (p.education ?? []).map(({ _id, ...e }) => ({ id: String(_id), ...e })),
      certifications: (p.certifications ?? []).map(({ _id, ...c }) => ({ id: String(_id), ...c })),
    },
    employment: {
      employment: p.employment ?? {},
      pastExperience: (p.pastExperience ?? []).map(({ _id, ...e }) => ({ id: String(_id), ...e })),
    },
    skills: { skills: (p.skills ?? []).map(({ _id, ...s }) => ({ id: String(_id), ...s })) },
    goals: {
      hobbies: p.hobbies ?? [],
      interests: p.interests ?? [],
      careerGoals: { shortTerm: '', longTerm: '', targetRoles: [], ...p.careerGoals },
      learningPreferences: { mode: 'any', preferredLanguage: 'any', ...p.learningPreferences },
    },
    cv: p.cv?.url ? { url: signedRawUrl(p.cv.publicId) ?? p.cv.url, fileName: p.cv.fileName, uploadedAt: p.cv.uploadedAt } : null,
    orgRemarks: (p.orgRemarks ?? []).map((r) => ({
      id: String(r._id),
      text: r.text,
      category: r.category,
      authorName: r.author?.name ?? null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt ?? null,
    })),
    completionPercent: percent,
    sections,
    status: p.status,
    isLocked: LOCKED_STATUSES.includes(p.status),
    canSubmit: p.learnerType === 'student' && p.status === 'complete' && percent >= SUBMIT_THRESHOLD,
    submittedAt: p.submittedAt ?? null,
    updatedAt: p.updatedAt,
  };
}

/* ─────────────────────────── service ─────────────────────────── */

/** Every student/employee has exactly one profile, created lazily on first access. */
export async function getOrCreateProfile(user) {
  let profile = await LearnerProfile.findOne({ user: user._id });
  if (!profile) {
    try {
      profile = await LearnerProfile.create({
        user: user._id,
        learnerType: user.role === ROLES.EMPLOYEE ? 'employee' : 'student',
        organization: user.organization ?? undefined,
      });
    } catch (err) {
      if (err?.code !== 11000) throw err;
      profile = await LearnerProfile.findOne({ user: user._id }); // created concurrently
    }
  }
  return profile;
}

export async function loadForView(userId) {
  return LearnerProfile.findOne({ user: userId }).populate('orgRemarks.author', 'name');
}

export async function getMyProfile(user) {
  await getOrCreateProfile(user);
  return toLearnerProfileDTO(await loadForView(user._id));
}

function assertEditable(profile) {
  if (LOCKED_STATUSES.includes(profile.status)) {
    throw ApiError.conflict('PROFILE_LOCKED', 'This profile is under review and cannot be edited right now');
  }
}

/** Employees: the department must be one of their organization's departments (docs/03 §2). */
async function assertEmployeeDepartment(profile, department) {
  if (profile.learnerType !== 'employee' || !department || !profile.organization) return;
  const org = await Organization.findById(profile.organization, 'departments').lean();
  if (org?.departments?.length && !org.departments.some((d) => d.name === department)) {
    throw ApiError.badRequest('VALIDATION_ERROR', 'Unknown department', [
      { path: 'employment.department', message: 'INVALID_DEPARTMENT' },
    ]);
  }
}

/** Tell the org admin when an employee first reaches the submission threshold. */
async function notifyIfEmployeeBecameComplete(profile, previousStatus) {
  if (profile.learnerType !== 'employee' || previousStatus !== 'draft' || profile.status !== 'complete') return;
  const org = await Organization.findById(profile.organization, 'owner').lean();
  if (!org) return;
  const employee = await User.findById(profile.user, 'name').lean();
  await notifyUser(org.owner, 'org.employeeProfileComplete', { employeeId: String(profile.user), name: employee?.name });
}

/** PATCH /profile/me/:step — `data` was validated by the step's Zod schema. */
export async function updateStep(user, step, data) {
  const profile = await getOrCreateProfile(user);
  assertEditable(profile);
  if (step === 'employment') await assertEmployeeDepartment(profile, data.employment?.department);

  const previousStatus = profile.status;
  const previousPercent = profile.completionPercent;
  profile.set(data);
  refreshStatus(profile, { edited: true });
  await profile.save();
  if (profile.status !== previousStatus || profile.completionPercent !== previousPercent) emitProfileStatus(profile);
  await notifyIfEmployeeBecameComplete(profile, previousStatus);
  return toLearnerProfileDTO(await loadForView(user._id));
}

/** POST /profile/me/cv — PDF ≤ 5 MB → Cloudinary (raw) + text extraction for the AI. */
export async function uploadCv(user, file) {
  if (!looksLikePdf(file.buffer)) throw ApiError.badRequest('INVALID_FILE_TYPE', 'The file is not a valid PDF');

  const profile = await getOrCreateProfile(user);
  assertEditable(profile);

  const [text, uploaded] = await Promise.all([
    extractPdfText(file.buffer),
    uploadBuffer(file.buffer, { subfolder: 'cvs', resourceType: 'raw', publicId: `cv-${randomToken(24)}.pdf` /* unguessable: CV links must not be enumerable */ }),
  ]);

  const oldPublicId = profile.cv?.publicId;
  const previousStatus = profile.status;
  const previousPercent = profile.completionPercent;
  profile.cv = {
    url: uploaded.url,
    publicId: uploaded.publicId,
    fileName: (file.originalname || 'cv.pdf').slice(0, 200),
    uploadedAt: new Date(),
    extractedText: text,
  };
  refreshStatus(profile, { edited: true });
  await profile.save();
  if (profile.status !== previousStatus || profile.completionPercent !== previousPercent) emitProfileStatus(profile);
  await notifyIfEmployeeBecameComplete(profile, previousStatus);
  if (oldPublicId && oldPublicId !== uploaded.publicId) await deleteAsset(oldPublicId, 'raw');

  const dto = toLearnerProfileDTO(await loadForView(user._id));
  return { ...dto, cvTextExtracted: text.length > 0 };
}

/** DELETE /profile/me/cv */
export async function deleteCv(user) {
  const profile = await getOrCreateProfile(user);
  assertEditable(profile);
  const oldPublicId = profile.cv?.publicId;
  profile.cv = undefined;
  refreshStatus(profile, { edited: true });
  await profile.save();
  emitProfileStatus(profile);
  if (oldPublicId) await deleteAsset(oldPublicId, 'raw');
  return toLearnerProfileDTO(await loadForView(user._id));
}

/**
 * complete → submitted. Shared by students (self) and org admins (their employees).
 * Throws PROFILE_ALREADY_SUBMITTED / PROFILE_INCOMPLETE / INVALID_STATUS_TRANSITION.
 */
export async function submitProfile(profile, { submittedBy, learnerName }) {
  if (LOCKED_STATUSES.includes(profile.status)) {
    throw ApiError.conflict('PROFILE_ALREADY_SUBMITTED', 'This profile has already been submitted');
  }
  refreshStatus(profile, { edited: false });
  if (profile.completionPercent < SUBMIT_THRESHOLD) {
    throw ApiError.badRequest('PROFILE_INCOMPLETE', `The profile must be at least ${SUBMIT_THRESHOLD}% complete`);
  }
  assertTransition(PROFILE, profile.status, 'submitted');

  profile.status = 'submitted';
  profile.submittedAt = new Date();
  profile.submittedBy = submittedBy;
  await profile.save();
  emitProfileStatus(profile);

  await notifyAdmins('profile.submitted', {
    userId: String(profile.user),
    name: learnerName,
    learnerType: profile.learnerType,
  });
  return profile;
}

/** POST /profile/me/submit — students only (employees are submitted by their org admin). */
export async function submitOwnProfile(user) {
  const profile = await getOrCreateProfile(user);
  if (profile.learnerType !== 'student') throw ApiError.forbidden('FORBIDDEN', 'Employees are submitted by their organization');
  await submitProfile(profile, { submittedBy: user._id, learnerName: user.name });
  return toLearnerProfileDTO(await loadForView(user._id));
}
