import { User } from '../models/User.js';
import { ROLES } from '../models/_shared.js';
import { verifyJwt } from '../utils/tokens.js';

/**
 * Socket.IO (docs/10 §1). Rooms:
 *  - user:<id>          one user (all their tabs)
 *  - role:<role>        e.g. role:c2b_admin
 *  - org:<orgId>        everyone in an organization (org admin + employees)
 *  - org:<orgId>:admins only the organization's admin(s) — used for employee data, so colleagues never
 *                       receive each other's profile updates (stricter than docs/10, reported).
 *
 * The handshake JWT only proves identity; role, organization and isActive are read from the database,
 * because the token's `org` claim is stale for an org admin who created the organization after logging in.
 */
let ioRef = null;

export const rooms = {
  user: (id) => `user:${id}`,
  role: (role) => `role:${role}`,
  org: (orgId) => `org:${orgId}`,
  orgAdmins: (orgId) => `org:${orgId}:admins`,
};

export function initSockets(io) {
  ioRef = io;

  io.use(async (socket, next) => {
    try {
      const payload = verifyJwt(socket.handshake.auth?.token);
      const user = await User.findById(payload.sub, 'role organization isActive').lean();
      if (!user || !user.isActive) return next(new Error('UNAUTHORIZED'));
      socket.user = {
        id: String(user._id),
        role: user.role,
        org: user.organization ? String(user.organization) : null,
      };
      return next();
    } catch {
      return next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role, org } = socket.user;
    socket.join(rooms.user(id));
    socket.join(rooms.role(role));
    if (org) {
      socket.join(rooms.org(org));
      if (role === ROLES.ORG_ADMIN) socket.join(rooms.orgAdmins(org));
    }
  });
}

const target = (room) => (ioRef ? ioRef.to(room) : null);

export const emitToUser = (userId, event, data) => target(rooms.user(userId))?.emit(event, data);
export const emitToRole = (role, event, data) => target(rooms.role(role))?.emit(event, data);
export const emitToOrg = (orgId, event, data) => target(rooms.org(orgId))?.emit(event, data);
export const emitToOrgAdmins = (orgId, event, data) => target(rooms.orgAdmins(orgId))?.emit(event, data);

/** An org admin who just created their organization joins its rooms on every open tab. */
export function joinOrganizationRooms(userId, orgId, { asAdmin = false } = {}) {
  if (!ioRef) return;
  ioRef.in(rooms.user(userId)).socketsJoin(rooms.org(orgId));
  if (asAdmin) ioRef.in(rooms.user(userId)).socketsJoin(rooms.orgAdmins(orgId));
}

/** Deactivated accounts lose their live connection immediately. */
export function disconnectUser(userId) {
  ioRef?.in(rooms.user(userId)).disconnectSockets(true);
}
