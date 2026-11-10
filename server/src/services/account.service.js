import { User } from '../models/User.js';
import { LearnerProfile } from '../models/LearnerProfile.js';
import { Organization } from '../models/Organization.js';
import { InviteLink } from '../models/InviteLink.js';
import { Recommendation } from '../models/Recommendation.js';
import { Enrollment } from '../models/Enrollment.js';
import { Notification } from '../models/Notification.js';
import { audit } from '../models/AuditLog.js';
import { ROLES } from '../models/_shared.js';
import { ApiError } from '../utils/ApiError.js';
import { deleteAsset } from './upload.service.js';
import { notifyAdmins, notifyUser } from './notification.service.js';
import { disconnectUser } from '../sockets/index.js';
import { emitOrgStatus } from '../sockets/events.js';

/**
 * Account and organization deletion (hard delete, with cascade).
 *
 * - Deleting a learner removes their profile (and CV file), recommendations, enrollments and notifications.
 * - Deleting an organization removes its invite links and logo. Its employees are NOT deleted: they did not
 *   choose this, so they become individual learners (role `student`) and keep their profile and history.
 *   The organization's private remarks on them are removed.
 * - Deleting an org admin also deletes the organization they own.
 * - The last active C2B admin can never be deleted (someone must be able to run the platform).
 */

const LEARNER_ROLES = [ROLES.STUDENT, ROLES.EMPLOYEE];

/** Throws LAST_ADMIN if `user` is the only active C2B admin. */
export async function assertNotLastAdmin(user) {
  if (user.role !== ROLES.C2B_ADMIN || !user.isActive) return;
  const others = await User.countDocuments({ role: ROLES.C2B_ADMIN, isActive: true, _id: { $ne: user._id } });
  if (others === 0) throw ApiError.conflict('LAST_ADMIN', 'At least one active C2B admin must remain');
}

/** A pathway being generated for this learner would write to deleted documents → ask to retry shortly. */
async function assertNotGenerating(userId) {
  if (await Recommendation.exists({ learner: userId, status: 'generating' })) {
    throw ApiError.conflict('AI_BUSY', 'A pathway is being generated for this learner; try again in a minute');
  }
}

async function deleteLearnerData(user) {
  const profile = await LearnerProfile.findOne({ user: user._id }, 'cv.publicId').lean();
  await Promise.all([
    LearnerProfile.deleteOne({ user: user._id }),
    Recommendation.deleteMany({ learner: user._id }),
    Enrollment.deleteMany({ learner: user._id }),
  ]);
  if (profile?.cv?.publicId) await deleteAsset(profile.cv.publicId, 'raw');
}

/**
 * Deletes an organization. Employees become individual learners; other org admins lose the link.
 * Used by C2B admins (DELETE /admin/organizations/:id) and when the owner deletes their account.
 */
export async function removeOrganization(org, actor) {
  const members = await User.find({ organization: org._id }, '_id role');
  const employeeIds = members.filter((m) => m.role === ROLES.EMPLOYEE).map((m) => m._id);

  await Promise.all([
    InviteLink.deleteMany({ organization: org._id }),
    User.updateMany({ _id: { $in: employeeIds } }, { $set: { role: ROLES.STUDENT }, $unset: { organization: 1 } }),
    User.updateMany({ organization: org._id, role: ROLES.ORG_ADMIN }, { $unset: { organization: 1 } }),
    LearnerProfile.updateMany(
      { organization: org._id },
      { $set: { learnerType: 'student', orgRemarks: [] }, $unset: { organization: 1 } },
    ),
    Recommendation.updateMany({ organization: org._id }, { $unset: { organization: 1 } }),
    Enrollment.updateMany({ organization: org._id }, { $unset: { organization: 1 } }),
  ]);
  await Organization.deleteOne({ _id: org._id });
  if (org.logo?.publicId) await deleteAsset(org.logo.publicId);

  // Tell everyone who was in the org, then drop their sockets so they reconnect without the org rooms.
  emitOrgStatus({ _id: org._id, owner: org.owner, status: 'deleted' });
  for (const id of employeeIds) await notifyUser(id, 'org.deleted', { name: org.name });
  for (const m of members) disconnectUser(m._id);

  await audit(actor?._id, 'org.delete', 'Organization', org._id, { name: org.name, employees: employeeIds.length });
  return { convertedEmployees: employeeIds.length };
}

/**
 * Hard-deletes a user and everything that belongs only to them.
 * `actor` is who did it (the user themselves, a C2B admin, or an org admin removing an employee).
 */
export async function deleteUser(user, actor) {
  await assertNotLastAdmin(user);
  if (LEARNER_ROLES.includes(user.role)) await assertNotGenerating(user._id);

  if (user.role === ROLES.ORG_ADMIN) {
    const owned = await Organization.findOne({ owner: user._id });
    if (owned) await removeOrganization(owned, actor);
  }
  if (LEARNER_ROLES.includes(user.role)) await deleteLearnerData(user);

  await Notification.deleteMany({ recipient: user._id });
  await User.deleteOne({ _id: user._id });
  disconnectUser(user._id);
  if (user.avatar?.publicId) await deleteAsset(user.avatar.publicId);

  const self = actor && String(actor._id) === String(user._id);
  await audit(actor?._id, self ? 'user.selfDelete' : 'user.delete', 'User', user._id, {
    role: user.role,
    email: user.email,
  });
  if (self && user.role !== ROLES.C2B_ADMIN) {
    await notifyAdmins('user.accountDeleted', { name: user.name, role: user.role });
  }
}

/** DELETE /auth/me — local accounts must confirm with their password. */
export async function deleteOwnAccount(userId, { password }) {
  const user = await User.findById(userId).select('+password');
  if (!user) throw ApiError.notFound();
  if (user.password && !(await user.comparePassword(password ?? ''))) {
    throw ApiError.badRequest('INVALID_CURRENT_PASSWORD', 'Password is incorrect');
  }
  await deleteUser(user, user);
}
