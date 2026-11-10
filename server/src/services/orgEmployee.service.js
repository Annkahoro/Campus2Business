import { LearnerProfile } from '../models/LearnerProfile.js';
import { User } from '../models/User.js';
import { audit } from '../models/AuditLog.js';
import { ROLES } from '../models/_shared.js';
import { ApiError } from '../utils/ApiError.js';
import { notifyUser } from './notification.service.js';
import { getOrCreateProfile, loadForView, submitProfile, toLearnerProfileDTO } from './profile.service.js';
import { getPublishedForEmployee } from './recommendation.service.js';
import { listForLearner as enrollmentsOf } from './enrollment.service.js';
import { emitProfileChanged } from '../sockets/events.js';
import { disconnectUser } from '../sockets/index.js';
import { deleteUser } from './account.service.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function rowDTO(user, profile) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    avatar: user.avatar?.url ? { url: user.avatar.url } : null,
    isActive: user.isActive,
    department: profile?.employment?.department ?? '',
    jobTitle: profile?.employment?.jobTitle ?? '',
    completionPercent: profile?.completionPercent ?? 0,
    status: profile?.status ?? 'draft',
    submittedAt: profile?.submittedAt ?? null,
    remarksCount: profile?.orgRemarks?.length ?? 0,
    joinedAt: user.createdAt,
  };
}

/** GET /org/employees?department=&status=&search= */
export async function list(org, { department, status, search }) {
  const userFilter = { role: ROLES.EMPLOYEE, organization: org._id };
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    userFilter.$or = [{ name: rx }, { email: rx }];
  }
  const users = await User.find(userFilter).sort({ createdAt: -1 }).lean();
  const profiles = await LearnerProfile.find({ user: { $in: users.map((u) => u._id) } })
    .select('user status completionPercent submittedAt employment orgRemarks._id')
    .lean();
  const byUser = new Map(profiles.map((p) => [String(p.user), p]));

  return users
    .map((u) => rowDTO(u, byUser.get(String(u._id))))
    .filter((r) => (!department || r.department === department) && (!status || r.status === status));
}

/** GET /org/employees/:employeeId — full profile (no CV text) + remarks + published pathway + enrollments. */
export async function detail(employee) {
  await getOrCreateProfile(employee);
  const [profile, pathway, enrollments] = await Promise.all([
    loadForView(employee._id),
    getPublishedForEmployee(employee._id),
    enrollmentsOf(employee._id),
  ]);
  return {
    employee: rowDTO(employee, profile),
    profile: toLearnerProfileDTO(profile),
    pathway,
    enrollments,
  };
}

/* ─────────── remarks (org admin of this employee's org only — enforced by orgScope) ─────────── */

async function profileOf(employee) {
  return getOrCreateProfile(employee);
}

export async function addRemark(employee, author, { text, category }) {
  const profile = await profileOf(employee);
  profile.orgRemarks.push({ text, category, author: author._id, createdAt: new Date() });
  await profile.save();
  emitProfileChanged(profile);
  const remark = profile.orgRemarks[profile.orgRemarks.length - 1];
  await audit(author._id, 'remark.add', 'LearnerProfile', profile._id, { remarkId: remark._id });
  await notifyUser(employee._id, 'profile.remarkAdded', { remarkId: String(remark._id) });
  return detail(employee);
}

function findRemark(profile, remarkId) {
  const remark = profile.orgRemarks.id(remarkId);
  if (!remark) throw ApiError.notFound('REMARK_NOT_FOUND', 'Remark not found');
  return remark;
}

export async function updateRemark(employee, author, remarkId, data) {
  const profile = await profileOf(employee);
  const remark = findRemark(profile, remarkId);
  remark.set({ ...data, updatedAt: new Date() });
  await profile.save();
  emitProfileChanged(profile);
  await audit(author._id, 'remark.update', 'LearnerProfile', profile._id, { remarkId });
  await notifyUser(employee._id, 'profile.remarkAdded', { remarkId: String(remarkId), edited: true });
  return detail(employee);
}

export async function deleteRemark(employee, author, remarkId) {
  const profile = await profileOf(employee);
  findRemark(profile, remarkId).deleteOne();
  await profile.save();
  emitProfileChanged(profile);
  await audit(author._id, 'remark.delete', 'LearnerProfile', profile._id, { remarkId });
  return detail(employee);
}

/* ─────────── submit to C2B ─────────── */

function assertOrgApproved(org) {
  if (org.status !== 'approved') throw ApiError.forbidden('ORG_NOT_APPROVED', 'Your organization is not approved');
}

/** POST /org/employees/:employeeId/submit */
export async function submit(org, employee, orgAdmin) {
  assertOrgApproved(org);
  if (!employee.isActive) throw ApiError.conflict('EMPLOYEE_INACTIVE', 'This employee has been deactivated');
  const profile = await profileOf(employee);
  await submitProfile(profile, { submittedBy: orgAdmin._id, learnerName: employee.name });
  return detail(employee);
}

/** POST /org/employees/submit-bulk { employeeIds } → per-id result. */
export async function submitBulk(org, orgAdmin, employeeIds) {
  assertOrgApproved(org);
  const employees = await User.find({ _id: { $in: employeeIds }, role: ROLES.EMPLOYEE, organization: org._id });
  const byId = new Map(employees.map((e) => [String(e._id), e]));

  const results = [];
  for (const id of [...new Set(employeeIds)]) {
    const employee = byId.get(id);
    if (!employee) {
      results.push({ id, ok: false, code: 'EMPLOYEE_NOT_FOUND' });
      continue;
    }
    try {
      if (!employee.isActive) throw ApiError.conflict('EMPLOYEE_INACTIVE', 'Deactivated');
      await submitProfile(await profileOf(employee), { submittedBy: orgAdmin._id, learnerName: employee.name });
      results.push({ id, name: employee.name, ok: true });
    } catch (err) {
      results.push({ id, name: employee.name, ok: false, code: err.code ?? 'INTERNAL_ERROR' });
    }
  }
  return { results, submitted: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length };
}

/** PATCH /org/employees/:employeeId/deactivate — removes the employee's access. */
export async function deactivate(employee, orgAdmin) {
  employee.isActive = false;
  await employee.save();
  disconnectUser(employee._id);
  const profile = await profileOf(employee);
  emitProfileChanged(profile);
  await audit(orgAdmin._id, 'employee.deactivate', 'User', employee._id);
  return detail(employee);
}

/** PATCH /org/employees/:employeeId { name?, isActive? } — reactivating restores access. */
export async function update(employee, orgAdmin, { name, isActive }) {
  if (name !== undefined) employee.name = name;
  const deactivated = isActive === false && employee.isActive;
  if (isActive !== undefined) employee.isActive = isActive;
  await employee.save();
  if (deactivated) disconnectUser(employee._id);
  emitProfileChanged(await profileOf(employee));
  await audit(orgAdmin._id, 'employee.update', 'User', employee._id, { name, isActive });
  return detail(employee);
}

/** DELETE /org/employees/:employeeId — permanently deletes the employee's account and learning data. */
export async function remove(employee, orgAdmin) {
  await deleteUser(employee, orgAdmin);
}
