import mongoose from 'mongoose';
import { Recommendation } from '../models/Recommendation.js';
import { LearnerProfile } from '../models/LearnerProfile.js';
import { Organization } from '../models/Organization.js';
import { Programme } from '../models/Programme.js';
import { Enrollment } from '../models/Enrollment.js';
import { User } from '../models/User.js';
import { audit } from '../models/AuditLog.js';
import { ROLES } from '../models/_shared.js';
import { ApiError } from '../utils/ApiError.js';
import { PROFILE, RECOMMENDATION, assertTransition, canTransition } from '../utils/transitions.js';
import { assertAiConfigured, generatePathway, translateTexts } from './ai/ai.service.js';
import { buildContext } from './ai/context.builder.js';
import { notifyAdmins, notifyUser } from './notification.service.js';
import { loadForView, toLearnerProfileDTO } from './profile.service.js';
import { toOrgSummaryDTO } from './organization.service.js';
import { emitProfileStatus, emitRecommendationStatus } from '../sockets/events.js';

/** Profile statuses from which a pathway may be generated (docs/07 §2). */
const GENERATABLE = ['submitted', 'under_review', 'pathway_published'];
const EDITABLE = ['pending_review', 'approved'];
const BULK_CONCURRENCY = 2;

const PROGRAMME_FIELDS =
  'title code catalogue categories subsidised level durationValue durationUnit deliveryMode coverImage price prerequisites status language';
const POPULATE_FINAL = [
  { path: 'final.pathway.programme', select: PROGRAMME_FIELDS },
  { path: 'final.alternatives.programme', select: PROGRAMME_FIELDS },
];
const POPULATE_ALL = [
  ...POPULATE_FINAL,
  { path: 'aiDraft.pathway.programme', select: PROGRAMME_FIELDS },
  { path: 'aiDraft.alternatives.programme', select: PROGRAMME_FIELDS },
  { path: 'learner', select: 'name email role avatar organization' },
  { path: 'reviewedBy', select: 'name' },
  { path: 'generatedBy', select: 'name' },
  { path: 'organization', select: 'name logo status departments' },
];

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const i18n = (v) => ({ en: v?.en ?? '', es: v?.es ?? '' });
const idOf = (v) => (v ? String(v._id ?? v) : null);

/* ─────────────────────────── DTOs ─────────────────────────── */

function programmeSummary(p) {
  if (!p || !p.title) return p ? { id: idOf(p), missing: true } : null;
  return {
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
    language: p.language ?? [],
    coverImage: p.coverImage?.url ? { url: p.coverImage.url } : null,
    price: p.price ?? null,
    prerequisites: (p.prerequisites ?? []).map(idOf),
    status: p.status,
  };
}

const stepDTO = (s) => ({
  programme: programmeSummary(s.programme),
  order: s.order,
  phase: s.phase,
  reason: i18n(s.reason),
  matchScore: s.matchScore ?? null,
  expectedOutcome: i18n(s.expectedOutcome),
});
const altDTO = (a) => ({ programme: programmeSummary(a.programme), reason: i18n(a.reason) });

/**
 * Prerequisites in the final pathway that are neither earlier in the pathway nor completed.
 * Recomputed on every read so the admin sees the effect of their edits.
 */
function prerequisiteWarnings(pathway, completedIds = new Set()) {
  const warnings = [];
  const seen = new Set();
  for (const step of pathway) {
    const p = step.programme;
    for (const pre of p?.prerequisites ?? []) {
      const id = idOf(pre);
      if (!seen.has(id) && !completedIds.has(id)) {
        warnings.push({ code: 'MISSING_PREREQUISITE', programme: idOf(p), prerequisite: id });
      }
    }
    seen.add(idOf(p));
  }
  return warnings;
}

/** Learner (and org admin) view: final pathway only, no aiDraft pathway, notes or AI metadata. */
export function toLearnerRecommendationDTO(r) {
  if (!r) return null;
  return {
    id: String(r._id),
    version: r.version,
    summary: i18n(r.final?.summary),
    strengths: (r.aiDraft?.strengths ?? []).map(i18n),
    skillGaps: (r.aiDraft?.skillGaps ?? []).map((g) => ({ skill: i18n(g.skill), importance: g.importance })),
    pathway: (r.final?.pathway ?? []).map(stepDTO),
    alternatives: (r.final?.alternatives ?? []).map(altDTO),
    adminNoteToLearner: i18n(r.final?.adminNoteToLearner),
    publishedAt: r.publishedAt ?? null,
    feedback: r.learnerFeedback?.rating
      ? { rating: r.learnerFeedback.rating, comment: r.learnerFeedback.comment ?? '', at: r.learnerFeedback.at }
      : null,
  };
}

const learnerRef = (u) =>
  u && u.name ? { id: String(u._id), name: u.name, email: u.email, role: u.role } : { id: idOf(u) };

/** Queue / history row. */
export function toRecommendationRowDTO(r) {
  return {
    id: String(r._id),
    learner: learnerRef(r.learner),
    learnerType: r.learner?.role === ROLES.EMPLOYEE ? 'employee' : 'student',
    organization: r.organization?.name ? { id: String(r.organization._id), name: r.organization.name } : null,
    version: r.version,
    status: r.status,
    confidence: r.aiDraft?.confidence ?? null,
    steps: r.final?.pathway?.length ?? 0,
    failureReason: r.failureReason ?? null,
    rejectionReason: r.rejectionReason ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    publishedAt: r.publishedAt ?? null,
  };
}

/** Admin review view: everything, including internalNotes and the context snapshot. */
function toAdminRecommendationDTO(r, completedIds) {
  const finalPathway = r.final?.pathway ?? [];
  return {
    ...toRecommendationRowDTO(r),
    aiDraft: {
      summary: i18n(r.aiDraft?.summary),
      strengths: (r.aiDraft?.strengths ?? []).map(i18n),
      skillGaps: (r.aiDraft?.skillGaps ?? []).map((g) => ({ skill: i18n(g.skill), importance: g.importance })),
      pathway: (r.aiDraft?.pathway ?? []).map(stepDTO),
      alternatives: (r.aiDraft?.alternatives ?? []).map(altDTO),
      confidence: r.aiDraft?.confidence ?? null,
    },
    final: {
      summary: i18n(r.final?.summary),
      pathway: finalPathway.map(stepDTO),
      alternatives: (r.final?.alternatives ?? []).map(altDTO),
      adminNoteToLearner: i18n(r.final?.adminNoteToLearner),
    },
    internalNotes: r.internalNotes ?? '',
    warnings: (r.warnings ?? []).map((w) => ({ code: w.code, programme: idOf(w.programme), detail: w.detail ?? null })),
    liveWarnings: prerequisiteWarnings(finalPathway, completedIds),
    aiMeta: r.aiMeta ?? null,
    contextSnapshot: r.contextSnapshot ?? null,
    generatedBy: r.generatedBy?.name ? { id: String(r.generatedBy._id), name: r.generatedBy.name } : null,
    reviewedBy: r.reviewedBy?.name ? { id: String(r.reviewedBy._id), name: r.reviewedBy.name } : null,
    reviewedAt: r.reviewedAt ?? null,
    learnerFeedback: r.learnerFeedback?.rating ? r.learnerFeedback : null,
    isEditable: EDITABLE.includes(r.status),
  };
}

/* ─────────────────────────── helpers ─────────────────────────── */

async function findOr404(id, { select, populate } = {}) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound('RECOMMENDATION_NOT_FOUND', 'Recommendation not found');
  let q = Recommendation.findById(id);
  if (select) q = q.select(select);
  if (populate) q = q.populate(populate);
  const rec = await q;
  if (!rec) throw ApiError.notFound('RECOMMENDATION_NOT_FOUND', 'Recommendation not found');
  return rec;
}

async function completedProgrammeIds(learnerId) {
  const rows = await Enrollment.find({ learner: learnerId, status: 'completed' }, 'programme').lean();
  return new Set(rows.map((e) => String(e.programme)));
}

/** Moves the learner's profile, only along allowed transitions. */
async function moveProfile(learnerId, to) {
  const profile = await LearnerProfile.findOne({ user: learnerId });
  if (profile && profile.status !== to && canTransition(PROFILE, profile.status, to)) {
    profile.status = to;
    await profile.save();
    emitProfileStatus(profile);
  }
  return profile;
}

async function orgOwnerOf(learner) {
  if (!learner?.organization) return null;
  const org = await Organization.findById(learner.organization, 'owner').lean();
  return org?.owner ?? null;
}

/* ─────────────────────────── post-processing (docs/06 §8) ─────────────────────────── */

const titleOf = (p, lang) => p?.title?.[lang] || p?.title?.en || p?.code || '';

export function postProcess(result, ctx) {
  const warnings = [];
  const usable = (id) => mongoose.isValidObjectId(id) && ctx.catalogueIds.has(id);
  const taken = (id) => ctx.completedIds.has(id) || ctx.activeIds.has(id);

  // 1–2. Keep catalogue IDs only; drop completed/active and duplicates.
  const seen = new Set();
  let steps = [...result.pathway]
    .sort((a, b) => a.order - b.order)
    .filter((s) => {
      if (!usable(s.programmeId)) {
        warnings.push({ code: 'DROPPED_UNKNOWN_PROGRAMME', detail: s.programmeId });
        return false;
      }
      if (taken(s.programmeId)) {
        warnings.push({ code: 'DROPPED_ALREADY_TAKEN', programme: s.programmeId });
        return false;
      }
      if (seen.has(s.programmeId)) return false;
      seen.add(s.programmeId);
      return true;
    });

  // 3. Prerequisites: move or insert them before the dependent step when possible, otherwise warn.
  let restarts = 0;
  for (let i = 0; i < steps.length; i += 1) {
    if (restarts > 50) break; // defensive: prerequisite cycles are blocked when programmes are saved
    const programme = ctx.programmesById.get(steps[i].programmeId);
    for (const pre of programme?.prerequisites ?? []) {
      const preId = String(pre);
      if (taken(preId)) continue;
      const at = steps.findIndex((s) => s.programmeId === preId);
      if (at !== -1 && at < i) continue;
      if (at > i) {
        const [moved] = steps.splice(at, 1);
        steps.splice(i, 0, moved);
        warnings.push({ code: 'PREREQUISITE_REORDERED', programme: preId });
        i = -1; // re-check from the start after a move
        restarts += 1;
        break;
      }
      if (usable(preId)) {
        const preProgramme = ctx.programmesById.get(preId);
        steps.splice(i, 0, {
          programmeId: preId,
          phase: 'foundation',
          matchScore: steps[i].matchScore,
          reason: {
            en: `Required before "${titleOf(programme, 'en')}".`,
            es: `Requisito previo de «${titleOf(programme, 'es')}».`,
          },
          expectedOutcome: {
            en: `Ready to start "${titleOf(programme, 'en')}".`,
            es: `Preparado/a para empezar «${titleOf(programme, 'es')}».`,
          },
        });
        warnings.push({ code: 'PREREQUISITE_INSERTED', programme: preId, detail: titleOf(preProgramme, 'en') });
        i = -1;
        restarts += 1;
        break;
      }
      warnings.push({ code: 'MISSING_PREREQUISITE', programme: preId, detail: titleOf(programme, 'en') });
    }
  }
  steps = steps.slice(0, 8);
  const uniqueWarnings = [...new Map(warnings.map((w) => [`${w.code}:${w.programme ?? w.detail}`, w])).values()];
  if (steps.length === 0) throw new ApiError(502, 'AI_FAILED', 'The AI did not return any valid catalogue programme');

  // 4. Re-number 1..n.
  const pathway = steps.map((s, idx) => ({
    programme: s.programmeId,
    order: idx + 1,
    phase: s.phase,
    reason: i18n(s.reason),
    matchScore: s.matchScore,
    expectedOutcome: i18n(s.expectedOutcome),
  }));

  const inPathway = new Set(pathway.map((s) => String(s.programme)));
  const altSeen = new Set();
  const alternatives = result.alternatives
    .filter((a) => {
      const ok = usable(a.programmeId) && !taken(a.programmeId) && !inPathway.has(a.programmeId) && !altSeen.has(a.programmeId);
      altSeen.add(a.programmeId);
      return ok;
    })
    .map((a) => ({ programme: a.programmeId, reason: i18n(a.reason) }));

  return {
    aiDraft: {
      summary: i18n(result.summary),
      strengths: result.strengths.map(i18n),
      skillGaps: result.skillGaps.map((g) => ({ skill: i18n(g.skill), importance: g.importance })),
      pathway,
      alternatives,
      confidence: result.confidence,
    },
    warnings: uniqueWarnings,
  };
}

/* ─────────────────────────── generation ─────────────────────────── */

async function assertCanGenerate(learnerId) {
  if (!mongoose.isValidObjectId(learnerId)) throw ApiError.notFound('LEARNER_NOT_FOUND', 'Learner not found');
  const learner = await User.findOne({ _id: learnerId, role: { $in: [ROLES.STUDENT, ROLES.EMPLOYEE] } });
  if (!learner) throw ApiError.notFound('LEARNER_NOT_FOUND', 'Learner not found');
  if (!learner.isActive) throw ApiError.conflict('LEARNER_INACTIVE', 'This learner account is deactivated');
  const profile = await LearnerProfile.findOne({ user: learner._id }, 'status organization');
  if (!profile || !GENERATABLE.includes(profile.status)) {
    throw ApiError.conflict('PROFILE_NOT_SUBMITTED', 'The profile must be submitted before a pathway can be generated');
  }
  return { learner, profile };
}

/** Creates the `generating` document. Throws AI_BUSY when one is already running for this learner. */
async function createGenerating(admin, learnerId) {
  const { learner, profile } = await assertCanGenerate(learnerId);
  const last = await Recommendation.findOne({ learner: learner._id }, 'version').sort({ version: -1 }).lean();
  try {
    const rec = await Recommendation.create({
      learner: learner._id,
      profile: profile._id,
      organization: profile.organization ?? learner.organization ?? undefined,
      version: (last?.version ?? 0) + 1,
      status: 'generating',
      generatedBy: admin._id,
    });
    emitRecommendationStatus(rec);
    return rec;
  } catch (err) {
    if (err?.code === 11000) throw ApiError.conflict('AI_BUSY', 'A pathway is already being generated for this learner');
    throw err;
  }
}

/** The background job (docs/06 §2): context → Claude → post-process → pending_review | failed. */
export async function runGeneration(recommendationId) {
  const rec = await Recommendation.findById(recommendationId);
  if (!rec || rec.status !== 'generating') return;
  const started = Date.now();
  const learner = await User.findById(rec.learner, 'name role organization').lean();

  try {
    const ctx = await buildContext(rec.learner);
    if (ctx.catalogue.length === 0) {
      throw new ApiError(422, 'AI_FAILED', 'No published programmes are available for this learner');
    }
    const { result, meta } = await generatePathway(ctx);
    const { aiDraft, warnings } = postProcess(result, ctx);

    assertTransition(RECOMMENDATION, rec.status, 'pending_review');
    rec.aiDraft = aiDraft;
    rec.final = {
      summary: aiDraft.summary,
      pathway: aiDraft.pathway,
      alternatives: aiDraft.alternatives,
      adminNoteToLearner: { en: '', es: '' },
    };
    rec.warnings = warnings;
    rec.aiMeta = meta;
    rec.contextSnapshot = ctx.snapshot;
    rec.status = 'pending_review';
    await rec.save();
    emitRecommendationStatus(rec);

    // A newer draft replaces any older unpublished draft of the same learner.
    const older = await Recommendation.find({
      learner: rec.learner,
      _id: { $ne: rec._id },
      status: { $in: EDITABLE },
    });
    for (const o of older) {
      o.status = 'rejected';
      o.rejectionReason = 'SUPERSEDED';
      await o.save();
      emitRecommendationStatus(o);
    }

    await moveProfile(rec.learner, 'under_review');
    console.log(`🤖 pathway v${rec.version} ready for ${learner?.name} (${meta.inputTokens}→${meta.outputTokens} tokens, ${meta.latencyMs} ms)`);
    await notifyAdmins('recommendation.ready', {
      recommendationId: String(rec._id),
      learnerId: String(rec.learner),
      name: learner?.name,
    });
  } catch (err) {
    console.error(`❌ pathway generation failed for ${learner?.name ?? rec.learner}:`, err.message);
    rec.status = 'failed';
    rec.failureReason = String(err.message || 'AI_FAILED').slice(0, 500);
    rec.aiMeta = { ...(rec.aiMeta ?? {}), latencyMs: Date.now() - started };
    await rec.save().catch((e) => console.error('could not mark recommendation failed:', e.message));
    emitRecommendationStatus(rec);
    await notifyAdmins('recommendation.failed', {
      recommendationId: String(rec._id),
      learnerId: String(rec.learner),
      name: learner?.name,
    });
  }
}

/** POST /admin/recommendations/generate/:userId → 202 { recommendationId } */
export async function startGeneration(admin, learnerId) {
  assertAiConfigured();
  const rec = await createGenerating(admin, learnerId);
  setImmediate(() => {
    runGeneration(rec._id).catch((err) => console.error('💥 runGeneration crashed:', err));
  });
  return { recommendationId: String(rec._id), status: rec.status, version: rec.version };
}

/** POST /admin/recommendations/generate-bulk { userIds } — per-id results; processed 2 at a time. */
export async function startBulkGeneration(admin, userIds) {
  assertAiConfigured();
  const results = [];
  const queued = [];
  for (const id of [...new Set(userIds)]) {
    try {
      const rec = await createGenerating(admin, id);
      queued.push(rec._id);
      results.push({ userId: id, ok: true, recommendationId: String(rec._id) });
    } catch (err) {
      results.push({ userId: id, ok: false, code: err.code ?? 'INTERNAL_ERROR' });
    }
  }

  setImmediate(async () => {
    const queue = [...queued];
    const worker = async () => {
      while (queue.length) {
        const next = queue.shift();
        await runGeneration(next).catch((err) => console.error('💥 runGeneration crashed:', err));
      }
    };
    await Promise.all(Array.from({ length: BULK_CONCURRENCY }, worker));
  });

  return { results, queued: queued.length };
}

/** On boot: anything left in `generating` by a restart can never finish — mark it failed. */
export async function failStuckGenerations() {
  const res = await Recommendation.updateMany(
    { status: 'generating' },
    { $set: { status: 'failed', failureReason: 'Interrupted by a server restart' } },
  );
  if (res.modifiedCount) console.warn(`⚠️  marked ${res.modifiedCount} interrupted generation(s) as failed`);
}

/* ─────────────────────────── admin queue & review ─────────────────────────── */

/** GET /admin/recommendations?status=&search=&page=&limit= (+ counts per status) */
export async function listQueue({ status, search, learner, page = 1, limit = 20 }) {
  const filter = {};
  if (status) filter.status = status;
  if (learner && mongoose.isValidObjectId(learner)) filter.learner = learner;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    const users = await User.find({ $or: [{ name: rx }, { email: rx }] }, '_id').lean();
    filter.learner = { $in: users.map((u) => u._id) };
  }

  const [items, total, countRows] = await Promise.all([
    Recommendation.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('learner', 'name email role')
      .populate('organization', 'name')
      .select('-contextSnapshot -internalNotes')
      .lean(),
    Recommendation.countDocuments(filter),
    Recommendation.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);

  return {
    items: items.map(toRecommendationRowDTO),
    counts: Object.fromEntries(countRows.map((c) => [c._id, c.n])),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

/** GET /admin/recommendations/:id — aiDraft + final + notes + context, plus the learner snapshot. */
export async function getForAdmin(id) {
  const rec = await findOr404(id, { select: '+internalNotes +contextSnapshot', populate: POPULATE_ALL });
  const learnerId = rec.learner?._id ?? rec.learner;
  const [profile, completedIds, history, versions] = await Promise.all([
    loadForView(learnerId),
    completedProgrammeIds(learnerId),
    Enrollment.find({ learner: learnerId }).populate('programme', 'title code').sort({ createdAt: -1 }).lean(),
    Recommendation.find({ learner: learnerId }, 'version status createdAt publishedAt').sort({ version: -1 }).lean(),
  ]);

  return {
    recommendation: toAdminRecommendationDTO(rec, completedIds),
    learner: {
      user: learnerRef(rec.learner),
      organization: toOrgSummaryDTO(rec.organization),
      profile: profile ? toLearnerProfileDTO(profile) : null,
      history: history.map((e) => ({
        id: String(e._id),
        programme: e.programme ? { id: String(e.programme._id), title: e.programme.title, code: e.programme.code } : null,
        status: e.status,
        score: e.score ?? null,
        rating: e.learnerRating ?? null,
        completedAt: e.completedAt ?? null,
      })),
      versions: versions.map((v) => ({
        id: String(v._id),
        version: v.version,
        status: v.status,
        createdAt: v.createdAt,
        publishedAt: v.publishedAt ?? null,
      })),
    },
  };
}

function assertEditable(rec) {
  if (!EDITABLE.includes(rec.status)) {
    throw ApiError.conflict('RECOMMENDATION_LOCKED', `A ${rec.status} recommendation cannot be edited`);
  }
}

/** Every programme in the final pathway/alternatives must exist and be published; no duplicates. */
async function validateFinalProgrammes(final) {
  const stepIds = final.pathway.map((s) => s.programmeId);
  const altIds = final.alternatives.map((a) => a.programmeId);
  const all = [...new Set([...stepIds, ...altIds])];
  const found = await Programme.find({ _id: { $in: all }, status: 'published' }, '_id').lean();
  const ok = new Set(found.map((p) => String(p._id)));

  const details = [];
  final.pathway.forEach((s, i) => {
    if (!ok.has(s.programmeId)) details.push({ path: `final.pathway.${i}.programmeId`, message: 'INVALID_PROGRAMME' });
    if (stepIds.indexOf(s.programmeId) !== i) details.push({ path: `final.pathway.${i}.programmeId`, message: 'DUPLICATE_PROGRAMME' });
  });
  final.alternatives.forEach((a, i) => {
    if (!ok.has(a.programmeId)) details.push({ path: `final.alternatives.${i}.programmeId`, message: 'INVALID_PROGRAMME' });
    if (stepIds.includes(a.programmeId)) details.push({ path: `final.alternatives.${i}.programmeId`, message: 'DUPLICATE_PROGRAMME' });
  });
  if (details.length) throw ApiError.badRequest('VALIDATION_ERROR', 'Invalid programmes in the pathway', details);
}

/** PATCH /admin/recommendations/:id { final?, internalNotes? } — editing an approved draft reopens it. */
export async function updateFinal(admin, id, { final, internalNotes }) {
  const rec = await findOr404(id, { select: '+internalNotes' });
  assertEditable(rec);

  if (final) {
    await validateFinalProgrammes(final);
    rec.final = {
      summary: final.summary,
      adminNoteToLearner: final.adminNoteToLearner,
      pathway: final.pathway.map((s, i) => ({
        programme: s.programmeId,
        order: i + 1,
        phase: s.phase,
        reason: s.reason,
        matchScore: s.matchScore ?? null,
        expectedOutcome: s.expectedOutcome,
      })),
      alternatives: final.alternatives.map((a) => ({ programme: a.programmeId, reason: a.reason })),
    };
  }
  if (internalNotes !== undefined) rec.internalNotes = internalNotes;

  if (rec.status === 'approved' && final) {
    assertTransition(RECOMMENDATION, 'approved', 'pending_review');
    rec.status = 'pending_review';
  }
  rec.reviewedBy = admin._id;
  rec.reviewedAt = new Date();
  await rec.save();
  emitRecommendationStatus(rec);
  return getForAdmin(id);
}

/** POST /admin/recommendations/:id/approve */
export async function approve(admin, id) {
  const rec = await findOr404(id);
  assertTransition(RECOMMENDATION, rec.status, 'approved');
  if (!rec.final?.pathway?.length) throw ApiError.badRequest('PATHWAY_EMPTY', 'The pathway has no programmes');
  rec.status = 'approved';
  rec.reviewedBy = admin._id;
  rec.reviewedAt = new Date();
  await rec.save();
  emitRecommendationStatus(rec);
  return getForAdmin(id);
}

/** POST /admin/recommendations/:id/publish — "Approve & Publish" does both steps (docs/07 §3). */
export async function publish(admin, id) {
  const rec = await findOr404(id);
  if (!rec.final?.pathway?.length) throw ApiError.badRequest('PATHWAY_EMPTY', 'The pathway has no programmes');
  if (rec.status === 'pending_review') {
    assertTransition(RECOMMENDATION, 'pending_review', 'approved');
    rec.status = 'approved';
  }
  assertTransition(RECOMMENDATION, rec.status, 'published');
  rec.status = 'published';
  rec.reviewedBy = admin._id;
  rec.reviewedAt = new Date();
  rec.publishedAt = new Date();
  await rec.save();
  emitRecommendationStatus(rec);

  await moveProfile(rec.learner, 'pathway_published');
  await audit(admin._id, 'recommendation.publish', 'Recommendation', rec._id, { version: rec.version });

  const learner = await User.findById(rec.learner, 'name organization').lean();
  const params = { recommendationId: String(rec._id), version: rec.version, count: rec.final.pathway.length };
  await notifyUser(rec.learner, 'pathway.published', params);
  const owner = await orgOwnerOf(learner);
  if (owner) await notifyUser(owner, 'pathway.published', { ...params, employeeId: String(rec.learner), name: learner.name });

  return getForAdmin(id);
}

/** POST /admin/recommendations/:id/reject { reason } */
export async function reject(admin, id, { reason }) {
  const rec = await findOr404(id);
  if (rec.status === 'approved') {
    assertTransition(RECOMMENDATION, 'approved', 'pending_review');
    rec.status = 'pending_review';
  }
  assertTransition(RECOMMENDATION, rec.status, 'rejected');
  rec.status = 'rejected';
  rec.rejectionReason = reason;
  rec.reviewedBy = admin._id;
  rec.reviewedAt = new Date();
  await rec.save();
  emitRecommendationStatus(rec);

  // Profile goes back (docs/07 §2): to pathway_published if an earlier version is live, otherwise submitted.
  const open = await Recommendation.exists({ learner: rec.learner, status: { $in: ['generating', ...EDITABLE] } });
  if (!open) {
    const live = await Recommendation.exists({ learner: rec.learner, status: 'published' });
    await moveProfile(rec.learner, live ? 'pathway_published' : 'submitted');
  }
  await audit(admin._id, 'recommendation.reject', 'Recommendation', rec._id, { reason });
  return getForAdmin(id);
}

/** POST /admin/recommendations/:id/translate — fills empty en/es texts in `final` with Claude. */
export async function translateMissing(admin, id) {
  const rec = await findOr404(id);
  assertEditable(rec);

  const slots = []; // { id, get, set }
  const add = (key, holder, field) => {
    const v = holder?.[field] ?? {};
    const en = (v.en ?? '').trim();
    const es = (v.es ?? '').trim();
    if (en && !es) slots.push({ id: `${key}:es`, from: 'en', to: 'es', text: en, holder, field });
    if (es && !en) slots.push({ id: `${key}:en`, from: 'es', to: 'en', text: es, holder, field });
  };
  add('summary', rec.final, 'summary');
  add('note', rec.final, 'adminNoteToLearner');
  rec.final.pathway.forEach((s, i) => {
    add(`step${i}.reason`, s, 'reason');
    add(`step${i}.outcome`, s, 'expectedOutcome');
  });
  rec.final.alternatives.forEach((a, i) => add(`alt${i}.reason`, a, 'reason'));

  if (slots.length === 0) return { ...(await getForAdmin(id)), translated: 0 };

  const { translations, usage } = await translateTexts(slots.map(({ id: sid, from, to, text }) => ({ id: sid, from, to, text })));
  let translated = 0;
  for (const slot of slots) {
    const text = translations.get(slot.id);
    if (!text) continue;
    slot.holder[slot.field] = { ...i18n(slot.holder[slot.field]), [slot.to]: text };
    translated += 1;
  }
  rec.markModified('final');
  rec.set('aiMeta.inputTokens', (rec.aiMeta?.inputTokens ?? 0) + usage.inputTokens);
  rec.set('aiMeta.outputTokens', (rec.aiMeta?.outputTokens ?? 0) + usage.outputTokens);
  rec.reviewedBy = admin._id;
  rec.reviewedAt = new Date();
  await rec.save();
  emitRecommendationStatus(rec);
  return { ...(await getForAdmin(id)), translated };
}

/* ─────────────────────────── learner & org views ─────────────────────────── */

/** Latest published version + earlier published versions (docs/07 §3: learners only ever see `published`). */
export async function getPublishedForLearner(learnerId) {
  const recs = await Recommendation.find({ learner: learnerId, status: 'published' })
    .sort({ publishedAt: -1 })
    .populate(POPULATE_FINAL)
    .lean();
  const [current, ...previous] = recs.map(toLearnerRecommendationDTO);
  return { current: current ?? null, previous };
}

/** POST /profile/me/recommendation/feedback { rating, comment } — on the latest published version. */
export async function saveFeedback(learnerId, { rating, comment }) {
  const rec = await Recommendation.findOne({ learner: learnerId, status: 'published' }).sort({ publishedAt: -1 });
  if (!rec) throw ApiError.notFound('RECOMMENDATION_NOT_FOUND', 'No published pathway yet');
  rec.learnerFeedback = { rating, comment: comment ?? '', at: new Date() };
  await rec.save();
  return getPublishedForLearner(learnerId);
}

/** GET /org/employees/:employeeId/recommendation — published final only. */
export async function getPublishedForEmployee(employeeId) {
  const { current } = await getPublishedForLearner(employeeId);
  return current;
}

/** Version rows for the admin learner detail page. */
export async function listForLearner(learnerId) {
  const recs = await Recommendation.find({ learner: learnerId })
    .sort({ version: -1 })
    .populate('learner', 'name email role')
    .populate('organization', 'name')
    .lean();
  return recs.map(toRecommendationRowDTO);
}

/**
 * DELETE /admin/recommendations/:id — any status except `generating`.
 * The learner's profile is re-derived from what is left (an admin override, so it may skip the normal
 * status machine): a remaining published pathway → pathway_published, an open draft → under_review,
 * nothing → submitted (so a new pathway can be generated).
 */
export async function adminDelete(admin, id) {
  const rec = await findOr404(id);
  if (rec.status === 'generating') throw ApiError.conflict('AI_BUSY', 'This pathway is still being generated');
  await rec.deleteOne();
  emitRecommendationStatus({ _id: rec._id, learner: rec.learner, status: 'deleted', version: rec.version });

  const profile = await LearnerProfile.findOne({ user: rec.learner });
  if (profile && ['under_review', 'pathway_published'].includes(profile.status)) {
    const [live, open] = await Promise.all([
      Recommendation.exists({ learner: rec.learner, status: 'published' }),
      Recommendation.exists({ learner: rec.learner, status: { $in: ['generating', ...EDITABLE] } }),
    ]);
    const to = live ? 'pathway_published' : open ? 'under_review' : 'submitted';
    if (profile.status !== to) {
      profile.status = to;
      await profile.save();
      emitProfileStatus(profile);
    }
  }
  await audit(admin._id, 'recommendation.delete', 'Recommendation', rec._id, { learner: String(rec.learner), status: rec.status });
}
