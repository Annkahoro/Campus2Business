# 04 — Auth, Roles and Invites

## 1. Authentication
- **JWT** in the `Authorization: Bearer <token>` header. Payload: `{ sub: userId, role, org }`. Expiry from `JWT_EXPIRES_IN`.
- The frontend stores the token in `localStorage` (simple for MVP) and attaches it via an Axios interceptor.
  On `401`, it clears the token and redirects to `/login`.
- Passwords: bcrypt, minimum 8 characters, at least 1 letter and 1 number (Zod).

### Google Sign-In
1. The frontend renders `<GoogleLogin />` from `@react-oauth/google` and receives `credential` (an ID token).
2. `POST /api/auth/google` with `{ credential, intent, inviteToken?, orgRegistration? }`.
3. Backend:
```js
import { OAuth2Client } from 'google-auth-library';
const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
const ticket = await client.verifyIdToken({ idToken: credential, audience: env.GOOGLE_CLIENT_ID });
const { sub, email, name, picture, email_verified } = ticket.getPayload();
```
4. If a user with that `googleId` or `email` exists, log in (link `googleId` if missing).
5. Otherwise create a user according to `intent`:
   - `student` → role `student`
   - `employee` → requires a usable `inviteToken` → role `employee` + org
   - `org_admin` → creates the user, then the frontend continues to the organization form
6. Return `{ token, user }`.

`intent` stops someone from using Google login to become an org admin or employee without the right flow.

## 2. Roles and permissions matrix
| Action | c2b_admin | org_admin | student | employee |
|---|:-:|:-:|:-:|:-:|
| Manage programmes + custom fields | ✅ | ❌ | ❌ | ❌ |
| View published programmes | ✅ | ✅ | ✅ | ✅ |
| Approve / reject organizations | ✅ | ❌ | ❌ | ❌ |
| Edit own organization | ❌ | ✅ (own) | ❌ | ❌ |
| Manage invite links | ❌ | ✅ (own org, approved only) | ❌ | ❌ |
| Edit own learner profile | ❌ | ❌ | ✅ | ✅ |
| View employee profiles | ✅ all | ✅ own org | ❌ | own only |
| Add / edit / delete org remarks | ❌ | ✅ own org | ❌ | ❌ (read-only) |
| Submit profile to C2B | ✅ | ✅ (employees) | ✅ (self) | ❌ |
| Generate / review / publish recommendations | ✅ | ❌ | ❌ | ❌ |
| See published recommendation | ✅ | ✅ own org employees | ✅ own | ✅ own |
| See `internalNotes`, `aiDraft` | ✅ | ❌ | ❌ | ❌ |
| Request enrollment | ❌ | ✅ (on behalf of employee) | ✅ | ✅ |
| Approve enrollment / update progress | ✅ | ❌ | ❌ | ❌ |
| Org reports | ✅ any org | ✅ own org | ❌ | ❌ |

### Middleware
```js
// protect.js — verify JWT, load user (isActive), attach req.user
// authorize.js
export const authorize = (...roles) => (req, _res, next) =>
  roles.includes(req.user.role) ? next() : next(new ApiError(403, 'FORBIDDEN', 'Not allowed'));

// orgScope.js — for org_admin routes with :employeeId, ensure that employee belongs to req.user.organization
```

## 3. Organization registration and approval
```
Public "Register your organization" page
  → step 1: create org_admin account (email/password or Google with intent=org_admin)
  → step 2: organization form (details, departments, goals, objectives, skill gaps, logo)
  → POST /api/organizations   → status = pending
  → socket notify all c2b_admins: org.registered
C2B admin → Organizations → Pending → view details → Approve | Reject(reason)
  → approve: status=approved; auto-create a default InviteLink (no expiry, no seat limit, label "Default")
  → notify org_admin: org.approved | org.rejected
```
- While `pending`, the org admin can log in and edit the organization, but invite routes return `ORG_NOT_APPROVED`.
- While `rejected`, the org admin sees the reason and can edit and **resubmit** (status goes back to `pending`).
- While `suspended`, invites stop working and employees can still log in to view their data.

## 4. Invite links
- URL format: `${CLIENT_URL}/join/${token}`. The token is `nanoid(24)`, not guessable.
- Org admins can create several links (e.g. one per department), each with an optional `expiresAt`, `maxUses` and `department`.
- Actions: create, copy, disable or enable, regenerate (new token, old one dies), delete.

### Join flow
```
Employee opens /join/:token
  → GET /api/invites/:token/validate
       ✅ { orgName, orgLogo, department? }
       ❌ INVITE_NOT_FOUND | INVITE_EXPIRED | INVITE_LIMIT_REACHED | INVITE_DISABLED | ORG_NOT_APPROVED
  → page shows "You've been invited to join <Org> on C2B"
  → register (email/password) or Google (intent=employee, inviteToken)
  → POST /api/auth/register-employee { name, email, password, inviteToken }
       in a MongoDB transaction / atomic update:
         InviteLink.findOneAndUpdate({ token, isActive:true, ...notExpired, $expr: usesCount < maxUses }, { $inc: { usesCount: 1 } })
         create User(role=employee, organization)
         create LearnerProfile(learnerType=employee, organization, employment.department = invite.department)
  → notify org_admin: org.employeeJoined
  → redirect to profile wizard
```
- If the email already exists as an employee of **another** org, return `EMAIL_IN_USE`. One user belongs to one org.
- An existing **student** who joins an org: out of scope for the MVP (return `EMAIL_IN_USE`).

## 5. Org remarks
- `POST /api/org/employees/:employeeId/remarks` `{ text, category }`
- `PATCH /api/org/employees/:employeeId/remarks/:remarkId`
- `DELETE /api/org/employees/:employeeId/remarks/:remarkId`
- Only the `org_admin` of that employee's org (enforced by `orgScope`).
- Employees get remarks inside `GET /api/profile/me` as `orgRemarks`, with **no** edit endpoints exposed to them.
  The UI shows them in a read-only card: "Remarks from your organization".
- C2B admins see remarks on the profile view, and they are included in the AI context.
- Remarks can still be added after submission. Each change notifies the employee (`profile.remarkAdded`).

## 6. Seeded admin
`npm run seed` creates the first `c2b_admin` from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`. No public route creates
C2B admins. Every C2B admin can create, edit, deactivate and delete other admins from the admin panel
(`/api/admin/users`); the last active admin can never be removed.

## 7. Deleting accounts
Every user, whatever their role, can delete their own account in Settings (`DELETE /api/auth/me`, password required
for local accounts). C2B admins can delete any learner, organization, enrollment or recommendation; org admins can
delete their own employees. What each delete removes is listed in `docs/05` → "Account deletion (cascade)".
