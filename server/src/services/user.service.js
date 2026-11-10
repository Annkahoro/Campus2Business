import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { LearnerProfile } from '../models/LearnerProfile.js';
import { audit } from '../models/AuditLog.js';
import { ROLES } from '../models/_shared.js';
import { ApiError } from '../utils/ApiError.js';
import { toPublicUser } from '../utils/dto.js';
import { disconnectUser } from '../sockets/index.js';
import { emitProfileChanged } from '../sockets/events.js';
import { assertNotLastAdmin, deleteUser } from './account.service.js';

const LEARNER_ROLES = [ROLES.STUDENT, ROLES.EMPLOYEE];

async function assertEmailFree(email, exceptId) {
  if (await User.exists({ email, ...(exceptId ? { _id: { $ne: exceptId } } : {}) })) {
    throw ApiError.conflict('EMAIL_IN_USE', 'An account with this email already exists');
  }
}

async function findUser(id, roles, code) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound(code, 'User not found');
  const user = await User.findOne({ _id: id, role: { $in: roles } });
  if (!user) throw ApiError.notFound(code, 'User not found');
  return user;
}

/**
 * Shared update for name / email / language / isActive.
 * Changing the email of a Google account would break its link, so it is not allowed.
 */
async function applyUpdate(user, admin, { name, email, preferredLanguage, isActive }) {
  if (email !== undefined && email !== user.email) {
    if (user.authProvider === 'google') throw ApiError.badRequest('GOOGLE_EMAIL_LOCKED', 'Google accounts keep their Google email');
    await assertEmailFree(email, user._id);
    user.email = email;
  }
  if (name !== undefined) user.name = name;
  if (preferredLanguage !== undefined) user.preferredLanguage = preferredLanguage;
  const deactivated = isActive === false && user.isActive;
  if (isActive !== undefined) {
    if (deactivated) await assertNotLastAdmin(user);
    user.isActive = isActive;
  }
  await user.save();
  if (deactivated) disconnectUser(user._id);
  const fields = Object.entries({ name, email, preferredLanguage, isActive })
    .filter(([, v]) => v !== undefined)
    .map(([k]) => k);
  await audit(admin._id, 'user.update', 'User', user._id, { fields });
  return user;
}

/* ─────────────────────────── C2B admins ─────────────────────────── */

export async function listAdmins() {
  const admins = await User.find({ role: ROLES.C2B_ADMIN }).sort({ createdAt: 1 });
  return admins.map(toPublicUser);
}

export async function createAdmin({ name, email, password, preferredLanguage }) {
  await assertEmailFree(email);
  const user = await User.create({
    name,
    email,
    password,
    role: ROLES.C2B_ADMIN,
    authProvider: 'local',
    preferredLanguage: preferredLanguage ?? 'en',
  });
  return toPublicUser(user);
}

/** PATCH /admin/users/:id — own account is edited in Settings (and can't be deactivated here). */
export async function updateAdmin(admin, id, data) {
  const user = await findUser(id, [ROLES.C2B_ADMIN], 'USER_NOT_FOUND');
  if (String(user._id) === String(admin._id) && data.isActive === false) {
    throw ApiError.badRequest('CANNOT_DEACTIVATE_SELF', 'You cannot deactivate your own account');
  }
  return toPublicUser(await applyUpdate(user, admin, data));
}

/** DELETE /admin/users/:id */
export async function deleteAdmin(admin, id) {
  const user = await findUser(id, [ROLES.C2B_ADMIN], 'USER_NOT_FOUND');
  await deleteUser(user, admin);
}

/* ─────────────────────────── learners (students + employees) ─────────────────────────── */

/** POST /admin/learners — C2B creates a student account (employees only join through invite links). */
export async function createLearner(admin, { name, email, password, preferredLanguage }) {
  await assertEmailFree(email);
  const user = await User.create({
    name,
    email,
    password,
    role: ROLES.STUDENT,
    authProvider: 'local',
    preferredLanguage: preferredLanguage ?? 'en',
  });
  await LearnerProfile.create({ user: user._id, learnerType: 'student' });
  await audit(admin._id, 'user.create', 'User', user._id, { role: ROLES.STUDENT });
  return toPublicUser(user);
}

/** PATCH /admin/learners/:userId */
export async function updateLearner(admin, id, data) {
  const user = await applyUpdate(await findUser(id, LEARNER_ROLES, 'LEARNER_NOT_FOUND'), admin, data);
  const profile = await LearnerProfile.findOne({ user: user._id });
  if (profile) emitProfileChanged(profile);
  return toPublicUser(user);
}

/** DELETE /admin/learners/:userId */
export async function deleteLearner(admin, id) {
  await deleteUser(await findUser(id, LEARNER_ROLES, 'LEARNER_NOT_FOUND'), admin);
}
