# 10 — Realtime Notifications (Socket.IO)

No email or SMS in the MVP. All communication inside the system uses **Socket.IO** plus stored `Notification` documents
(so users see what they missed while offline).

## 1. Server setup
```js
// server.js
import http from 'http';
import { Server } from 'socket.io';
import { app } from './app.js';
import { initSockets } from './sockets/index.js';

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: env.CORS_ORIGINS.split(','), credentials: true } });
initSockets(io);
server.listen(env.PORT);
```

```js
// sockets/index.js
let ioRef;
export function initSockets(io) {
  ioRef = io;
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const payload = jwt.verify(token, env.JWT_SECRET);
      socket.user = { id: payload.sub, role: payload.role, org: payload.org };
      next();
    } catch { next(new Error('UNAUTHORIZED')); }
  });
  io.on('connection', (socket) => {
    socket.join(`user:${socket.user.id}`);
    socket.join(`role:${socket.user.role}`);
    if (socket.user.org) socket.join(`org:${socket.user.org}`);
  });
}
export const emitToUser = (userId, event, data) => ioRef?.to(`user:${userId}`).emit(event, data);
export const emitToRole = (role, event, data) => ioRef?.to(`role:${role}`).emit(event, data);
export const emitToOrg  = (orgId, event, data) => ioRef?.to(`org:${orgId}`).emit(event, data);
```

## 2. `notification.service.js`
```js
export async function notify({ recipients, type, titleKey, bodyKey, params, link }) {
  const docs = await Notification.insertMany(recipients.map((r) => ({ recipient: r, type, titleKey, bodyKey, params, link })));
  docs.forEach((n) => emitToUser(n.recipient.toString(), 'notification:new', n));
}
```
`notifyRole('c2b_admin', …)` looks up all admin IDs, then calls `notify`.

## 3. Events
### Notification events (stored + pushed as `notification:new`)
| type | Recipients | When |
|---|---|---|
| `org.registered` | all c2b_admins | new org submitted |
| `org.resubmitted` | all c2b_admins | rejected org edited |
| `org.approved` / `org.rejected` / `org.suspended` | org_admin | admin decision |
| `org.employeeJoined` | org_admin | employee registered through invite |
| `org.employeeProfileComplete` | org_admin | employee reaches ≥ 80% |
| `profile.submitted` | all c2b_admins | student submits / org submits employee |
| `profile.remarkAdded` | employee | org admin adds or edits a remark |
| `recommendation.ready` | all c2b_admins | AI draft finished |
| `recommendation.failed` | all c2b_admins | AI failed |
| `pathway.published` | learner (+ org_admin for employees) | admin publishes |
| `enrollment.requested` | all c2b_admins | new request |
| `enrollment.statusChanged` | learner (+ org_admin) | approved/rejected/active/completed |
| `enrollment.progressUpdated` | learner | admin updates progress |

### Live-update events (not stored, used to refresh UI)
| event | Room | Payload | Frontend action |
|---|---|---|---|
| `recommendation:status` | `role:c2b_admin` | `{ id, learnerId, status }` | invalidate `['recommendations']` query |
| `profile:status` | `user:<id>` and `org:<id>` | `{ userId, status }` | invalidate profile / employees queries |
| `org:status` | `user:<orgAdminId>` | `{ status }` | refetch `/auth/me` |

## 4. Client
```js
// lib/socket.js
import { io } from 'socket.io-client';
export const createSocket = (token) =>
  io(import.meta.env.VITE_SOCKET_URL, { auth: { token }, transports: ['websocket'], autoConnect: true });
```
- `SocketContext` connects after login and disconnects on logout.
- On `notification:new`: prepend to the `['notifications']` query cache, increment the bell badge, and show a toast with
  `t(n.titleKey, n.params)`.
- `NotificationBell` dropdown: latest 10, mark read, "Mark all as read", link to `n.link`.
- Reconnect handling: on reconnect, refetch unread notifications.
