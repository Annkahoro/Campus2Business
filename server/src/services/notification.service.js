import mongoose from 'mongoose';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { ROLES } from '../models/_shared.js';
import { ApiError } from '../utils/ApiError.js';
import { emitToUser } from '../sockets/index.js';

/**
 * Notifications (docs/10 §2): stored + pushed as `notification:new`.
 * Each type maps to i18n keys in the client `notifications` namespace and a frontend link.
 */
const TYPES = {
  'org.registered': { key: 'orgRegistered', link: (p) => `/admin/organizations/${p.orgId}` },
  'org.resubmitted': { key: 'orgResubmitted', link: (p) => `/admin/organizations/${p.orgId}` },
  'org.approved': { key: 'orgApproved', link: () => '/org' },
  'org.rejected': { key: 'orgRejected', link: () => '/org' },
  'org.suspended': { key: 'orgSuspended', link: () => '/org' },
  // Former employees become individual learners; the owner keeps an account without an organization.
  'org.deleted': {
    key: (p) => (p.forOwner ? 'orgDeletedOwner' : 'orgDeleted'),
    link: (p) => (p.forOwner ? '/org' : '/learner'),
  },
  'user.accountDeleted': { key: 'accountDeleted', link: () => '/admin/learners' },
  'org.employeeJoined': { key: 'employeeJoined', link: (p) => `/org/employees/${p.employeeId}` },
  'org.employeeProfileComplete': { key: 'employeeProfileComplete', link: (p) => `/org/employees/${p.employeeId}` },
  'profile.submitted': { key: 'profileSubmitted', link: (p) => `/admin/learners/${p.userId}` },
  'profile.remarkAdded': { key: 'remarkAdded', link: () => '/learner/profile' },
  'recommendation.ready': { key: 'recommendationReady', link: (p) => `/admin/recommendations/${p.recommendationId}` },
  'recommendation.failed': { key: 'recommendationFailed', link: (p) => `/admin/recommendations/${p.recommendationId}` },
  // The org admin's copy carries employeeId and links to the employee page.
  'pathway.published': {
    key: (p) => (p.employeeId ? 'employeePathwayPublished' : 'pathwayPublished'),
    link: (p) => (p.employeeId ? `/org/employees/${p.employeeId}` : '/learner/pathway'),
  },
  'enrollment.requested': { key: 'enrollmentRequested', link: () => '/admin/enrollments' },
  // The org admin's copy carries forOrg and the employee name.
  'enrollment.statusChanged': {
    key: (p) => (p.forOrg ? 'employeeEnrollmentStatusChanged' : p.onBehalf ? 'enrollmentRequestedOnBehalf' : 'enrollmentStatusChanged'),
    link: (p) => (p.forOrg ? '/org/enrollments' : '/learner/learning'),
  },
  'enrollment.progressUpdated': { key: 'enrollmentProgressUpdated', link: () => '/learner/learning' },
};

/** Only plain, small values go into params (they are interpolated into translated text). */
function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([, v]) => v === null || ['string', 'number', 'boolean'].includes(typeof v))
      .map(([k, v]) => [k, typeof v === 'string' ? v.slice(0, 300) : v]),
  );
}

export function toNotificationDTO(n) {
  return {
    id: String(n._id),
    type: n.type,
    titleKey: n.titleKey,
    bodyKey: n.bodyKey,
    params: n.params ?? {},
    link: n.link ?? null,
    isRead: n.isRead,
    createdAt: n.createdAt,
  };
}

/**
 * notify({ recipients, type, params, link? }) — saves one Notification per recipient and pushes it live.
 * Never throws: a notification problem must not fail the request that triggered it.
 */
export async function notify({ recipients, type, params = {}, link }) {
  try {
    const def = TYPES[type];
    if (!def) console.warn(`⚠️  unknown notification type: ${type}`);
    const p = cleanParams(params);
    const key = typeof def?.key === 'function' ? def.key(p) : (def?.key ?? type);
    const ids = [...new Set(recipients.filter(Boolean).map(String))];
    if (ids.length === 0) return [];

    const docs = await Notification.insertMany(
      ids.map((recipient) => ({
        recipient,
        type,
        titleKey: `notifications.${key}.title`,
        bodyKey: `notifications.${key}.body`,
        params: p,
        link: link ?? def?.link?.(p) ?? null,
      })),
    );
    docs.forEach((n) => emitToUser(String(n.recipient), 'notification:new', toNotificationDTO(n)));
    return docs;
  } catch (err) {
    console.error(`⚠️  notify(${type}) failed:`, err.message);
    return [];
  }
}

/** One recipient. Signature kept from Phase 3 so existing call sites stay unchanged. */
export const notifyUser = (recipientId, type, params = {}) => notify({ recipients: [recipientId], type, params });

/** All active C2B admins (docs/10 §2 notifyRole). */
export async function notifyRole(role, type, params = {}) {
  const users = await User.find({ role, isActive: true }, '_id').lean();
  return notify({ recipients: users.map((u) => u._id), type, params });
}

export const notifyAdmins = (type, params = {}) => notifyRole(ROLES.C2B_ADMIN, type, params);

/* ─────────── REST: /notifications ─────────── */

/** GET /notifications?unread=true&page=&limit= */
export async function listMine(user, { unread, page = 1, limit = 10 }) {
  const filter = { recipient: user._id };
  if (unread) filter.isRead = false;
  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: user._id, isRead: false }),
  ]);
  return {
    items: items.map(toNotificationDTO),
    unreadCount,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

/** PATCH /notifications/:id/read — only the recipient can mark it. */
export async function markRead(user, id) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound('NOTIFICATION_NOT_FOUND', 'Notification not found');
  const n = await Notification.findOneAndUpdate({ _id: id, recipient: user._id }, { isRead: true }, { new: true }).lean();
  if (!n) throw ApiError.notFound('NOTIFICATION_NOT_FOUND', 'Notification not found');
  const unreadCount = await Notification.countDocuments({ recipient: user._id, isRead: false });
  return { notification: toNotificationDTO(n), unreadCount };
}

/** PATCH /notifications/read-all */
export async function markAllRead(user) {
  const res = await Notification.updateMany({ recipient: user._id, isRead: false }, { isRead: true });
  return { updated: res.modifiedCount, unreadCount: 0 };
}
