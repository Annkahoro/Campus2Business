import { ROLES } from '../models/_shared.js';
import { emitToOrg, emitToOrgAdmins, emitToRole, emitToUser } from './index.js';

/**
 * Live-update events (docs/10 §3, not stored). The client invalidates the matching queries, so every
 * screen that shows the changed data refreshes without a page reload.
 * Never throws: a failed emit must not break the request.
 */
const safe =
  (fn) =>
  (...args) => {
    try {
      fn(...args);
    } catch (err) {
      console.warn('⚠️  socket emit failed:', err.message);
    }
  };

const idOf = (v) => (v ? String(v._id ?? v) : null);

/** Organization status / details changed → org admin, the org's members and C2B admins. */
export const emitOrgStatus = safe((org) => {
  const payload = { orgId: idOf(org), status: org.status };
  emitToUser(idOf(org.owner), 'org:status', payload);
  emitToOrg(idOf(org), 'org:status', payload);
  emitToRole(ROLES.C2B_ADMIN, 'org:status', payload);
});

/** Learner profile status or completion changed → the learner, their org admin(s) and C2B admins. */
export const emitProfileStatus = safe((profile) => {
  const payload = {
    userId: idOf(profile.user),
    status: profile.status,
    completionPercent: profile.completionPercent,
  };
  emitToUser(payload.userId, 'profile:status', payload);
  if (profile.organization) emitToOrgAdmins(idOf(profile.organization), 'profile:status', payload);
  emitToRole(ROLES.C2B_ADMIN, 'profile:status', payload);
});

/** Remarks are part of the employee profile but do not change its status: same event, same audiences. */
export const emitProfileChanged = emitProfileStatus;

/**
 * Recommendation status changed → C2B admins (queue, review page). Learners and their org admin only
 * hear about published pathways (they never see drafts).
 */
export const emitRecommendationStatus = safe((rec) => {
  const payload = { id: idOf(rec), learnerId: idOf(rec.learner), status: rec.status, version: rec.version };
  emitToRole(ROLES.C2B_ADMIN, 'recommendation:status', payload);
  if (rec.status === 'published') {
    emitToUser(payload.learnerId, 'recommendation:status', payload);
    if (rec.organization) emitToOrgAdmins(idOf(rec.organization), 'recommendation:status', payload);
  }
});

/** Invite links changed (e.g. a seat was used) → the org admin's invite page. */
export const emitInvitesChanged = safe((orgId) => {
  emitToOrgAdmins(idOf(orgId), 'invites:changed', { orgId: idOf(orgId) });
});

/** Enrollment changed → the learner, their org admin(s) and C2B admins (lists, My Learning, reports). */
export const emitEnrollmentStatus = safe((e) => {
  const payload = { id: idOf(e), learnerId: idOf(e.learner), status: e.status, progressPercent: e.progressPercent };
  emitToUser(payload.learnerId, 'enrollment:status', payload);
  if (e.organization) emitToOrgAdmins(idOf(e.organization), 'enrollment:status', payload);
  emitToRole(ROLES.C2B_ADMIN, 'enrollment:status', payload);
});

/** Programme catalogue changed → everyone connected refreshes catalogue views. */
export const emitProgrammesChanged = safe((programmeId) => {
  for (const role of Object.values(ROLES)) emitToRole(role, 'programmes:changed', { id: idOf(programmeId) });
});
