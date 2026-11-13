# 12 — Build Phases

Work through the phases in order. Each phase ends with a **manual test** and a ticked checklist.
Ask Claude Code: *"Read CLAUDE.md and docs/12-BUILD-PHASES.md, then implement Phase N."*

---

## Phase 0 — Scaffolding
- [x] Create `server/` and `client/` per 01, install packages per 02
- [x] `config/env.js` with Zod validation, `config/db.js`, `/api/health`
- [x] `ApiError`, `asyncHandler`, `errorHandler`, `validate` middleware, response helper
- [x] Client: Vite + Tailwind v4 tokens (08), Router, QueryClient, Axios instance, i18n skeleton (11)
- [x] UI kit: Button, Card, Input, Select, Textarea, Badge, Modal, Spinner, EmptyState, Toast
- **Test:** `/api/health` returns ok; the client shows a cream page with an emerald button; the EN/ES toggle works.

## Phase 1 — Auth and roles
- [x] User model, register (student), login, `/auth/me`, JWT `protect` + `authorize`
- [x] Google login with `intent`
- [x] Seed script: c2b admin
- [x] Client: AuthContext, Login/Register pages, ProtectedRoute, RoleRoute, 4 empty layouts with sidebar
- **Test:** student registers and lands in `/learner`; seeded admin lands in `/admin`; wrong role gets 403.

## Phase 2 — Programmes and custom fields
- [x] ProgrammeField model + CRUD + reorder
- [x] Programme model + CRUD + cover upload (Cloudinary) + customFields validation
- [x] Seed 12–15 programmes (EN/ES) across: Digital Transformation, Data & AI, Cloud, Cybersecurity, Agile & Project
      Management, Leadership & Change, Finance & Digital Finance, HR & People Analytics, Marketing & E-commerce,
      Soft Skills; with prerequisites forming 3–4 chains
- [x] Admin pages: Programmes list/form, Programme Fields manager with DynamicField
- [x] Public/learner catalogue
- **Test:** admin adds a custom field "Certification body" and it appears on the programme form and detail page.

## Phase 3 — Learner profile
- [x] LearnerProfile model, step PATCH endpoints, completion calculation
- [x] CV upload (PDF → Cloudinary raw) + pdf-parse text extraction
- [x] Avatar upload
- [x] Client: 6-step wizard with autosave, review screen, submit (students), lock banner
- **Test:** student completes the profile to ≥ 80% and submits; status becomes `submitted`; admin is notified (log only until Phase 6).

## Phase 4 — Organizations, approval and invites
- [x] Organization model, org admin registration (2 steps), mine/edit/logo
- [x] Admin approve/reject/suspend + default invite on approve
- [x] InviteLink CRUD, validate, regenerate; employee registration (email + Google) with atomic seat count
- [x] Org employees list/detail, **remarks CRUD**, submit single + bulk
- [x] Employee wizard with required employment step and department pre-fill; **read-only remarks card**
- **Test:** org registers → pending → admin approves → link copied → 2 employees join → limit/expiry errors work →
  org admin adds remarks → employee sees them read-only (no edit button, the API rejects edits) → org submits.

## Phase 5 — AI recommendation engine
- [x] `config/anthropic.js`, `services/ai/*` per 06 (context builder, prompts, tool schema, Zod, ai.service)
- [x] Historical signals aggregation
- [x] Recommendation model, generate (async, 202), bulk generate, post-processing, translate endpoint
- [x] Admin queue + **review editor** (drag/drop, add/remove, EN/ES tabs, notes, AI original panel)
- [x] Approve & publish → learner "My Pathway" page with PathwayTimeline; org admin view
- **Test:** generate for a student and an ICT employee and a Finance employee; reasons mention their goals and remarks;
  only catalogue programmes appear; editing and publishing works; the Spanish view shows Spanish reasons.

## Phase 6 — Realtime notifications
- [x] Socket server with JWT handshake and rooms; notification service; Notification model + endpoints
- [x] Wire every event in 10
- [x] Client SocketContext, NotificationBell, toasts, live query invalidation
- **Test:** two browsers (admin + learner): publishing shows a toast instantly on the learner side.

## Phase 7 — Enrollments, simulated payment, history
- [x] Enrollment model + transitions
- [x] Request (learner or org on behalf), admin approve, **PaymentSimulator**, progress, complete, rating
- [x] "My Learning" page, org enrollments page, admin enrollments page
- [x] Seed: some completed enrollments for demo learners (to feed historical signals)
- **Test:** complete a programme → regenerate pathway → the new pathway skips it and suggests the next step.

## Phase 8 — Reports
- [x] Admin overview report + charts
- [x] Org overview, completion funnel, skill gaps by department
- [x] ⭐ Org AI summary (stretch)
- **Test:** numbers match the database; charts use solid colours only.

## Phase 9 — Landing page, polish, i18n sweep
- [x] Landing page per 09 with images per 13 (photos converted to WebP; undraw illustrations still to add)
- [x] Every string translated; errors translated by code
- [x] Loading/empty/error states everywhere; mobile responsive pass
- [x] Gradient check: `grep -rnE "gradient|from-|via-" client/src` is clean
- [x] Accessibility pass (focus rings, labels, alt text)

## Phase 10 — Security and deploy
- [x] helmet, CORS whitelist, rate limits (`/auth`, `/admin/recommendations/generate*`)
- [x] DTO mappers: no password, CV text or internalNotes leaks (test each role's responses)
- [ ] Deploy server to Render, client to Vercel, Atlas network access; Google origins updated
- [ ] Seed production demo data; run the full demo story from 00 §5
- **Test:** full demo on production URLs in both languages.

## Catalogue restructure — campus2b.com structure and content
- [x] Two catalogues (`elearning` / `general`), several categories per programme, admin-managed `Category` model
- [x] Featured and subsidised flags, topics, "ideal for" lists, intake times and notes
- [x] Catalogue page with catalogue tabs, category chips and training-calendar view; programme page sections as on campus2b.com
- [x] Real catalogue imported (18 eLearning + 34 scheduled courses) with English translations; demo seed uses the real codes
- [x] "Import from campus2b.com" on Admin → Programmes: finds site courses not on the platform (by `sourceUrls` + ignore list), imports them as drafts, adds new runs’ dates to an existing programme, or ignores them
- [x] Programme form auto-saves unsaved input in the browser and restores it on return (`client/src/lib/useFormDraft.js`)
- [ ] Run `npm run catalogue:sync` against production (archives the old demo programmes, imports covers to Cloudinary)

---

## Demo seed data (Phase 7+)
| Account | Role | Notes |
|---|---|---|
| admin@c2b.local | c2b_admin | |
| amina.student@demo.com | student | BSc Computer Science, year 3, goal: data analyst |
| hr@acmebank.demo | org_admin | Acme Bank (approved), departments ICT/Finance/HR |
| john.ict@acmebank.demo | employee | ICT, goal: cloud architect, 2 completed programmes |
| grace.finance@acmebank.demo | employee | Finance, goal: digital finance lead, remarks added |
| sunrise@demo.com | org_admin | Sunrise Logistics (pending) — to demo approval live |
Passwords: `Demo1234!` (development only).
