# 05 — API Endpoints

Base URL: `/api`. All responses use `{ success, data?, message?, code? }`.
Legend: 🌐 public · 🔐 any logged-in user · 🅰️ c2b_admin · 🏢 org_admin · 🎓 student · 👷 employee

## Health
| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/health` | 🌐 | `{ status: 'ok', time }`; used to wake Render |

## Auth `/auth`
| Method | Path | Access | Body / notes |
|---|---|---|---|
| POST | `/auth/register` | 🌐 | `{ name, email, password }` → student |
| POST | `/auth/register-org-admin` | 🌐 | `{ name, email, password }` → org_admin (no org yet) |
| POST | `/auth/register-employee` | 🌐 | `{ name, email, password, inviteToken }` |
| POST | `/auth/login` | 🌐 | `{ email, password }` |
| POST | `/auth/google` | 🌐 | `{ credential, intent, inviteToken? }` |
| GET | `/auth/me` | 🔐 | current user + org status |
| PATCH | `/auth/me` | 🔐 | `{ name, preferredLanguage }` |
| PATCH | `/auth/me/password` | 🔐 | `{ currentPassword, newPassword }` |
| POST | `/auth/me/avatar` | 🔐 | multipart `file` (image ≤ 2 MB) |
| DELETE | `/auth/me` | 🔐 | **every user can delete their own account.** `{ password }` for local accounts (Google-only: no body). Cascade: see "Account deletion" below. `LAST_ADMIN` if the last active C2B admin |

## Learner profile `/profile` (🎓 👷)
| Method | Path | Notes |
|---|---|---|
| GET | `/profile/me` | profile + `orgRemarks` (read-only) + completion |
| PATCH | `/profile/me/:step` | `step` ∈ `personal, education, employment, skills, goals`; partial save |
| POST | `/profile/me/cv` | multipart `file` (PDF ≤ 5 MB) → Cloudinary (`resource_type: 'raw'`) + extract text |
| DELETE | `/profile/me/cv` | |
| POST | `/profile/me/submit` | 🎓 only. Needs `completionPercent ≥ 80` → status `submitted` |
| GET | `/profile/me/recommendation` | latest **published** recommendation (final view only) |
| POST | `/profile/me/recommendation/feedback` | `{ rating, comment }` |

## Organizations
| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/organizations` | 🏢 | create own org (one per org_admin) → `pending` |
| GET | `/organizations/mine` | 🏢 | |
| PATCH | `/organizations/mine` | 🏢 | if `rejected`, resets to `pending` (resubmit) |
| POST | `/organizations/mine/logo` | 🏢 | multipart image |
| GET | `/admin/organizations` | 🅰️ | `?status=&search=&page=` |
| POST | `/admin/organizations` | 🅰️ | `{ ...org, owner: { name, email, password } }` → creates the org admin account + the org, already `approved` (+ default invite link) |
| GET | `/admin/organizations/:id` | 🅰️ | org + stats + employees |
| PATCH | `/admin/organizations/:id` | 🅰️ | edit details (same body as `PATCH /organizations/mine`); status only via approve/reject/suspend |
| DELETE | `/admin/organizations/:id` | 🅰️ | hard delete; employees become students, owner keeps an account without org |
| PATCH | `/admin/organizations/:id/approve` | 🅰️ | |
| PATCH | `/admin/organizations/:id/reject` | 🅰️ | `{ reason }` |
| PATCH | `/admin/organizations/:id/suspend` | 🅰️ | |

## Invites
| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/invites/:token/validate` | 🌐 | org name, logo, department |
| GET | `/org/invites` | 🏢 | |
| POST | `/org/invites` | 🏢 | `{ label, department?, expiresAt?, maxUses? }` |
| PATCH | `/org/invites/:id` | 🏢 | update fields / `isActive` |
| POST | `/org/invites/:id/regenerate` | 🏢 | new token |
| DELETE | `/org/invites/:id` | 🏢 | |

## Org employees `/org/employees` (🏢 + `orgScope`)
| Method | Path | Notes |
|---|---|---|
| GET | `/org/employees` | `?department=&status=&search=` with completion % |
| GET | `/org/employees/:employeeId` | full profile (no CV text) + remarks + published pathway + enrollments |
| POST | `/org/employees/:employeeId/remarks` | `{ text, category }` |
| PATCH | `/org/employees/:employeeId/remarks/:remarkId` | |
| DELETE | `/org/employees/:employeeId/remarks/:remarkId` | |
| POST | `/org/employees/:employeeId/submit` | profile must be ≥ 80% → `submitted` |
| POST | `/org/employees/submit-bulk` | `{ employeeIds: [] }` → returns per-id result |
| PATCH | `/org/employees/:employeeId/deactivate` | removes access |
| PATCH | `/org/employees/:employeeId` | `{ name?, isActive? }` — edit, deactivate or reactivate (email is not editable) |
| DELETE | `/org/employees/:employeeId` | permanently deletes the employee account + learning data |

## Admin users `/admin/users` (🅰️)
| Method | Path | Notes |
|---|---|---|
| GET | `/admin/users` | all C2B admins |
| POST | `/admin/users` | `{ name, email, password }` |
| PATCH | `/admin/users/:id` | `{ name?, email?, preferredLanguage?, isActive? }`; cannot deactivate yourself (`CANNOT_DEACTIVATE_SELF`) |
| DELETE | `/admin/users/:id` | `LAST_ADMIN` if it would leave no active C2B admin |

## Account deletion (cascade)
All deletes are hard deletes, done in `services/account.service.js`, and written to the audit log.
- **Learner** (student/employee): user, profile + CV file, recommendations, enrollments, notifications, avatar.
- **Organization**: org, invite links, logo. Its employees are **not** deleted: they become `student`s and keep their
  profile and history; the org's private `orgRemarks` are removed. Employees are notified (`org.deleted`).
- **Org admin**: their organization is deleted as above, then the account.
- **C2B admin**: the last active C2B admin can never be deleted or deactivated (`LAST_ADMIN`).

## Programmes
| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/programmes` | 🔐 | published only; `?catalogue=elearning|general&category=&featured=&subsidised=&exclude=&level=&mode=&lang=&search=&page=` |
| GET | `/programmes/:id` | 🔐 | custom fields with `showToLearners` only |
| GET | `/programmes/meta/categories` | 🔐 | active categories in order, with published counts per catalogue `{ elearning, general, total }` |
| GET | `/admin/programmes` | 🅰️ | all statuses |
| POST | `/admin/programmes` | 🅰️ | validates `customFields` against definitions |
| PATCH | `/admin/programmes/:id` | 🅰️ | |
| PATCH | `/admin/programmes/:id/status` | 🅰️ | `{ status }` |
| POST | `/admin/programmes/:id/cover` | 🅰️ | multipart image |
| DELETE | `/admin/programmes/:id` | 🅰️ | soft delete → `archived` if it has enrollments |
| GET | `/admin/programmes/import/preview` | 🅰️ | `?fresh=true` re-reads campus2b.com (otherwise 10-min cache) → `{ totalOnSite, alreadyImported, truncated, items: [{ url, title, catalogue, categories, unmatchedCategories, subsidised, price, featured, intakes, match }], ignored: [] }` |
| POST | `/admin/programmes/import` | 🅰️ | `{ items: [{ url, action: 'create' | 'merge' | 'ignore', programmeId? }] }` (max 60, campus2b.com course URLs only) → `{ created, merged, ignored, failed }`; `create` = new `draft`, `merge` = add its dates + link to `programmeId` |
| DELETE | `/admin/programmes/import/ignored/:id` | 🅰️ | show an ignored site course in the import list again |

## Programme categories `/admin/categories` (🅰️)
| Method | Path | Notes |
|---|---|---|
| GET | `/admin/categories` | all categories (active first) with counts |
| POST | `/admin/categories` | `{ slug, name: { en, es } }` — `slug` is immutable |
| PATCH | `/admin/categories/:id` | `{ name?, isActive? }` |
| PATCH | `/admin/categories/reorder` | `{ ids: [] }` |
| DELETE | `/admin/categories/:id` | deleted if unused, otherwise `isActive:false` |

## Programme custom fields `/admin/programme-fields` (🅰️)
| Method | Path | Notes |
|---|---|---|
| GET | `/admin/programme-fields` | also exposed read-only as `GET /programme-fields` (🔐) for rendering |
| POST | `/admin/programme-fields` | `{ key, label, type, options?, required, helpText, showToLearners, useInAI, order }` |
| PATCH | `/admin/programme-fields/:id` | `key` and `type` are immutable after creation |
| PATCH | `/admin/programme-fields/reorder` | `{ ids: [] }` |
| DELETE | `/admin/programme-fields/:id` | sets `isActive:false` (values stay on programmes) |

## Learners (admin view) `/admin/learners` (🅰️)
| Method | Path | Notes |
|---|---|---|
| GET | `/admin/learners` | `?type=student|employee&org=&status=&search=&page=` |
| GET | `/admin/learners/:userId` | full profile incl. CV link, remarks, history, all recommendation versions |
| POST | `/admin/learners` | `{ name, email, password }` → student account (employees still join only by invite) |
| PATCH | `/admin/learners/:userId` | `{ name?, email?, preferredLanguage?, isActive? }` (email locked for Google accounts → `GOOGLE_EMAIL_LOCKED`) |
| DELETE | `/admin/learners/:userId` | hard delete with cascade; `AI_BUSY` while a pathway is generating |

## Recommendations
| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/admin/recommendations` | 🅰️ | review queue `?status=pending_review` |
| POST | `/admin/recommendations/generate/:userId` | 🅰️ | returns `202 { recommendationId }` and runs async; socket event on finish |
| POST | `/admin/recommendations/generate-bulk` | 🅰️ | `{ userIds }`, processed sequentially (concurrency 2) |
| GET | `/admin/recommendations/:id` | 🅰️ | aiDraft + final + internalNotes + context snapshot |
| PATCH | `/admin/recommendations/:id` | 🅰️ | edit `final` and `internalNotes` |
| POST | `/admin/recommendations/:id/approve` | 🅰️ | → `approved` |
| POST | `/admin/recommendations/:id/publish` | 🅰️ | → `published`; profile → `pathway_published`; notify learner (+ org_admin) |
| POST | `/admin/recommendations/:id/reject` | 🅰️ | `{ reason }` |
| POST | `/admin/recommendations/:id/translate` | 🅰️ | fills missing `en`/`es` text in `final` via Claude |
| DELETE | `/admin/recommendations/:id` | 🅰️ | any status except `generating`; learner profile status is re-derived from the remaining versions |
| GET | `/org/employees/:employeeId/recommendation` | 🏢 | published final only |

## Enrollments
| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/enrollments` | 🎓 👷 🏢 | `{ programmeId, intakeStartDate?, recommendationId?, learnerId? (org_admin only) }` |
| GET | `/enrollments/mine` | 🎓 👷 | |
| POST | `/enrollments/:id/pay` | 🎓 👷 🏢 | **simulated**: `{ method }` → `payment.status=paid`, reference `SIM-xxxxxx` |
| POST | `/enrollments/:id/rate` | 🎓 👷 | `{ rating, review }`, completed only |
| GET | `/admin/enrollments` | 🅰️ | filters |
| PATCH | `/admin/enrollments/:id/status` | 🅰️ | `{ status }` (see 07) |
| PATCH | `/admin/enrollments/:id/progress` | 🅰️ | `{ progressPercent, score? }` |
| DELETE | `/admin/enrollments/:id` | 🅰️ | hard delete (also removes it from the learner history) |
| GET | `/org/enrollments` | 🏢 | own org |

## Notifications `/notifications` (🔐)
| Method | Path | Notes |
|---|---|---|
| GET | `/notifications` | `?unread=true&page=` |
| PATCH | `/notifications/:id/read` | |
| PATCH | `/notifications/read-all` | |

## Reports
| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/admin/reports/overview` | 🅰️ | totals, pending counts, enrollments by month, top programmes, AI usage tokens |
| GET | `/org/reports/overview` | 🏢 | employees by department, profile completion, submission/pathway status, enrollments + completion rate |
| GET | `/org/reports/skill-gaps` | 🏢 | aggregated `aiDraft.skillGaps` of own employees by department |
| POST | `/org/reports/ai-summary` | 🏢 | ⭐ stretch: Claude summary of org training needs (cached 24 h) |

## Error codes (translate on frontend)
`VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, EMAIL_IN_USE, INVALID_CREDENTIALS, GOOGLE_TOKEN_INVALID,
ORG_NOT_APPROVED, ORG_ALREADY_EXISTS, INVITE_NOT_FOUND, INVITE_EXPIRED, INVITE_LIMIT_REACHED, INVITE_DISABLED,
PROFILE_INCOMPLETE, PROFILE_ALREADY_SUBMITTED, AI_FAILED, AI_RATE_LIMITED, AI_BUSY, ENROLLMENT_EXISTS,
INVALID_STATUS_TRANSITION, FILE_TOO_LARGE, INVALID_FILE_TYPE, LAST_ADMIN, CANNOT_DEACTIVATE_SELF, GOOGLE_EMAIL_LOCKED,
USER_NOT_FOUND, SERVER_ERROR`
