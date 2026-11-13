/**
 * The main C2B admin ("super admin") is configured on the server with SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
 * (Render environment variables). On every server start (and `npm run seed`) the account is brought in line:
 * - first run: the existing C2B admin with that email is marked as the main admin, or the account is created
 * - SEED_ADMIN_EMAIL changed → the SAME account's email changes (no second admin is created)
 * - SEED_ADMIN_PASSWORD changed → the account's password changes
 * - it is always an active c2b_admin
 * The app never lets anyone delete or deactivate this account, or change its email/password, so the server
 * settings stay the single source of truth.
 */
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ROLES } from '../models/_shared.js';

export async function syncSuperAdmin({ log = console } = {}) {
  const email = env.SEED_ADMIN_EMAIL?.toLowerCase();
  const password = env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    log.warn('⚠️  SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set; main C2B admin not synced');
    return null;
  }

  let user = await User.findOne({ isSuperAdmin: true }).select('+password');
  if (!user) {
    user = await User.findOne({ email }).select('+password');
    if (user && user.role !== ROLES.C2B_ADMIN) {
      log.warn(`⚠️  ${email} belongs to a "${user.role}" account; not making it the main C2B admin`);
      return null;
    }
    if (!user) {
      const created = await User.create({
        name: 'C2B Admin',
        email,
        password,
        role: ROLES.C2B_ADMIN,
        authProvider: 'local',
        isSuperAdmin: true,
      });
      log.log(`✅ Created main C2B admin: ${email}`);
      return created;
    }
    user.isSuperAdmin = true;
  }

  const changes = [];
  if (user.isModified('isSuperAdmin')) changes.push('marked as main admin');
  if (user.email !== email) {
    if (await User.exists({ email, _id: { $ne: user._id } })) {
      log.warn(`⚠️  SEED_ADMIN_EMAIL ${email} is used by another account; main admin keeps ${user.email}`);
    } else {
      changes.push(`email ${user.email} → ${email}`);
      user.email = email;
    }
  }
  if (!(await user.comparePassword(password))) {
    user.password = password;
    changes.push('password updated');
  }
  if (!user.isActive) {
    user.isActive = true;
    changes.push('reactivated');
  }

  if (changes.length) {
    await user.save();
    log.log(`✅ Main C2B admin ${user.email}: ${changes.join(', ')}`);
  } else {
    log.log(`✔  Main C2B admin: ${user.email}`);
  }
  return user;
}
