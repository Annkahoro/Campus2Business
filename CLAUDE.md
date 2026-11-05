# CLAUDE.md — C2B Learning Pathways Platform

> Claude Code reads this file automatically. Keep it in the **project root**.
> Detailed specs live in `/docs`. Read the relevant doc **before** implementing any feature.

## What we are building
An AI-powered platform for **Campus2Business (C2B)**, an expert training centre. It collects rich profiles from
**students** and **organization employees**, then uses the **Claude API** to recommend the best C2B training
programmes and learning pathways (upskilling / reskilling). A **C2B admin reviews, edits and approves** every AI
recommendation before the learner sees it.

## Roles
- `c2b_admin` — manages programmes and custom programme fields, approves organizations, reviews AI recommendations, manages enrollments.
- `org_admin` — registers an organization (must be approved by C2B), gets an invite link, adds remarks on employees, submits employees to C2B, views org reports.
- `student` — self-registers, builds a profile, receives an approved pathway, enrolls.
- `employee` — joins only through an organization invite link, builds a profile, receives an approved pathway, enrolls.

## Stack (do not change without asking)
- **Backend:** Node.js (LTS), Express, MongoDB + Mongoose, JavaScript **ES Modules** (`"type": "module"`)
- **Validation:** Zod (backend and frontend)
- **Auth:** JWT (Bearer token) + Google Sign-In (ID token verified with `google-auth-library`)
- **AI:** `@anthropic-ai/sdk` — server side only
- **Files:** Cloudinary (avatars, logos, programme images, CV PDFs) via `multer` memory storage
- **Realtime:** Socket.IO (notifications and status updates — no email or SMS for now)
- **Frontend:** React + Vite + Tailwind CSS v4, React Router, TanStack Query, Axios, React Hook Form, react-i18next
- **Languages:** English (`en`) and Spanish (`es`)
- **Deploy:** backend on Render, frontend on Vercel, database on MongoDB Atlas

## Architecture rules
1. **Backend = MVC + services:** `routes → middleware → controllers → services → models`.
   Controllers stay thin. Business logic lives in `services/`. **Only `services/ai/` talks to Claude.**
2. **Frontend = component-based:** `pages/` (route-level), `components/` (reusable UI), `features/<domain>/`
   (hooks, API calls and components per domain), `layouts/` (one per role).
3. Every controller is wrapped in `asyncHandler`. Errors go through the central `errorHandler`.
4. Every request body is validated with a Zod schema in `validators/`.
5. API responses always use this shape: `{ success: boolean, data?: any, message?: string, code?: string }`.
   Error `code` values (e.g. `INVITE_EXPIRED`) are translated on the frontend.
6. Role checks happen in middleware (`protect`, `authorize(...roles)`, `orgScope`), never only in the UI.

## Security rules (non-negotiable)
- `ANTHROPIC_API_KEY`, `JWT_SECRET`, `CLOUDINARY_API_SECRET` and `MONGO_URI` exist **only** in `server/.env`.
- Never put secrets in `client/.env`. Anything prefixed `VITE_` is public.
- Never send password hashes, CV text or `internalNotes` to roles that should not see them (use `select` and DTO mappers).
- An employee can **read** `orgRemarks` but can **never** edit them.
- Learners only see a recommendation once its status is `published`.

## Design rules (non-negotiable)
- **NO GRADIENTS. Anywhere.** No `bg-gradient-*`, no `linear-gradient`, no `radial-gradient`, no gradient text.
- Flat, solid colours only. Brand palette:
  - Emerald `#055F46` (primary)
  - Mint `#A7F3D0` (accent / soft highlights)
  - Cream `#FFF8E7` (page background / warm surfaces)
- Full token list: `docs/08-FRONTEND-DESIGN-SYSTEM.md`.
- Every user-facing string goes through i18n (`t('key')`). No hard-coded English in JSX.

## Workflow for Claude Code
- Build in the order given in `docs/12-BUILD-PHASES.md`. Finish and test one phase before starting the next.
- When a doc and the code disagree, follow the doc and mention the conflict.
- After each phase, update the checklist in `docs/12-BUILD-PHASES.md`.
- When generating code for the user, output **complete files**, not partial diffs.

## Docs index
| File | Purpose |
|---|---|
| `docs/00-PROJECT-OVERVIEW.md` | Goals, roles, features |
| `docs/01-ARCHITECTURE.md` | Folder structure, libraries |
| `docs/02-ENV-AND-SETUP.md` | `.env` files, install, scripts, deploy |
| `docs/03-DATABASE-MODELS.md` | All Mongoose schemas |
| `docs/04-AUTH-ROLES-AND-INVITES.md` | Auth, roles, org approval, invite links |
| `docs/05-API-ENDPOINTS.md` | Every route |
| `docs/06-AI-RECOMMENDATION-ENGINE.md` | Claude integration |
| `docs/07-WORKFLOWS-AND-STATUSES.md` | Status machines for profiles, recommendations, enrollments |
| `docs/08-FRONTEND-DESIGN-SYSTEM.md` | Colours, typography, components, no-gradient rule |
| `docs/09-DASHBOARDS-AND-PAGES.md` | Pages per role |
| `docs/10-REALTIME-NOTIFICATIONS.md` | Socket.IO events |
| `docs/11-I18N-EN-ES.md` | English and Spanish |
| `docs/12-BUILD-PHASES.md` | Step-by-step build plan |
| `docs/13-IMAGES-AND-ASSETS.md` | Images to download and where to put them |
