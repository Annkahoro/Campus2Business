# 09 — Dashboards and Pages

## Route map
| Path | Page | Layout | Access |
|---|---|---|---|
| `/` | Landing | Public | 🌐 |
| `/login` | Login | Public | 🌐 |
| `/register` | Student register | Public | 🌐 |
| `/register-organization` | Org admin register (2 steps) | Public | 🌐 |
| `/join/:token` | Employee invite join | Public | 🌐 |
| `/programmes` and `/programmes/:id` | Catalogue browse (public preview of published programmes) | Public | 🌐 |
| `/admin/*` | Admin area | AdminLayout | c2b_admin |
| `/org/*` | Organization area | OrgLayout | org_admin |
| `/learner/*` | Student + employee area | LearnerLayout | student, employee |
| `*` | 404 | Public | 🌐 |

After login, redirect by role: `c2b_admin → /admin`, `org_admin → /org` (or `/org/setup` if there is no org yet),
`student|employee → /learner` (or `/learner/profile` if completion < 80%).

---

## Public
### Landing `/`
1. **Navbar:** logo, Programmes, For Students, For Organizations, EN/ES switcher, Login, "Get started" (primary).
2. **Hero** (`bg-cream`): headline "Find your next best learning pathway", subtext about AI + C2B experts, two CTAs
   (I'm a student / Register my organization), hero photo on a solid mint block.
3. **How it works** (3 steps with icons): Build your profile → AI + C2B experts design your pathway → Learn and grow.
4. **For students / For organizations**: two side-by-side cards with photos.
5. **Featured programmes**: 3–6 cards from `/programmes`.
6. **Stats band** (`bg-emerald`, white text): programmes, learners, partner organizations (from the API or static for demo).
7. **CTA band** and **footer** (`bg-emerald-darker`).

### Login / Register
- Split layout: form card left, photo right (hidden on mobile).
- Google button + email/password. "Are you an organization? Register here" link.

### Register organization `/register-organization`
- Step 1: account (name, email, password or Google).
- Step 2: organization form: name, logo, industry, size, country/city, website, contact person, description,
  **departments** (dynamic list with headcount), **goals**, **objectives**, **skill gaps** (tag inputs),
  training budget, digital maturity (1–5 slider), additional info.
- Submit → "Pending approval" screen.

### Join `/join/:token`
- Validates the token on load. Valid: org logo + "Join <Org> on C2B" + register form/Google.
  Invalid: friendly error state per code.

---

## C2B Admin `/admin`
Sidebar: Dashboard · Organizations · Learners · Recommendations · Programmes · Programme Fields · Enrollments · Reports · Settings

| Page | Content |
|---|---|
| **Dashboard** `/admin` | Stat cards (pending orgs, pending reviews, active learners, active enrollments), "Needs attention" lists (pending orgs, profiles submitted, drafts to review), enrollments chart, top programmes |
| **Organizations** `/admin/organizations` | Tabs Pending / Approved / Rejected / Suspended, table, search |
| **Organization detail** `/admin/organizations/:id` | Full info, departments, goals, approve/reject (reason modal)/suspend, employees table with status |
| **Learners** `/admin/learners` | Filter by type, org, department, status. Table with completion % and status badges. Bulk "Generate pathways" |
| **Learner detail** `/admin/learners/:id` | Tabs: Profile · CV (embedded PDF link) · Org remarks · History (enrollments) · Pathways (versions). "Generate pathway" button |
| **Recommendations queue** `/admin/recommendations` | Tabs Generating / Pending review / Published / Failed. Generating rows update live via socket |
| **Review editor** `/admin/recommendations/:id` | See 06 §9: learner snapshot, editable pathway (drag/drop, add/remove, EN/ES tabs), AI original panel, notes, Approve & Publish |
| **Programmes** `/admin/programmes` | Grid/table, filters, status toggle, "New programme". **Import from campus2b.com** button: lists site courses not on the platform yet → import as draft / add dates to an existing programme / ignore |
| **Programme form** `/admin/programmes/new` and `/:id/edit` | Sections: Basics (EN/ES tabs for title and descriptions), Classification (category, level, audience, departments, tags), Logistics (duration, mode, languages, price, intakes list), Prerequisites (multi-select of programmes), Skills gained, **Additional fields** (rendered from ProgrammeField definitions with `DynamicField`), cover image upload. Unsaved input is auto-saved in the browser and restored (with a “Discard these changes” option) when the admin comes back, e.g. after visiting Programme fields or Categories |
| **Programme fields** `/admin/programme-fields` | Sortable list of custom fields with a create/edit modal (key, EN/ES label, type, options builder, required, help text, show to learners, use in AI). Live preview of how the field renders |
| **Enrollments** `/admin/enrollments` | Table with status filters; approve/reject; progress slider + score; mark completed |
| **Reports** `/admin/reports` | Totals, enrollments by month, completion rate, programmes by popularity, AI token usage |
| **Settings** `/admin/settings` | Admin users (create another admin), own account |

---

## Organization Admin `/org`
Sidebar: Dashboard · Organization · Invite links · Employees · Enrollments · Reports · Settings

| Page | Content |
|---|---|
| **Setup** `/org/setup` | Shown if the org admin has no org yet (Google sign-up path) |
| **Dashboard** `/org` | If `pending`: an "Awaiting C2B approval" state with an illustration and an editable summary. If `rejected`: reason + "Edit and resubmit". If `approved`: stats (employees joined, profiles complete, submitted, pathways published, active enrollments), quick copy of the default invite link, recent activity |
| **Organization** `/org/organization` | Edit org details (same form as registration) |
| **Invite links** `/org/invites` | Cards per link: URL with copy button, label, department, expiry, uses `x / max`, active toggle, regenerate, delete. "New link" modal |
| **Employees** `/org/employees` | Table: name, department, completion %, profile status, pathway status. Checkbox selection → **"Submit selected to C2B"**. Filters |
| **Employee detail** `/org/employees/:id` | Profile summary (read-only), **Remarks panel** (add, edit, delete own org's remarks with a category), "Submit to C2B" button (disabled < 80%), published pathway, enrollments + "Enroll on behalf" |
| **Enrollments** `/org/enrollments` | Employees' enrollments, progress, simulated employer payment |
| **Reports** `/org/reports` | Employees by department (bar), completion funnel (joined → complete → submitted → published → enrolled → completed), skill gaps by department (from AI drafts), ⭐ AI summary button |
| **Settings** `/org/settings` | Account, language |

---

## Learner (student + employee) `/learner`
Sidebar: Dashboard · My Profile · My Pathway · Programmes · My Learning · Settings

| Page | Content |
|---|---|
| **Dashboard** `/learner` | Greeting, profile completion ring, **status tracker** (Profile → Submitted → Under review → Pathway ready), next step card, active courses. Employees: org name + logo |
| **My Profile** `/learner/profile` | **6-step wizard** with autosave: 1 Personal · 2 Education & study history · 3 Employment (required for employees) · 4 Skills (name + category + 1–5 level) · 5 Interests & goals (hobbies, interests, short/long-term goals, target roles, learning preferences) · 6 CV upload. Final review screen. Students: "Submit to C2B". Employees: info text "Your organization will submit your profile". Locked banner when submitted/under review. **Employees also see the read-only "Remarks from your organization" card** at the top of the profile summary |
| **My Pathway** `/learner/pathway` | Empty state until published. Then: summary, strengths, skill gaps chips, **PathwayTimeline** (phase, programme, match score, reason, expected outcome, "Request enrollment"), alternatives, admin note, rate this pathway. Previous versions collapsed |
| **Programmes** `/learner/programmes` | Catalogue with filters, programme detail with custom fields (`showToLearners` only), "Request enrollment" |
| **My Learning** `/learner/learning` | Enrollments by status, simulated payment flow, progress bars, rate completed programmes |
| **Settings** `/learner/settings` | Account, avatar, language, password |

---

## Shared UX rules
- Every list has loading skeletons, empty state and error state.
- Every destructive action uses `ConfirmDialog`.
- Toasts for success/error (translated by `code`).
- The language switcher updates `i18n.language`, `document.documentElement.lang` and `PATCH /auth/me { preferredLanguage }`.
- Bilingual content (programmes, pathways) shows the current language, falling back to the other language if empty.
