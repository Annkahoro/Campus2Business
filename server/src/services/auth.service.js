import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ROLES } from '../models/_shared.js';
import { ApiError } from '../utils/ApiError.js';
import { signJwt } from '../utils/tokens.js';
import { toPublicUser } from '../utils/dto.js';
import { deleteAsset, uploadBuffer } from './upload.service.js';
import { claimSeat, releaseSeat, validateToken } from './invite.service.js';
import { notifyUser } from './notification.service.js';
import { emitInvitesChanged } from '../sockets/events.js';
import { toOrgDTO, toOrgSummaryDTO } from './organization.service.js';
import { LearnerProfile } from '../models/LearnerProfile.js';
import { Organization } from '../models/Organization.js';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

/** Standard auth response: { token, user }. */
function authPayload(user) {
  return { token: signJwt(user), user: toPublicUser(user) };
}

async function assertEmailFree(email) {
  if (await User.exists({ email })) {
    throw ApiError.conflict('EMAIL_IN_USE', 'An account with this email already exists');
  }
}

async function touchLogin(user) {
  user.lastLoginAt = new Date();
  await user.save({ validateModifiedOnly: true });
}

async function createLocalUser({ name, email, password, preferredLanguage }, role) {
  await assertEmailFree(email);
  const user = await User.create({
    name,
    email,
    password,
    role,
    authProvider: 'local',
    preferredLanguage: preferredLanguage ?? 'en',
    lastLoginAt: new Date(),
  });
  return authPayload(user);
}

/** POST /auth/register → student. */
export const registerStudent = (input) => createLocalUser(input, ROLES.STUDENT);

/** POST /auth/register-org-admin → org_admin without an organization yet (org form follows, Phase 4). */
export const registerOrgAdmin = (input) => createLocalUser(input, ROLES.ORG_ADMIN);

/**
 * Creates an employee through an invite link (docs/04 §4):
 * claim a seat atomically → create the user → create the profile with the invite's department.
 * If anything fails after the seat was claimed, the seat is released again.
 */
async function createEmployeeFromInvite(inviteToken, userData) {
  const { invite, org } = await claimSeat(inviteToken);
  let user;
  try {
    user = await User.create({ ...userData, role: ROLES.EMPLOYEE, organization: org._id, lastLoginAt: new Date() });
    await LearnerProfile.create({
      user: user._id,
      learnerType: 'employee',
      organization: org._id,
      employment: invite.department ? { department: invite.department } : undefined,
    });
  } catch (err) {
    await releaseSeat(invite);
    if (user) await User.deleteOne({ _id: user._id }).catch(() => {});
    if (err?.code === 11000) throw ApiError.conflict('EMAIL_IN_USE', 'An account with this email already exists');
    throw err;
  }
  emitInvitesChanged(org._id);
  await notifyUser(org.owner, 'org.employeeJoined', { employeeId: String(user._id), name: user.name });
  return user;
}

/** POST /auth/register-employee { name, email, password, inviteToken } */
export async function registerEmployee({ name, email, password, inviteToken, preferredLanguage }) {
  await validateToken(inviteToken); // precise invite errors before anything else
  await assertEmailFree(email); // one user belongs to one org; existing students are out of scope (EMAIL_IN_USE)
  const user = await createEmployeeFromInvite(inviteToken, {
    name,
    email,
    password,
    authProvider: 'local',
    preferredLanguage: preferredLanguage ?? 'en',
  });
  return authPayload(user);
}

/** POST /auth/login */
export async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+password');
  // Same error for unknown email, wrong password and Google-only accounts: don't leak which emails exist.
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('INVALID_CREDENTIALS', 'Invalid email or password');
  }
  if (!user.isActive) throw ApiError.forbidden('ACCOUNT_DISABLED', 'This account has been disabled');

  await touchLogin(user);
  return authPayload(user);
}

async function verifyGoogleCredential(credential) {
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) throw new Error('Email not verified');
    return payload;
  } catch {
    throw ApiError.unauthorized('GOOGLE_TOKEN_INVALID', 'Google sign-in could not be verified');
  }
}

/**
 * POST /auth/google { credential, intent, inviteToken? }
 * Existing user (by googleId or email) → log in, linking googleId if missing.
 * New user → created according to `intent`, so Google can't be used to skip the org/invite flows.
 */
export async function googleLogin({ credential, intent, inviteToken, preferredLanguage }) {
  const { sub, email, name, picture } = await verifyGoogleCredential(credential);
  const normalizedEmail = email.toLowerCase();

  let user = await User.findOne({ $or: [{ googleId: sub }, { email: normalizedEmail }] });

  if (user) {
    if (!user.isActive) throw ApiError.forbidden('ACCOUNT_DISABLED', 'This account has been disabled');
    // Joining through an invite with an account that already exists is out of scope (docs/04 §4).
    if (intent === 'employee' && user.role !== ROLES.EMPLOYEE) {
      throw ApiError.conflict('EMAIL_IN_USE', 'An account with this email already exists');
    }
    if (!user.googleId) user.googleId = sub;
    if (!user.avatar?.url && picture) user.avatar = { url: picture };
    await touchLogin(user);
    return { ...authPayload(user), isNew: false };
  }

  if (intent === 'login') {
    // Unknown Google account on the login page: ask the client to choose how to sign up.
    throw ApiError.notFound('ACCOUNT_NOT_FOUND', 'No account exists for this Google user');
  }

  if (intent === 'employee') {
    await validateToken(inviteToken);
    user = await createEmployeeFromInvite(inviteToken, {
      name: name || normalizedEmail.split('@')[0],
      email: normalizedEmail,
      googleId: sub,
      authProvider: 'google',
      avatar: picture ? { url: picture } : undefined,
      preferredLanguage: preferredLanguage ?? 'en',
    });
    return { ...authPayload(user), isNew: true };
  }

  const role = intent === 'org_admin' ? ROLES.ORG_ADMIN : ROLES.STUDENT;
  user = await User.create({
    name: name || normalizedEmail.split('@')[0],
    email: normalizedEmail,
    googleId: sub,
    authProvider: 'google',
    role,
    avatar: picture ? { url: picture } : undefined,
    preferredLanguage: preferredLanguage ?? 'en',
    lastLoginAt: new Date(),
  });
  return { ...authPayload(user), isNew: true };
}

/**
 * GET /auth/me — current user + organization status.
 * Org admins get their full organization; employees get a summary (name, logo, status, departments).
 */
export async function getMe(user) {
  if (!user.organization) return { user: toPublicUser(user), organization: null };
  const org = await Organization.findById(user.organization);
  const organization = user.role === ROLES.ORG_ADMIN ? toOrgDTO(org) : toOrgSummaryDTO(org);
  return { user: toPublicUser(user), organization };
}

/** PATCH /auth/me */
export async function updateMe(user, { name, preferredLanguage }) {
  if (name !== undefined) user.name = name;
  if (preferredLanguage !== undefined) user.preferredLanguage = preferredLanguage;
  await user.save();
  return toPublicUser(user);
}

/** POST /auth/me/avatar — square 400px crop centred on the face. */
export async function uploadAvatar(user, file) {
  const uploaded = await uploadBuffer(file.buffer, {
    subfolder: 'avatars',
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  });
  const oldPublicId = user.avatar?.publicId; // Google avatars have no publicId and are left alone
  user.avatar = uploaded;
  await user.save();
  if (oldPublicId) await deleteAsset(oldPublicId);
  return toPublicUser(user);
}

/** PATCH /auth/me/password */
export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+password');
  if (!user) throw ApiError.notFound();

  // Google-only users have no password yet and may set one without a current password.
  if (user.password) {
    if (!currentPassword || !(await user.comparePassword(currentPassword))) {
      throw ApiError.badRequest('INVALID_CURRENT_PASSWORD', 'Current password is incorrect');
    }
  }
  user.password = newPassword;
  await user.save();
}
