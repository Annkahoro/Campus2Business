export const ROLES = Object.freeze({
  C2B_ADMIN: 'c2b_admin',
  ORG_ADMIN: 'org_admin',
  STUDENT: 'student',
  EMPLOYEE: 'employee',
});

export const LEARNER_ROLES = [ROLES.STUDENT, ROLES.EMPLOYEE];

const AREA_BY_ROLE = {
  [ROLES.C2B_ADMIN]: '/admin',
  [ROLES.ORG_ADMIN]: '/org',
  [ROLES.STUDENT]: '/learner',
  [ROLES.EMPLOYEE]: '/learner',
};

/**
 * Where a user lands after login (docs/09 route map).
 * Org admins without an organization yet (e.g. right after sign-up) go to /org/setup.
 */
export const homeFor = (user) => {
  if (user?.role === ROLES.ORG_ADMIN && !user.organization) return '/org/setup';
  return AREA_BY_ROLE[user?.role] ?? '/';
};

/** True if `path` belongs to the area this user may access (used for "redirect back after login"). */
export const canAccessPath = (user, path) => {
  const area = AREA_BY_ROLE[user?.role];
  return !!area && (path === area || path.startsWith(`${area}/`));
};
