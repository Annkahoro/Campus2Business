import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { LearnerProfile } from '../models/LearnerProfile.js';
import { Organization } from '../models/Organization.js';
import { Recommendation } from '../models/Recommendation.js';
import { Enrollment } from '../models/Enrollment.js';
import { ROLES } from '../models/_shared.js';
import { ApiError } from '../utils/ApiError.js';
import { getOrCreateProfile, loadForView, toLearnerProfileDTO } from './profile.service.js';
import { toOrgSummaryDTO } from './organization.service.js';
import { listForLearner } from './recommendation.service.js';

/** Admin view of learners (docs/05 "Learners", docs/09 /admin/learners). */

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const LEARNER_ROLES = [ROLES.STUDENT, ROLES.EMPLOYEE];

function rowDTO(user, profile, org, latest) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    avatar: user.avatar?.url ? { url: user.avatar.url } : null,
    type: user.role === ROLES.EMPLOYEE ? 'employee' : 'student',
    isActive: user.isActive,
    authProvider: user.authProvider,
    organization: org ? { id: String(org._id), name: org.name } : null,
    department: profile?.employment?.department ?? '',
    completionPercent: profile?.completionPercent ?? 0,
    status: profile?.status ?? 'draft',
    submittedAt: profile?.submittedAt ?? null,
    latestRecommendation: latest ? { id: String(latest._id), status: latest.status, version: latest.version } : null,
    joinedAt: user.createdAt,
  };
}

/** GET /admin/learners?type=&org=&status=&department=&search=&page=&limit= */
/** LearnerProfile filter for the admin learner list (also used by bulk delete's "select all"). */
export async function learnerProfileFilter({ type, org, status, department, search }) {
  const profileFilter = {};
  if (type) profileFilter.learnerType = type;
  if (status) profileFilter.status = status;
  if (org && mongoose.isValidObjectId(org)) profileFilter.organization = org;
  if (department) profileFilter['employment.department'] = department;

  const userFilter = { role: { $in: LEARNER_ROLES } };
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    userFilter.$or = [{ name: rx }, { email: rx }];
  }
  const users = await User.find(userFilter, '_id').lean();
  profileFilter.user = { $in: users.map((u) => u._id) };
  return profileFilter;
}

export async function list({ type, org, status, department, search, page = 1, limit = 20 }) {
  const profileFilter = await learnerProfileFilter({ type, org, status, department, search });

  const [profiles, total, statusRows] = await Promise.all([
    LearnerProfile.find(profileFilter)
      .select('user learnerType organization status completionPercent submittedAt employment.department')
      .sort({ submittedAt: -1, updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    LearnerProfile.countDocuments(profileFilter),
    LearnerProfile.aggregate([
      { $match: { ...profileFilter, status: { $exists: true } } },
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]),
  ]);

  const userIds = profiles.map((p) => p.user);
  const [pageUsers, orgs, latest] = await Promise.all([
    User.find({ _id: { $in: userIds } }).lean(),
    Organization.find({ _id: { $in: profiles.map((p) => p.organization).filter(Boolean) } }, 'name').lean(),
    Recommendation.aggregate([
      { $match: { learner: { $in: userIds } } },
      { $sort: { version: -1 } },
      { $group: { _id: '$learner', id: { $first: '$_id' }, status: { $first: '$status' }, version: { $first: '$version' } } },
    ]),
  ]);
  const userById = new Map(pageUsers.map((u) => [String(u._id), u]));
  const orgById = new Map(orgs.map((o) => [String(o._id), o]));
  const latestByUser = new Map(latest.map((r) => [String(r._id), { _id: r.id, status: r.status, version: r.version }]));

  return {
    items: profiles
      .filter((p) => userById.has(String(p.user)))
      .map((p) =>
        rowDTO(userById.get(String(p.user)), p, orgById.get(String(p.organization)), latestByUser.get(String(p.user))),
      ),
    counts: Object.fromEntries(statusRows.map((r) => [r._id, r.n])),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

/** GET /admin/learners/:userId — profile (CV link, no CV text), remarks, history, all recommendation versions. */
export async function detail(userId) {
  if (!mongoose.isValidObjectId(userId)) throw ApiError.notFound('LEARNER_NOT_FOUND', 'Learner not found');
  const user = await User.findOne({ _id: userId, role: { $in: LEARNER_ROLES } });
  if (!user) throw ApiError.notFound('LEARNER_NOT_FOUND', 'Learner not found');

  await getOrCreateProfile(user);
  const [profile, org, recommendations, enrollments] = await Promise.all([
    loadForView(user._id),
    user.organization ? Organization.findById(user.organization).lean() : null,
    listForLearner(user._id),
    Enrollment.find({ learner: user._id }).populate('programme', 'title code').sort({ createdAt: -1 }).lean(),
  ]);
  const latest = recommendations[0];

  return {
    learner: rowDTO(user, profile, org, latest ? { _id: latest.id, status: latest.status, version: latest.version } : null),
    organization: toOrgSummaryDTO(org),
    profile: toLearnerProfileDTO(profile),
    recommendations,
    history: enrollments.map((e) => ({
      id: String(e._id),
      programme: e.programme ? { id: String(e.programme._id), title: e.programme.title, code: e.programme.code } : null,
      status: e.status,
      progressPercent: e.progressPercent ?? 0,
      score: e.score ?? null,
      rating: e.learnerRating ?? null,
      startedAt: e.startedAt ?? null,
      completedAt: e.completedAt ?? null,
    })),
    canGenerate: ['submitted', 'under_review', 'pathway_published'].includes(profile.status) && user.isActive,
    isGenerating: recommendations.some((r) => r.status === 'generating'),
  };
}
