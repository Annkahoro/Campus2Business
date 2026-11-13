import { Organization } from '../models/Organization.js';
import { InviteLink } from '../models/InviteLink.js';
import { LearnerProfile } from '../models/LearnerProfile.js';
import { User } from '../models/User.js';
import { audit } from '../models/AuditLog.js';
import { ROLES } from '../models/_shared.js';
import { ApiError } from '../utils/ApiError.js';
import { randomToken } from '../utils/tokens.js';
import { ORG, assertTransition } from '../utils/transitions.js';
import { deleteAsset, uploadImage } from './upload.service.js';
import { notifyAdmins, notifyUser } from './notification.service.js';
import { joinOrganizationRooms } from '../sockets/index.js';
import { emitInvitesChanged, emitOrgStatus } from '../sockets/events.js';
import { removeOrganization } from './account.service.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const slugify = (name) =>
  `${name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)}-${randomToken(5).toLowerCase()}`;

/* ─────────────────────────── DTOs ─────────────────────────── */

/** Full organization (org admin of this org, C2B admins). */
export function toOrgDTO(o) {
  if (!o) return null;
  return {
    id: String(o._id),
    name: o.name,
    slug: o.slug,
    logo: o.logo?.url ? { url: o.logo.url } : null,
    industry: o.industry ?? '',
    size: o.size ?? null,
    country: o.country ?? '',
    city: o.city ?? '',
    website: o.website ?? '',
    contactPerson: { name: '', email: '', phone: '', position: '', ...(o.contactPerson ?? {}) },
    description: o.description ?? '',
    departments: (o.departments ?? []).map((d) => ({ name: d.name, headcount: d.headcount ?? null })),
    goals: o.goals ?? [],
    objectives: o.objectives ?? [],
    skillGaps: o.skillGaps ?? [],
    trainingBudget: o.trainingBudget ?? 'undisclosed',
    digitalMaturity: o.digitalMaturity ?? null,
    additionalInfo: o.additionalInfo ?? '',
    status: o.status,
    rejectionReason: o.status === 'rejected' ? (o.rejectionReason ?? '') : null,
    reviewedAt: o.reviewedAt ?? null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

/** Minimal org info for employees (/auth/me). */
export const toOrgSummaryDTO = (o) =>
  o
    ? {
        id: String(o._id),
        name: o.name,
        logo: o.logo?.url ? { url: o.logo.url } : null,
        status: o.status,
        departments: (o.departments ?? []).map((d) => ({ name: d.name })),
      }
    : null;

/* ─────────────────────────── org admin ─────────────────────────── */

export async function getOrgForUser(user) {
  if (!user.organization) return null;
  return Organization.findById(user.organization);
}

/** POST /organizations — one organization per org_admin, starts as `pending`. */
export async function createOrg(user, data) {
  if (user.organization || (await Organization.exists({ owner: user._id }))) {
    throw ApiError.conflict('ORG_ALREADY_EXISTS', 'You have already registered an organization');
  }
  const org = await Organization.create({ ...data, owner: user._id, slug: slugify(data.name), status: 'pending' });
  user.organization = org._id;
  await user.save();

  joinOrganizationRooms(user._id, org._id, { asAdmin: true });
  emitOrgStatus(org);
  await notifyAdmins('org.registered', { orgId: String(org._id), name: org.name });
  return toOrgDTO(org);
}

export async function getMine(user) {
  return toOrgDTO(await getOrgForUser(user));
}

/** PATCH /organizations/mine — a rejected org that is edited goes back to `pending` (resubmit). */
export async function updateMine(user, data) {
  const org = await getOrgForUser(user);
  if (!org) throw ApiError.notFound('ORG_NOT_FOUND', 'You have not registered an organization yet');

  org.set(data);
  const resubmitted = org.status === 'rejected';
  if (resubmitted) {
    assertTransition(ORG, 'rejected', 'pending');
    org.status = 'pending';
    org.rejectionReason = undefined;
  }
  await org.save();
  emitOrgStatus(org);
  if (resubmitted) await notifyAdmins('org.resubmitted', { orgId: String(org._id), name: org.name });
  return toOrgDTO(org);
}

export async function uploadLogo(user, file) {
  const org = await getOrgForUser(user);
  if (!org) throw ApiError.notFound('ORG_NOT_FOUND', 'You have not registered an organization yet');
  const uploaded = await uploadImage(file.buffer, 'logos', 600);
  const old = org.logo?.publicId;
  org.logo = uploaded;
  await org.save();
  emitOrgStatus(org);
  if (old && old !== uploaded.publicId) await deleteAsset(old);
  return toOrgDTO(org);
}

/* ─────────────────────────── C2B admin ─────────────────────────── */

async function employeeCounts(orgIds) {
  const rows = await User.aggregate([
    { $match: { role: ROLES.EMPLOYEE, organization: { $in: orgIds } } },
    { $group: { _id: '$organization', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.count]));
}

/** GET /admin/organizations?status=&search=&page= */
function listFilter({ status, search }) {
  const filter = {};
  if (status) filter.status = status;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: rx }, { industry: rx }, { country: rx }, { city: rx }];
  }
  return filter;
}

export async function adminList({ status, search, page, limit }) {
  const filter = listFilter({ status, search });
  const [orgs, total, statusCounts] = await Promise.all([
    Organization.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('owner', 'name email').lean(),
    Organization.countDocuments(filter),
    Organization.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  const counts = await employeeCounts(orgs.map((o) => o._id));
  return {
    items: orgs.map((o) => ({
      ...toOrgDTO(o),
      owner: o.owner ? { name: o.owner.name, email: o.owner.email } : null,
      employeeCount: counts.get(String(o._id)) ?? 0,
    })),
    counts: Object.fromEntries(statusCounts.map((s) => [s._id, s.count])),
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

/** GET /admin/organizations/:id — org + owner + stats + employees. */
export async function adminGet(id) {
  const org = await Organization.findById(id).populate('owner', 'name email').populate('reviewedBy', 'name').lean();
  if (!org) throw ApiError.notFound('ORG_NOT_FOUND', 'Organization not found');

  const employees = await User.find({ role: ROLES.EMPLOYEE, organization: org._id }).sort({ createdAt: -1 }).lean();
  const profiles = await LearnerProfile.find({ user: { $in: employees.map((e) => e._id) } })
    .select('user status completionPercent employment.department employment.jobTitle')
    .lean();
  const byUser = new Map(profiles.map((p) => [String(p.user), p]));

  const rows = employees.map((e) => {
    const p = byUser.get(String(e._id));
    return {
      id: String(e._id),
      name: e.name,
      email: e.email,
      isActive: e.isActive,
      department: p?.employment?.department ?? '',
      jobTitle: p?.employment?.jobTitle ?? '',
      completionPercent: p?.completionPercent ?? 0,
      status: p?.status ?? 'draft',
      joinedAt: e.createdAt,
    };
  });

  const stats = {
    employees: rows.length,
    complete: rows.filter((r) => r.completionPercent >= 80).length,
    submitted: rows.filter((r) => ['submitted', 'under_review', 'pathway_published'].includes(r.status)).length,
    pathwaysPublished: rows.filter((r) => r.status === 'pathway_published').length,
  };

  return {
    organization: {
      ...toOrgDTO(org),
      owner: org.owner ? { id: String(org.owner._id), name: org.owner.name, email: org.owner.email } : null,
      reviewedBy: org.reviewedBy?.name ?? null,
    },
    stats,
    employees: rows,
  };
}

async function decide(id, admin, to, { reason } = {}) {
  const org = await Organization.findById(id);
  if (!org) throw ApiError.notFound('ORG_NOT_FOUND', 'Organization not found');
  assertTransition(ORG, org.status, to);

  org.status = to;
  org.reviewedBy = admin._id;
  org.reviewedAt = new Date();
  org.rejectionReason = to === 'rejected' ? reason : undefined;
  await org.save();

  // First approval: create the default invite link (no expiry, no seat limit).
  if (to === 'approved' && !(await InviteLink.exists({ organization: org._id }))) {
    await InviteLink.create({ organization: org._id, token: randomToken(24), label: 'Default', createdBy: admin._id });
  }

  emitOrgStatus(org);
  if (to === 'approved') emitInvitesChanged(org._id);
  await audit(admin._id, `org.${to}`, 'Organization', org._id, reason ? { reason } : undefined);
  await notifyUser(org.owner, `org.${to}`, { orgId: String(org._id), name: org.name, reason });
  return adminGet(org._id);
}

export const approve = (id, admin) => decide(id, admin, 'approved');
export const reject = (id, admin, reason) => decide(id, admin, 'rejected', { reason });
export const suspend = (id, admin) => decide(id, admin, 'suspended');

/* ─────────────────────────── C2B admin CRUD ─────────────────────────── */

/**
 * POST /admin/organizations { owner: { name, email, password }, ...org }
 * C2B registers an organization on someone's behalf: creates the org admin account and the organization,
 * already approved (with its default invite link).
 */
export async function adminCreate(admin, { owner, ...data }) {
  if (await User.exists({ email: owner.email })) {
    throw ApiError.conflict('EMAIL_IN_USE', 'An account with this email already exists');
  }
  const user = await User.create({
    name: owner.name,
    email: owner.email,
    password: owner.password,
    role: ROLES.ORG_ADMIN,
    authProvider: 'local',
    preferredLanguage: owner.preferredLanguage ?? 'en',
  });
  let org;
  try {
    org = await Organization.create({
      ...data,
      owner: user._id,
      slug: slugify(data.name),
      status: 'approved',
      reviewedBy: admin._id,
      reviewedAt: new Date(),
    });
    user.organization = org._id;
    await user.save();
    await InviteLink.create({ organization: org._id, token: randomToken(24), label: 'Default', createdBy: admin._id });
  } catch (err) {
    if (org) await Organization.deleteOne({ _id: org._id }).catch(() => {});
    await User.deleteOne({ _id: user._id }).catch(() => {});
    throw err;
  }
  emitOrgStatus(org);
  await audit(admin._id, 'org.create', 'Organization', org._id);
  return adminGet(org._id);
}

/** PATCH /admin/organizations/:id — edit details (status changes go through approve/reject/suspend). */
export async function adminUpdate(admin, id, data) {
  const org = await Organization.findById(id);
  if (!org) throw ApiError.notFound('ORG_NOT_FOUND', 'Organization not found');
  org.set(data);
  await org.save();
  emitOrgStatus(org);
  await audit(admin._id, 'org.update', 'Organization', org._id, { fields: Object.keys(data) });
  return adminGet(org._id);
}

/** DELETE /admin/organizations/:id — the org admin account stays (without an organization). */
export async function adminDelete(admin, id) {
  const org = await Organization.findById(id);
  if (!org) throw ApiError.notFound('ORG_NOT_FOUND', 'Organization not found');
  return removeOrganization(org, admin);
}

/* ─────────────────────────── bulk actions ─────────────────────────── */

const BULK_MAX = 500;
const BULK_ACTIONS = {
  approve: (id, admin) => approve(id, admin),
  suspend: (id, admin) => suspend(id, admin),
  delete: (id, admin) => adminDelete(admin, id),
};

/**
 * POST /admin/organizations/bulk { action, ids } or { action, filter: { status, search } } ("select all").
 * Each organization goes through the same code as the single action (notifications, audit, employees kept as
 * individual learners on delete). One failure doesn't stop the rest: → { done: [ids], failed: [{ id, name, code }] }.
 */
export async function bulkAction(admin, { action, ids, filter }) {
  const targets = ids
    ? await Organization.find({ _id: { $in: ids } }, 'name').lean()
    : await Organization.find(listFilter(filter), 'name').sort({ createdAt: -1 }).limit(BULK_MAX + 1).lean();
  if (targets.length > BULK_MAX) throw ApiError.badRequest('BULK_TOO_MANY', `At most ${BULK_MAX} organizations at once`);

  const done = [];
  const failed = [];
  let convertedEmployees = 0;
  for (const org of targets) {
    try {
      const res = await BULK_ACTIONS[action](org._id, admin);
      if (action === 'delete') convertedEmployees += res?.convertedEmployees ?? 0;
      done.push(String(org._id));
    } catch (err) {
      failed.push({ id: String(org._id), name: org.name, code: err instanceof ApiError ? err.code : 'INTERNAL_ERROR' });
    }
  }
  return { action, done, failed, convertedEmployees };
}
