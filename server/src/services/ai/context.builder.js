import { env } from '../../config/env.js';
import { Enrollment } from '../../models/Enrollment.js';
import { LearnerProfile } from '../../models/LearnerProfile.js';
import { Organization } from '../../models/Organization.js';
import { Programme } from '../../models/Programme.js';
import { ProgrammeField } from '../../models/ProgrammeField.js';
import { Recommendation } from '../../models/Recommendation.js';
import { ApiError } from '../../utils/ApiError.js';
import { getHistoricalSignals } from './historical.signals.js';

/**
 * Gathers everything Claude sees for one learner (docs/06 §2–§3).
 * Privacy (docs/06 §11): no email, phone, date of birth or gender, no internal IDs except programme IDs.
 */

export const CV_MAX_CHARS = 12000;

const ACTIVE = ['requested', 'approved', 'payment_pending', 'active'];
const STOP_WORDS = new Set([
  'and', 'the', 'for', 'with', 'from', 'into', 'que', 'con', 'para', 'los', 'las', 'del', 'una', 'skills', 'skill',
]);

/** Lower-cased word tokens (≥ 3 chars) from any strings / arrays / nested values. */
function tokens(...values) {
  const out = new Set();
  const walk = (v) => {
    if (!v) return;
    if (Array.isArray(v)) return v.forEach(walk);
    if (typeof v === 'object') return Object.values(v).forEach(walk);
    String(v)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .split(/[^a-z0-9+#]+/)
      .filter((w) => w.length >= 3 && !STOP_WORDS.has(w))
      .forEach((w) => out.add(w));
  };
  values.forEach(walk);
  return out;
}

const duration = (p) => (p.durationValue && p.durationUnit ? `${p.durationValue} ${p.durationUnit}` : undefined);
const price = (p) => (p.price?.amount != null ? (p.price.amount === 0 ? 'free' : `${p.price.amount} ${p.price.currency || 'EUR'}`) : undefined);

/** Compact programme for the prompt; `custom` holds only useInAI fields (docs/06 §3). */
function compactProgramme(p, aiFieldKeys, codeById) {
  const custom = Object.fromEntries(
    Object.entries(p.customFields instanceof Map ? Object.fromEntries(p.customFields) : (p.customFields ?? {})).filter(
      ([k, v]) => aiFieldKeys.has(k) && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0),
    ),
  );
  return {
    id: String(p._id),
    code: p.code || undefined,
    title: p.title?.en || p.title?.es,
    category: p.category,
    level: p.level,
    duration: duration(p),
    mode: p.deliveryMode,
    languages: p.language,
    skillsGained: p.skillsGained,
    prerequisites: (p.prerequisites ?? []).map((id) => codeById.get(String(id)) ?? String(id)),
    targetDepartments: p.targetDepartments?.length ? p.targetDepartments : undefined,
    price: price(p),
    custom: Object.keys(custom).length ? custom : undefined,
  };
}

function learnerProfileForPrompt(p) {
  return {
    location: [p.city, p.country].filter(Boolean).join(', ') || undefined,
    languages: p.languages,
    bio: p.bio || undefined,
    education: (p.education ?? []).map(({ _id, ...e }) => e),
    certifications: (p.certifications ?? []).map(({ _id, credentialUrl, ...c }) => c),
    employment: p.employment,
    pastExperience: (p.pastExperience ?? []).map(({ _id, ...e }) => e),
    skills: (p.skills ?? []).map(({ name, category, level }) => ({ name, category, level })),
    hobbies: p.hobbies,
    interests: p.interests,
    careerGoals: p.careerGoals,
    learningPreferences: p.learningPreferences,
  };
}

/**
 * Pre-filter (docs/06 §3): published, audience matches, not completed/active, keyword-scored,
 * top AI_MAX_CATALOGUE_ITEMS, plus prerequisites of the included programmes.
 */
function selectCatalogue(programmes, { learnerType, excludeIds, learnerTokens }) {
  const max = env.AI_MAX_CATALOGUE_ITEMS;
  const eligible = programmes.filter(
    (p) =>
      !excludeIds.has(String(p._id)) && (!(p.targetAudience ?? []).length || p.targetAudience.includes(learnerType)),
  );
  if (eligible.length <= max) return eligible;

  const scored = eligible
    .map((p) => {
      const pt = tokens(p.skillsGained, p.tags, p.category?.replace(/_/g, ' '), p.targetDepartments, p.title?.en);
      let score = 0;
      pt.forEach((w) => learnerTokens.has(w) && (score += 1));
      return { p, score };
    })
    .sort((a, b) => b.score - a.score);

  const byId = new Map(programmes.map((p) => [String(p._id), p]));
  const picked = new Map(scored.slice(0, max).map(({ p }) => [String(p._id), p]));
  // Always include prerequisites of included programmes (unless already completed).
  for (const p of [...picked.values()]) {
    for (const pre of p.prerequisites ?? []) {
      const id = String(pre);
      if (!picked.has(id) && byId.has(id) && !excludeIds.has(id)) picked.set(id, byId.get(id));
    }
  }
  return [...picked.values()];
}

/**
 * @returns {Promise<object>} context for prompts.buildUserPrompt + extra fields used by post-processing
 *   (catalogueIds, completedIds, activeIds, programmesById) and a `snapshot` stored for the admin.
 */
export async function buildContext(learnerUserId) {
  const profile = await LearnerProfile.findOne({ user: learnerUserId }).select('+cv.extractedText').lean();
  if (!profile) throw ApiError.notFound('PROFILE_NOT_FOUND', 'Learner profile not found');

  const [organization, enrollments, previous, programmes, aiFields] = await Promise.all([
    profile.learnerType === 'employee' && profile.organization
      ? Organization.findById(profile.organization).lean()
      : null,
    Enrollment.find({ learner: learnerUserId }).populate('programme', 'title code').sort({ createdAt: 1 }).lean(),
    Recommendation.findOne({ learner: learnerUserId, status: 'published' })
      .sort({ publishedAt: -1 })
      .populate('final.pathway.programme', 'title code')
      .lean(),
    Programme.find({ status: 'published' }).lean(),
    ProgrammeField.find({ isActive: true, useInAI: true }, 'key').lean(),
  ]);

  const completedIds = new Set(enrollments.filter((e) => e.status === 'completed').map((e) => String(e.programme?._id)));
  const activeIds = new Set(enrollments.filter((e) => ACTIVE.includes(e.status)).map((e) => String(e.programme?._id)));
  const excludeIds = new Set([...completedIds, ...activeIds]);

  const department = profile.employment?.department;
  const remarks = (profile.orgRemarks ?? []).map((r) => ({ category: r.category, text: r.text }));
  const orgContext = organization
    ? {
        name: organization.name,
        industry: organization.industry,
        size: organization.size,
        goals: organization.goals,
        objectives: organization.objectives,
        skillGaps: organization.skillGaps,
        digitalMaturity: organization.digitalMaturity,
        employeeDepartment: department,
      }
    : null;

  const learnerTokens = tokens(
    profile.skills?.map((s) => s.name),
    profile.interests,
    profile.careerGoals,
    profile.employment?.jobTitle,
    department,
    profile.education?.map((e) => [e.fieldOfStudy, e.qualification, e.keyCourses]),
    organization?.skillGaps,
    organization?.goals,
    remarks.map((r) => r.text),
  );

  const selected = selectCatalogue(programmes, { learnerType: profile.learnerType, excludeIds, learnerTokens });
  const aiFieldKeys = new Set(aiFields.map((f) => f.key));
  const codeById = new Map(programmes.map((p) => [String(p._id), p.code || String(p._id)]));
  const catalogue = selected.map((p) => compactProgramme(p, aiFieldKeys, codeById));

  const history = enrollments
    .filter((e) => ['completed', 'active', 'dropped'].includes(e.status) && e.programme)
    .map((e) => ({
      programme: e.programme.title?.en || e.programme.code,
      code: e.programme.code || undefined,
      status: e.status,
      score: e.score ?? undefined,
      rating: e.learnerRating ?? undefined,
      progressPercent: e.status === 'active' ? e.progressPercent : undefined,
    }));

  const enrollmentStatus = new Map(enrollments.map((e) => [String(e.programme?._id), e.status]));
  const previousPathway = previous
    ? previous.final.pathway.map((s) => ({
        order: s.order,
        programme: s.programme?.title?.en || s.programme?.code,
        status: enrollmentStatus.get(String(s.programme?._id)) ?? 'not_started',
      }))
    : null;

  const signals = await getHistoricalSignals(profile, completedIds);
  const cvText = (profile.cv?.extractedText ?? '').slice(0, CV_MAX_CHARS);

  return {
    learnerType: profile.learnerType,
    profile: learnerProfileForPrompt(profile),
    cvText,
    organization: orgContext,
    orgRemarks: remarks,
    history,
    previousPathway,
    historicalPatterns: signals.text,
    catalogue,

    // Not sent to Claude — used by post-processing.
    profileDoc: profile,
    programmesById: new Map(programmes.map((p) => [String(p._id), p])),
    catalogueIds: new Set(catalogue.map((c) => c.id)),
    completedIds,
    activeIds,

    // Stored on the recommendation for the admin (select: false).
    snapshot: {
      learnerType: profile.learnerType,
      department: department ?? null,
      organization: orgContext?.name ?? null,
      cvChars: cvText.length,
      remarksCount: remarks.length,
      history,
      previousPathway,
      historicalPatterns: signals.text,
      catalogueIds: catalogue.map((c) => c.id),
      catalogueSize: catalogue.length,
      publishedProgrammes: programmes.length,
    },
  };
}
