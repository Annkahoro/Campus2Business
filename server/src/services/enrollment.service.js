import mongoose from 'mongoose';
import { Enrollment, ACTIVE_ENROLLMENT_STATUSES } from '../models/Enrollment.js';
import { Programme } from '../models/Programme.js';
import { Recommendation } from '../models/Recommendation.js';
import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';
import { audit } from '../models/AuditLog.js';
import { ROLES } from '../models/_shared.js';
import { ApiError } from '../utils/ApiError.js';
import { ENROLLMENT, assertTransition } from '../utils/transitions.js';
import { randomToken } from '../utils/tokens.js';
import { notify, notifyAdmins } from './notification.service.js';
import { emitEnrollmentStatus } from '../sockets/events.js';

/**
 * Enrollments with SIMULATED payment (docs/07 §4). Completed and dropped enrollments are the learning
 * history the AI uses for the next pathway.
 */

const LEARNER_ROLES = [ROLES.STUDENT, ROLES.EMPLOYEE];
const PROGRAMME_FIELDS = 'title code catalogue categories subsidised level durationValue durationUnit deliveryMode coverImage price intakes status';
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* ─────────────────────────── DTO ─────────────────────────── */

export function toEnrollmentDTO(e, { withAdminNotes = false } = {}) {
  const p = e.programme;
  const l = e.learner;
  return {
    id: String(e._id),
    programme:
      p && p.title
        ? {
            id: String(p._id),
            code: p.code ?? null,
            title: p.title,
            catalogue: p.catalogue ?? 'elearning',
            categories: p.categories ?? [],
            subsidised: !!p.subsidised,
            level: p.level,
            durationValue: p.durationValue ?? null,
            durationUnit: p.durationUnit ?? null,
            deliveryMode: p.deliveryMode ?? null,
            coverImage: p.coverImage?.url ? { url: p.coverImage.url } : null,
            price: p.price ?? null,
          }
        : { id: String(p?._id ?? p) },
    learner: l && l.name ? { id: String(l._id), name: l.name, email: l.email, role: l.role } : { id: String(l?._id ?? l) },
    organization: e.organization?.name ? { id: String(e.organization._id), name: e.organization.name } : null,
    recommendation: e.recommendation ? String(e.recommendation) : null,
    intakeStartDate: e.intakeStartDate ?? null,
    status: e.status,
    payment: {
      simulated: true,
      amount: e.payment?.amount ?? 0,
      currency: e.payment?.currency ?? 'EUR',
      method: e.payment?.method ?? null,
      reference: e.payment?.reference ?? null,
      status: e.payment?.status ?? 'unpaid',
      paidAt: e.payment?.paidAt ?? null,
    },
    progressPercent: e.progressPercent ?? 0,
    startedAt: e.startedAt ?? null,
    completedAt: e.completedAt ?? null,
    score: e.score ?? null,
    learnerRating: e.learnerRating ?? null,
    learnerReview: e.learnerReview ?? '',
    ...(withAdminNotes ? { adminNotes: e.adminNotes ?? '' } : {}),
    requestedBy: e.requestedBy ? String(e.requestedBy) : null,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

const populateAll = (q) =>
  q
    .populate('programme', PROGRAMME_FIELDS)
    .populate('learner', 'name email role organization')
    .populate('organization', 'name');

async function loadDTO(id, opts) {
  let q = populateAll(Enrollment.findById(id));
  if (opts?.withAdminNotes) q = q.select('+adminNotes');
  return toEnrollmentDTO(await q.lean(), opts);
}

/* ─────────────────────────── helpers ─────────────────────────── */

async function findOr404(id, { select } = {}) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound('ENROLLMENT_NOT_FOUND', 'Enrollment not found');
  let q = Enrollment.findById(id);
  if (select) q = q.select(select);
  const e = await q;
  if (!e) throw ApiError.notFound('ENROLLMENT_NOT_FOUND', 'Enrollment not found');
  return e;
}

/** Learner who owns it, or the org admin of the learner's organization. */
async function assertCanAct(user, enrollment) {
  if (String(enrollment.learner) === String(user._id)) return;
  if (user.role === ROLES.ORG_ADMIN && enrollment.organization) {
    const org = await Organization.findOne({ _id: enrollment.organization, owner: user._id }, '_id').lean();
    if (org) return;
  }
  throw ApiError.notFound('ENROLLMENT_NOT_FOUND', 'Enrollment not found');
}

const orgOwner = async (orgId) => (orgId ? (await Organization.findById(orgId, 'owner').lean())?.owner : null);

/** Tell the learner (and their org admin) about a status change; push the live update. */
async function announce(enrollment, type, extra = {}) {
  const programme = await Programme.findById(enrollment.programme, 'title').lean();
  const params = {
    enrollmentId: String(enrollment._id),
    programme: programme?.title?.en || '',
    programmeEs: programme?.title?.es || programme?.title?.en || '',
    status: enrollment.status,
    ...extra,
  };
  await notify({ recipients: [enrollment.learner], type, params, link: '/learner/learning' });
  const owner = await orgOwner(enrollment.organization);
  // The org admin already knows about requests they made themselves.
  if (owner && type === 'enrollment.statusChanged' && !extra.onBehalf) {
    const learner = await User.findById(enrollment.learner, 'name').lean();
    await notify({ recipients: [owner], type, params: { ...params, name: learner?.name, forOrg: true }, link: '/org/enrollments' });
  }
}

/* ─────────────────────────── learner / org admin ─────────────────────────── */

/**
 * POST /enrollments { programmeId, intakeStartDate?, recommendationId?, learnerId? }
 * learnerId is only for org admins enrolling one of their employees ("Enroll on behalf").
 */
export async function requestEnrollment(user, { programmeId, intakeStartDate, recommendationId, learnerId }) {
  let learner = user;
  if (user.role === ROLES.ORG_ADMIN) {
    if (!learnerId) throw ApiError.badRequest('VALIDATION_ERROR', 'learnerId is required', [{ path: 'learnerId', message: 'REQUIRED' }]);
    learner = await User.findOne({ _id: learnerId, role: ROLES.EMPLOYEE, organization: user.organization });
    if (!learner) throw ApiError.notFound('EMPLOYEE_NOT_FOUND', 'Employee not found');
    const org = await Organization.findById(user.organization, 'status').lean();
    if (org?.status !== 'approved') throw ApiError.forbidden('ORG_NOT_APPROVED', 'Your organization is not approved');
  } else if (!LEARNER_ROLES.includes(user.role)) {
    throw ApiError.forbidden();
  }
  if (!learner.isActive) throw ApiError.conflict('EMPLOYEE_INACTIVE', 'This account is deactivated');

  const programme = await Programme.findOne({ _id: programmeId, status: 'published' });
  if (!programme) throw ApiError.notFound('PROGRAMME_NOT_FOUND', 'Programme not found');
  const learnerType = learner.role === ROLES.EMPLOYEE ? 'employee' : 'student';
  if (programme.targetAudience?.length && !programme.targetAudience.includes(learnerType)) {
    throw ApiError.badRequest('PROGRAMME_NOT_FOR_AUDIENCE', 'This programme is not offered to this learner type');
  }

  if (await Enrollment.exists({ learner: learner._id, programme: programme._id, status: { $in: ACTIVE_ENROLLMENT_STATUSES } })) {
    throw ApiError.conflict('ENROLLMENT_EXISTS', 'There is already an open enrollment for this programme');
  }
  if (await Enrollment.exists({ learner: learner._id, programme: programme._id, status: 'completed' })) {
    throw ApiError.conflict('ALREADY_COMPLETED', 'This programme has already been completed');
  }

  let recommendation;
  if (recommendationId) {
    const rec = await Recommendation.findOne({ _id: recommendationId, learner: learner._id, status: 'published' }, '_id').lean();
    recommendation = rec?._id; // ignore links to drafts or other learners' pathways
  }

  const isEmployee = learner.role === ROLES.EMPLOYEE;
  try {
    const enrollment = await Enrollment.create({
      learner: learner._id,
      programme: programme._id,
      organization: isEmployee ? learner.organization : undefined,
      recommendation,
      intakeStartDate: intakeStartDate ?? undefined,
      status: 'requested',
      requestedBy: user._id,
      payment: {
        simulated: true,
        amount: programme.subsidised ? 0 : (programme.price?.amount ?? 0), // subsidised = free for the learner
        currency: programme.price?.currency ?? 'EUR',
        method: isEmployee ? 'employer_invoice' : undefined, // docs/07 §5
        status: 'unpaid',
      },
    });

    await notifyAdmins('enrollment.requested', {
      enrollmentId: String(enrollment._id),
      name: learner.name,
      programme: programme.title?.en,
      programmeEs: programme.title?.es || programme.title?.en,
    });
    if (String(user._id) !== String(learner._id)) {
      await announce(enrollment, 'enrollment.statusChanged', { onBehalf: true });
    }
    emitEnrollmentStatus(enrollment);
    return loadDTO(enrollment._id);
  } catch (err) {
    if (err?.code === 11000) throw ApiError.conflict('ENROLLMENT_EXISTS', 'There is already an open enrollment for this programme');
    throw err;
  }
}

/** GET /enrollments/mine */
export async function listMine(user) {
  const rows = await populateAll(Enrollment.find({ learner: user._id }).sort({ createdAt: -1 })).lean();
  return rows.map((e) => toEnrollmentDTO(e));
}

/** POST /enrollments/:id/pay { method } — SIMULATED: no money moves (docs/07 §4). */
export async function pay(user, id, { method }) {
  const enrollment = await findOr404(id);
  await assertCanAct(user, enrollment);
  if (enrollment.status !== 'payment_pending') {
    throw ApiError.conflict('INVALID_STATUS_TRANSITION', `${enrollment.status} → active`);
  }
  if (method === 'employer_invoice' && !enrollment.organization) {
    throw ApiError.badRequest('VALIDATION_ERROR', 'Employer invoice is only for employees', [{ path: 'method', message: 'INVALID_VALUE' }]);
  }
  assertTransition(ENROLLMENT, 'payment_pending', 'active');

  enrollment.payment.method = method;
  enrollment.payment.status = 'paid';
  enrollment.payment.paidAt = new Date();
  enrollment.payment.reference = `SIM-${randomToken(6).toUpperCase().replace(/[^A-Z0-9]/g, 'X')}`;
  enrollment.status = 'active';
  enrollment.startedAt = new Date();
  await enrollment.save();

  await audit(user._id, 'enrollment.pay', 'Enrollment', enrollment._id, { method, reference: enrollment.payment.reference });
  await announce(enrollment, 'enrollment.statusChanged');
  emitEnrollmentStatus(enrollment);
  return loadDTO(enrollment._id);
}

/** POST /enrollments/:id/rate { rating, review } — completed only, learner only. */
export async function rate(user, id, { rating, review }) {
  const enrollment = await findOr404(id);
  if (String(enrollment.learner) !== String(user._id)) throw ApiError.notFound('ENROLLMENT_NOT_FOUND', 'Enrollment not found');
  if (enrollment.status !== 'completed') throw ApiError.conflict('ENROLLMENT_NOT_COMPLETED', 'Only completed programmes can be rated');
  enrollment.learnerRating = rating;
  enrollment.learnerReview = review ?? '';
  await enrollment.save();
  emitEnrollmentStatus(enrollment);
  return loadDTO(enrollment._id);
}

/** GET /org/enrollments — own organization's employees. */
export async function listForOrg(org, { status, search }) {
  const filter = { organization: org._id };
  if (status) filter.status = status;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    const users = await User.find({ organization: org._id, $or: [{ name: rx }, { email: rx }] }, '_id').lean();
    filter.learner = { $in: users.map((u) => u._id) };
  }
  const rows = await populateAll(Enrollment.find(filter).sort({ updatedAt: -1 })).lean();
  return rows.map((e) => toEnrollmentDTO(e));
}

/** Enrollments of one learner (org employee detail, admin learner detail). */
export async function listForLearner(learnerId) {
  const rows = await populateAll(Enrollment.find({ learner: learnerId }).sort({ createdAt: -1 })).lean();
  return rows.map((e) => toEnrollmentDTO(e));
}

/* ─────────────────────────── C2B admin ─────────────────────────── */

/** GET /admin/enrollments?status=&programme=&org=&search=&page=&limit= (+ counts per status) */
export async function adminList({ status, programme, org, search, page = 1, limit = 20 }) {
  const filter = {};
  if (status) filter.status = status;
  if (programme && mongoose.isValidObjectId(programme)) filter.programme = programme;
  if (org && mongoose.isValidObjectId(org)) filter.organization = org;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    const users = await User.find({ role: { $in: LEARNER_ROLES }, $or: [{ name: rx }, { email: rx }] }, '_id').lean();
    filter.learner = { $in: users.map((u) => u._id) };
  }
  const [rows, total, countRows] = await Promise.all([
    populateAll(
      Enrollment.find(filter)
        .select('+adminNotes')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ).lean(),
    Enrollment.countDocuments(filter),
    Enrollment.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);
  return {
    items: rows.map((e) => toEnrollmentDTO(e, { withAdminNotes: true })),
    counts: Object.fromEntries(countRows.map((c) => [c._id, c.n])),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

/**
 * PATCH /admin/enrollments/:id/status { status, score?, adminNotes? } (docs/07 §4)
 * Approving moves straight on: free programmes become active (payment waived), paid ones wait for payment.
 */
export async function adminSetStatus(admin, id, { status, score, adminNotes }) {
  const enrollment = await findOr404(id, { select: '+adminNotes' });
  const from = enrollment.status;

  if (status === 'approved') {
    assertTransition(ENROLLMENT, from, 'approved');
    const free = !enrollment.payment?.amount;
    const next = free ? 'active' : 'payment_pending';
    assertTransition(ENROLLMENT, 'approved', next);
    enrollment.status = next;
    if (free) {
      enrollment.payment.status = 'waived';
      enrollment.startedAt = new Date();
    }
  } else {
    assertTransition(ENROLLMENT, from, status);
    enrollment.status = status;
    if (status === 'active') enrollment.startedAt = enrollment.startedAt ?? new Date();
    if (status === 'completed') {
      enrollment.completedAt = new Date();
      enrollment.progressPercent = 100;
      if (score !== undefined && score !== null) enrollment.score = score;
    }
  }
  if (adminNotes !== undefined) enrollment.adminNotes = adminNotes;
  await enrollment.save();

  await audit(admin._id, 'enrollment.status', 'Enrollment', enrollment._id, { from, to: enrollment.status });
  await announce(enrollment, 'enrollment.statusChanged');
  emitEnrollmentStatus(enrollment);
  return loadDTO(enrollment._id, { withAdminNotes: true });
}

/** PATCH /admin/enrollments/:id/progress { progressPercent, score? } — active enrollments only. */
export async function adminSetProgress(admin, id, { progressPercent, score }) {
  const enrollment = await findOr404(id, { select: '+adminNotes' });
  if (enrollment.status !== 'active') {
    throw ApiError.conflict('ENROLLMENT_NOT_ACTIVE', 'Progress can only be updated on active enrollments');
  }
  enrollment.progressPercent = progressPercent;
  if (score !== undefined) enrollment.score = score;
  await enrollment.save();

  await announce(enrollment, 'enrollment.progressUpdated', { progress: progressPercent });
  emitEnrollmentStatus(enrollment);
  return loadDTO(enrollment._id, { withAdminNotes: true });
}

/** DELETE /admin/enrollments/:id — removes the record (also from the learner's history). */
export async function adminDelete(admin, id) {
  const enrollment = await findOr404(id);
  await enrollment.deleteOne();
  emitEnrollmentStatus({ _id: enrollment._id, learner: enrollment.learner, organization: enrollment.organization, status: 'deleted' });
  await audit(admin._id, 'enrollment.delete', 'Enrollment', enrollment._id, {
    learner: String(enrollment.learner),
    programme: String(enrollment.programme),
    status: enrollment.status,
  });
}
