import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { LearnerProfile } from '../models/LearnerProfile.js';
import { Programme } from '../models/Programme.js';
import { Recommendation } from '../models/Recommendation.js';
import { Enrollment } from '../models/Enrollment.js';
import { ROLES } from '../models/_shared.js';
import { generateOrgSummary } from './ai/ai.service.js';

/**
 * Reports (docs/05 "Reports", docs/09). Everything is aggregated in MongoDB;
 * org reports only ever include the caller's own organization and never expose CV text or notes.
 */

const MONTHS = 12;
const STARTED = ['active', 'completed', 'dropped'];
const SUBMITTED_OR_LATER = ['submitted', 'under_review', 'pathway_published'];

const countBy = (rows) => Object.fromEntries(rows.map((r) => [r._id ?? 'unknown', r.n]));
const groupCount = (Model, match, field) =>
  Model.aggregate([{ $match: match }, { $group: { _id: `$${field}`, n: { $sum: 1 } } }]).then(countBy);

/** ['2025-12', …, '2026-11'] — the last N calendar months, oldest first (UTC). */
function lastMonths(n = MONTHS) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (n - 1 - i), 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  });
}
const monthStart = (n = MONTHS) => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (n - 1), 1));
};
const byMonth = (Model, match, dateField, extraGroup = {}) =>
  Model.aggregate([
    { $match: { ...match, [dateField]: { $gte: monthStart() } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: `$${dateField}` } }, n: { $sum: 1 }, ...extraGroup } },
  ]);

const rate = (num, den) => (den ? Math.round((num / den) * 100) : null);

/* ─────────────────────────── C2B admin ─────────────────────────── */

/** GET /admin/reports/overview — dashboard cards, "needs attention", charts. */
export async function adminOverview() {
  const months = lastMonths();
  const [
    learnersByRole,
    activeLearners,
    orgsByStatus,
    programmesByStatus,
    profilesByStatus,
    recsByStatus,
    enrollmentsByStatus,
    requestedRows,
    completedRows,
    aiRows,
    topRows,
    pendingOrgs,
    submittedProfiles,
    draftsToReview,
  ] = await Promise.all([
    groupCount(User, { role: { $in: [ROLES.STUDENT, ROLES.EMPLOYEE] } }, 'role'),
    User.countDocuments({ role: { $in: [ROLES.STUDENT, ROLES.EMPLOYEE] }, isActive: true }),
    groupCount(Organization, {}, 'status'),
    groupCount(Programme, {}, 'status'),
    groupCount(LearnerProfile, {}, 'status'),
    groupCount(Recommendation, {}, 'status'),
    groupCount(Enrollment, {}, 'status'),
    byMonth(Enrollment, {}, 'createdAt'),
    byMonth(Enrollment, { status: 'completed' }, 'completedAt'),
    byMonth(Recommendation, { 'aiMeta.inputTokens': { $gt: 0 } }, 'createdAt', {
      input: { $sum: '$aiMeta.inputTokens' },
      output: { $sum: '$aiMeta.outputTokens' },
      latency: { $avg: '$aiMeta.latencyMs' },
    }),
    Enrollment.aggregate([
      { $match: { status: { $ne: 'rejected' } } },
      {
        $group: {
          _id: '$programme',
          enrollments: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          rating: { $avg: '$learnerRating' },
          score: { $avg: '$score' },
        },
      },
      { $sort: { enrollments: -1, completed: -1 } },
      { $limit: 8 },
      { $lookup: { from: 'programmes', localField: '_id', foreignField: '_id', as: 'p' } },
      { $unwind: '$p' },
    ]),
    Organization.find({ status: 'pending' }, 'name industry createdAt').sort({ createdAt: 1 }).limit(5).lean(),
    LearnerProfile.find({ status: 'submitted' }, 'user learnerType submittedAt').sort({ submittedAt: 1 }).limit(5).populate('user', 'name').lean(),
    Recommendation.find({ status: 'pending_review' }, 'learner version createdAt aiDraft.confidence').sort({ createdAt: 1 }).limit(5).populate('learner', 'name').lean(),
  ]);

  const req = new Map(requestedRows.map((r) => [r._id, r.n]));
  const comp = new Map(completedRows.map((r) => [r._id, r.n]));
  const ai = new Map(aiRows.map((r) => [r._id, r]));
  const started = STARTED.reduce((s, k) => s + (enrollmentsByStatus[k] ?? 0), 0);
  const totalTokensIn = aiRows.reduce((s, r) => s + r.input, 0);
  const totalTokensOut = aiRows.reduce((s, r) => s + r.output, 0);

  return {
    cards: {
      pendingOrgs: orgsByStatus.pending ?? 0,
      pendingReviews: recsByStatus.pending_review ?? 0,
      submittedProfiles: profilesByStatus.submitted ?? 0,
      enrollmentRequests: enrollmentsByStatus.requested ?? 0,
      activeLearners,
      activeEnrollments: enrollmentsByStatus.active ?? 0,
    },
    totals: {
      students: learnersByRole[ROLES.STUDENT] ?? 0,
      employees: learnersByRole[ROLES.EMPLOYEE] ?? 0,
      organizations: orgsByStatus,
      programmes: programmesByStatus,
      profiles: profilesByStatus,
      recommendations: recsByStatus,
      enrollments: enrollmentsByStatus,
    },
    completionRate: rate(enrollmentsByStatus.completed ?? 0, started),
    enrollmentsByMonth: months.map((m) => ({ month: m, requested: req.get(m) ?? 0, completed: comp.get(m) ?? 0 })),
    topProgrammes: topRows.map((r) => ({
      id: String(r._id),
      code: r.p.code ?? null,
      title: r.p.title,
      enrollments: r.enrollments,
      completed: r.completed,
      avgRating: r.rating ? Math.round(r.rating * 10) / 10 : null,
      avgScore: r.score ? Math.round(r.score) : null,
    })),
    aiUsage: {
      totalInputTokens: totalTokensIn,
      totalOutputTokens: totalTokensOut,
      generations: Object.entries(recsByStatus)
        .filter(([s]) => s !== 'generating')
        .reduce((s, [, n]) => s + n, 0),
      failed: recsByStatus.failed ?? 0,
      byMonth: months.map((m) => ({
        month: m,
        generations: ai.get(m)?.n ?? 0,
        inputTokens: ai.get(m)?.input ?? 0,
        outputTokens: ai.get(m)?.output ?? 0,
        avgLatencyMs: ai.get(m)?.latency ? Math.round(ai.get(m).latency) : null,
      })),
    },
    needsAttention: {
      pendingOrgs: pendingOrgs.map((o) => ({ id: String(o._id), name: o.name, industry: o.industry ?? '', createdAt: o.createdAt })),
      submittedProfiles: submittedProfiles
        .filter((p) => p.user)
        .map((p) => ({ id: String(p.user._id), name: p.user.name, learnerType: p.learnerType, submittedAt: p.submittedAt })),
      draftsToReview: draftsToReview.map((r) => ({
        id: String(r._id),
        learner: r.learner?.name ?? '',
        version: r.version,
        confidence: r.aiDraft?.confidence ?? null,
        createdAt: r.createdAt,
      })),
    },
  };
}

/* ─────────────────────────── Org admin ─────────────────────────── */

async function orgLearners(org) {
  const employees = await User.find({ role: ROLES.EMPLOYEE, organization: org._id }, '_id isActive').lean();
  const ids = employees.map((e) => e._id);
  const profiles = await LearnerProfile.find({ user: { $in: ids } }, 'user status completionPercent employment.department').lean();
  return { employees, ids, profiles };
}

/** GET /org/reports/overview — department breakdown, completion funnel, enrollments (docs/09 org reports). */
export async function orgOverview(org) {
  const { employees, ids, profiles } = await orgLearners(org);
  const [enrollments, publishedLearners] = await Promise.all([
    Enrollment.find({ learner: { $in: ids } }, 'learner status').lean(),
    Recommendation.distinct('learner', { learner: { $in: ids }, status: 'published' }),
  ]);
  const published = new Set(publishedLearners.map(String));
  const enrolled = new Set(enrollments.filter((e) => e.status !== 'rejected').map((e) => String(e.learner)));
  const completedSet = new Set(enrollments.filter((e) => e.status === 'completed').map((e) => String(e.learner)));

  // Departments: organization's list first (so empty ones show), then any others found on profiles.
  const departments = new Map((org.departments ?? []).map((d) => [d.name, { department: d.name, headcount: d.headcount ?? null, employees: 0, complete: 0, submitted: 0, published: 0 }]));
  for (const p of profiles) {
    const name = p.employment?.department || '—';
    if (!departments.has(name)) departments.set(name, { department: name, headcount: null, employees: 0, complete: 0, submitted: 0, published: 0 });
    const d = departments.get(name);
    d.employees += 1;
    if (p.completionPercent >= 80 || p.status !== 'draft') d.complete += 1;
    if (SUBMITTED_OR_LATER.includes(p.status)) d.submitted += 1;
    if (published.has(String(p.user))) d.published += 1;
  }

  const complete = profiles.filter((p) => p.completionPercent >= 80 || p.status !== 'draft').length;
  const submitted = profiles.filter((p) => SUBMITTED_OR_LATER.includes(p.status)).length;
  const enrollmentsByStatus = enrollments.reduce((acc, e) => ({ ...acc, [e.status]: (acc[e.status] ?? 0) + 1 }), {});
  const started = STARTED.reduce((s, k) => s + (enrollmentsByStatus[k] ?? 0), 0);

  return {
    cards: {
      joined: employees.length,
      active: employees.filter((e) => e.isActive).length,
      complete,
      submitted,
      published: published.size,
      activeEnrollments: enrollmentsByStatus.active ?? 0,
      completedProgrammes: enrollmentsByStatus.completed ?? 0,
    },
    funnel: [
      { stage: 'joined', count: employees.length },
      { stage: 'complete', count: complete },
      { stage: 'submitted', count: submitted },
      { stage: 'published', count: published.size },
      { stage: 'enrolled', count: enrolled.size },
      { stage: 'completed', count: completedSet.size },
    ],
    byDepartment: [...departments.values()],
    enrollments: { byStatus: enrollmentsByStatus, completionRate: rate(enrollmentsByStatus.completed ?? 0, started) },
  };
}

/**
 * GET /org/reports/skill-gaps — aggregated `aiDraft.skillGaps` of the org's employees, by department.
 * Uses each employee's latest successful recommendation. Names are never included.
 */
export async function orgSkillGaps(org) {
  const { ids, profiles } = await orgLearners(org);
  const deptOf = new Map(profiles.map((p) => [String(p.user), p.employment?.department || '—']));
  const latest = await Recommendation.aggregate([
    { $match: { learner: { $in: ids }, status: { $in: ['pending_review', 'approved', 'published'] } } },
    { $sort: { version: -1 } },
    { $group: { _id: '$learner', gaps: { $first: '$aiDraft.skillGaps' } } },
  ]);

  const weight = { high: 3, medium: 2, low: 1 };
  const depts = new Map();
  const overall = new Map();
  const add = (map, key, gap) => {
    const cur = map.get(key) ?? { skill: gap.skill, count: 0, high: 0, score: 0 };
    cur.count += 1;
    if (gap.importance === 'high') cur.high += 1;
    cur.score += weight[gap.importance] ?? 1;
    map.set(key, cur);
  };
  for (const row of latest) {
    const dept = deptOf.get(String(row._id)) ?? '—';
    if (!depts.has(dept)) depts.set(dept, { department: dept, learners: 0, skills: new Map() });
    const d = depts.get(dept);
    d.learners += 1;
    const seen = new Set();
    for (const gap of row.gaps ?? []) {
      const key = (gap.skill?.en || gap.skill?.es || '').trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      add(d.skills, key, gap);
      add(overall, key, gap);
    }
  }
  const top = (map, n) =>
    [...map.values()]
      .sort((a, b) => b.score - a.score || b.count - a.count)
      .slice(0, n)
      .map(({ skill, count, high }) => ({ skill: { en: skill?.en ?? '', es: skill?.es ?? '' }, count, high }));

  return {
    analysedEmployees: latest.length,
    overall: top(overall, 10),
    byDepartment: [...depts.values()]
      .sort((a, b) => b.learners - a.learners)
      .map((d) => ({ department: d.department, learners: d.learners, skills: top(d.skills, 6) })),
  };
}

/* ─────────────────────────── Org AI summary (stretch) ─────────────────────────── */

const SUMMARY_TTL_MS = 24 * 60 * 60 * 1000;

function toSummaryDTO(cached, programmesById) {
  if (!cached?.result) return null;
  return {
    summary: cached.result.summary,
    highlights: cached.result.highlights,
    suggestedProgrammes: cached.result.suggestedProgrammes
      .map((s) => {
        const p = programmesById.get(s.programmeId);
        return p ? { programme: { id: String(p._id), code: p.code ?? null, title: p.title }, departments: s.departments, reason: s.reason } : null;
      })
      .filter(Boolean),
    generatedAt: cached.generatedAt,
    expiresAt: new Date(new Date(cached.generatedAt).getTime() + SUMMARY_TTL_MS),
  };
}

async function programmeMap(ids) {
  const rows = await Programme.find({ _id: { $in: ids } }, 'title code').lean();
  return new Map(rows.map((p) => [String(p._id), p]));
}

/** GET /org/reports/ai-summary — the cached summary (or null). */
export async function getOrgAiSummary(org) {
  const doc = await Organization.findById(org._id).select('+aiSummary').lean();
  const cached = doc?.aiSummary;
  if (!cached?.result) return null;
  return toSummaryDTO(cached, await programmeMap(cached.result.suggestedProgrammes.map((s) => s.programmeId)));
}

/**
 * POST /org/reports/ai-summary { refresh? } — anonymised aggregates only (no names, CVs or remarks) → Claude.
 * Returns the cached result for 24 h unless refresh is requested.
 */
export async function createOrgAiSummary(org, { refresh = false } = {}) {
  const doc = await Organization.findById(org._id).select('+aiSummary');
  const cached = doc.aiSummary;
  if (!refresh && cached?.generatedAt && Date.now() - new Date(cached.generatedAt).getTime() < SUMMARY_TTL_MS) {
    return { ...(await getOrgAiSummary(org)), cached: true };
  }

  const [overview, gaps, programmes] = await Promise.all([
    orgOverview(org),
    orgSkillGaps(org),
    Programme.find({ status: 'published', $or: [{ targetAudience: 'employee' }, { targetAudience: { $size: 0 } }] }, 'title code category level skillsGained targetDepartments').lean(),
  ]);
  const context = {
    organization: {
      industry: org.industry,
      size: org.size,
      goals: org.goals,
      objectives: org.objectives,
      skillGaps: org.skillGaps,
      digitalMaturity: org.digitalMaturity,
    },
    departments: overview.byDepartment.map(({ department, headcount, employees, submitted, published }) => ({ department, headcount, employeesOnPlatform: employees, submitted, pathwaysPublished: published })),
    funnel: overview.funnel,
    skillGaps: gaps.byDepartment.map((d) => ({ department: d.department, analysedEmployees: d.learners, topGaps: d.skills.map((s) => ({ skill: s.skill.en, employees: s.count, highPriority: s.high })) })),
    catalogue: programmes.map((p) => ({ id: String(p._id), code: p.code, title: p.title?.en, category: p.category, level: p.level, skillsGained: p.skillsGained, targetDepartments: p.targetDepartments?.length ? p.targetDepartments : undefined })),
  };

  const { result, meta } = await generateOrgSummary(context);
  const valid = new Set(context.catalogue.map((c) => c.id));
  result.suggestedProgrammes = result.suggestedProgrammes.filter((s) => valid.has(s.programmeId));

  doc.aiSummary = { result, meta, generatedAt: new Date() };
  doc.markModified('aiSummary');
  await doc.save();
  return { ...toSummaryDTO(doc.aiSummary, await programmeMap(result.suggestedProgrammes.map((s) => s.programmeId))), cached: false };
}
