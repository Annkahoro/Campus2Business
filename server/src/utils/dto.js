/**
 * DTO mappers — strip private fields before sending documents to clients.
 * Never send password hashes, googleId, CV text or internalNotes to roles that should not see them.
 */

const idOf = (value) => (value ? String(value._id ?? value) : null);

export function toPublicUser(user) {
  if (!user) return null;
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    authProvider: user.authProvider,
    isSuperAdmin: !!user.isSuperAdmin,
    organization: idOf(user.organization),
    avatar: user.avatar?.url ? { url: user.avatar.url } : null,
    preferredLanguage: user.preferredLanguage,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt ?? null,
    createdAt: user.createdAt,
  };
}
