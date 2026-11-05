import { User } from '../models/User.js';
import { ROLES } from '../models/_shared.js';
import { ApiError } from '../utils/ApiError.js';
import { toPublicUser } from '../utils/dto.js';

export async function listAdmins() {
  const admins = await User.find({ role: ROLES.C2B_ADMIN }).sort({ createdAt: 1 });
  return admins.map(toPublicUser);
}

export async function createAdmin({ name, email, password, preferredLanguage }) {
  if (await User.exists({ email })) {
    throw ApiError.conflict('EMAIL_IN_USE', 'An account with this email already exists');
  }
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
