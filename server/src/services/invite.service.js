import { env } from '../config/env.js';
import { InviteLink } from '../models/InviteLink.js';
import { Organization } from '../models/Organization.js';
import { ApiError } from '../utils/ApiError.js';
import { randomToken } from '../utils/tokens.js';
import { emitInvitesChanged } from '../sockets/events.js';

export const inviteUrl = (token) => `${env.CLIENT_URL.replace(/\/$/, '')}/join/${token}`;

export function toInviteDTO(i) {
  const expired = !!i.expiresAt && new Date(i.expiresAt) <= new Date();
  const full = i.maxUses !== null && i.maxUses !== undefined && i.usesCount >= i.maxUses;
  return {
    id: String(i._id),
    token: i.token,
    url: inviteUrl(i.token),
    label: i.label ?? '',
    department: i.department ?? '',
    expiresAt: i.expiresAt ?? null,
    maxUses: i.maxUses ?? null,
    usesCount: i.usesCount ?? 0,
    isActive: i.isActive,
    state: !i.isActive ? 'disabled' : expired ? 'expired' : full ? 'full' : 'active',
    createdAt: i.createdAt,
  };
}

/** Throws the precise reason an invite cannot be used (docs/04 §4). */
function assertUsable(invite, org) {
  if (!invite || !org) throw ApiError.notFound('INVITE_NOT_FOUND', 'This invite link is not valid');
  if (org.status !== 'approved') throw ApiError.forbidden('ORG_NOT_APPROVED', 'This organization is not active');
  if (!invite.isActive) throw new ApiError(410, 'INVITE_DISABLED', 'This invite link has been disabled');
  if (invite.expiresAt && invite.expiresAt <= new Date()) throw new ApiError(410, 'INVITE_EXPIRED', 'This invite link has expired');
  if (invite.maxUses !== null && invite.maxUses !== undefined && invite.usesCount >= invite.maxUses) {
    throw new ApiError(410, 'INVITE_LIMIT_REACHED', 'This invite link has no seats left');
  }
}

async function loadInvite(token) {
  const invite = await InviteLink.findOne({ token });
  const org = invite ? await Organization.findById(invite.organization) : null;
  return { invite, org };
}

/** GET /invites/:token/validate (public) */
export async function validateToken(token) {
  const { invite, org } = await loadInvite(token);
  assertUsable(invite, org);
  return {
    orgName: org.name,
    orgLogo: org.logo?.url ? { url: org.logo.url } : null,
    department: invite.department || null,
  };
}

/**
 * Atomically takes one seat: the update only matches if the link is active, not expired and has seats left,
 * so two people joining at the same time can never exceed maxUses.
 * Returns { invite, org }; call releaseSeat(invite) if the registration fails afterwards.
 */
export async function claimSeat(token) {
  const { invite, org } = await loadInvite(token);
  assertUsable(invite, org); // precise error for the common cases

  const now = new Date();
  const claimed = await InviteLink.findOneAndUpdate(
    {
      _id: invite._id,
      isActive: true,
      $and: [
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
        { $expr: { $or: [{ $eq: [{ $ifNull: ['$maxUses', null] }, null] }, { $lt: ['$usesCount', '$maxUses'] }] } },
      ],
    },
    { $inc: { usesCount: 1 } },
    { new: true },
  );
  if (!claimed) throw new ApiError(410, 'INVITE_LIMIT_REACHED', 'This invite link has no seats left'); // lost the race
  return { invite: claimed, org };
}

export const releaseSeat = (invite) => InviteLink.updateOne({ _id: invite._id, usesCount: { $gt: 0 } }, { $inc: { usesCount: -1 } });

/* ─────────── org admin CRUD (org must be approved; enforced by route middleware) ─────────── */

export async function list(orgId) {
  const invites = await InviteLink.find({ organization: orgId }).sort({ createdAt: 1 }).lean();
  return invites.map(toInviteDTO);
}

function assertDepartment(org, department) {
  if (department && !org.departments.some((d) => d.name === department)) {
    throw ApiError.badRequest('VALIDATION_ERROR', 'Unknown department', [{ path: 'department', message: 'INVALID_DEPARTMENT' }]);
  }
}

export async function create(org, user, data) {
  assertDepartment(org, data.department);
  const invite = await InviteLink.create({ ...data, organization: org._id, token: randomToken(24), createdBy: user._id });
  emitInvitesChanged(org._id);
  return toInviteDTO(invite);
}

async function findOwn(org, id) {
  const invite = await InviteLink.findOne({ _id: id, organization: org._id });
  if (!invite) throw ApiError.notFound('INVITE_NOT_FOUND', 'Invite link not found');
  return invite;
}

export async function update(org, id, data) {
  const invite = await findOwn(org, id);
  if (data.department !== undefined) assertDepartment(org, data.department);
  invite.set(data);
  await invite.save();
  emitInvitesChanged(org._id);
  return toInviteDTO(invite);
}

/** New token; the old link stops working immediately. */
export async function regenerate(org, id) {
  const invite = await findOwn(org, id);
  invite.token = randomToken(24);
  await invite.save();
  emitInvitesChanged(org._id);
  return toInviteDTO(invite);
}

export async function remove(org, id) {
  const invite = await findOwn(org, id);
  await invite.deleteOne();
  emitInvitesChanged(org._id);
  return { id: String(id) };
}
