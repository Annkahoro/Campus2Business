# C2B Learning Pathways

An AI-assisted learning platform for **Campus2Business (C2B)**, an expert training centre for upskilling and
reskilling. Students and organization employees build a learning profile; **Claude** drafts a personalised sequence of
C2B programmes; a **C2B expert reviews, edits and approves** every recommendation before the learner sees it.

The whole interface is available in **English and Spanish**.

---

## Features

| Role | What they can do |
|---|---|
| **C2B admin** | Manage the programme catalogue and custom programme fields · approve organizations · generate AI pathways, edit them (drag and drop, EN/ES), publish or reject · approve enrollments, track progress, mark completion · reports and AI usage · manage admin users |
| **Organization admin** | Register the organization (approved by C2B) · invite employees with secure links (seat limits, expiry, per department) · add remarks on employees · submit profiles to C2B · enroll employees and pay by employer invoice (simulated) · reports, skill gaps by department, AI training summary |
| **Student** | Self-register (email or Google) · 6-step profile wizard with autosave and CV upload · receive a published pathway · request enrollment, simulated payment, progress, ratings |
| **Employee** | Join through an invite link · same profile and pathway features · sees the organization's remarks read-only |

**How the AI works**
- Only programmes from the C2B catalogue are recommended; every ID is validated server-side.
- Context: profile, CV text, organization goals and remarks, learning history, and *historical patterns* ("learners like you completed X next").
- Structured output through a strict tool schema, validated again with Zod; every text comes back in English and Spanish.
- Learners only ever see the admin-approved, **published** version.

**Also included:** realtime notifications and live screen updates (Socket.IO), simulated payments (card, M-Pesa, bank,
employer invoice — no real money), charts with table views, responsive and keyboard-accessible UI.

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Node.js (ES modules), Express 5, MongoDB + Mongoose, Zod, JWT + Google Sign-In, Socket.IO |
| AI | Anthropic Claude via `@anthropic-ai/sdk` (server side only) |
| Files | Cloudinary (avatars, logos, programme covers, CV PDFs) |
| Frontend | React 19 + Vite, Tailwind CSS v4, React Router, TanStack Query, React Hook Form, react-i18next, Recharts |
| Hosting | Render (API) · Vercel (client) · MongoDB Atlas |

Architecture: `routes → middleware → controllers → services → models` on the server (only `services/ai/` talks to
Claude); `pages / components / features / layouts` on the client. Detailed specs live in [`docs/`](docs).

---

## Project structure

```
C2B/
├── server/          Express API, Socket.IO, AI services, seed scripts
│   └── src/  config · models · validators · middleware · controllers · services (ai/) · routes · sockets · seed
├── client/          React app (Vite)
│   └── src/  pages · components · features · layouts · context · i18n (en, es) · assets
└── docs/            Product, architecture, API, AI, design and build-phase specs
```

---

## Getting started

### Prerequisites
- Node.js **20.19+**
- A MongoDB Atlas database (free tier is fine)
- A Cloudinary account (free tier)
- An Anthropic API key — <https://console.anthropic.com>
- A Google OAuth client ID (optional, for "Sign in with Google")

### 1. Configure environment variables

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Fill in `server/.env`:

| Variable | Notes |
|---|---|
| `MONGO_URI` | Atlas connection string |
| `JWT_SECRET` | at least 32 random characters |
| `CLIENT_URL`, `CORS_ORIGINS` | `http://localhost:5173` for local development |
| `GOOGLE_CLIENT_ID` | same value as the client's `VITE_GOOGLE_CLIENT_ID` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | from the Cloudinary dashboard |
| `ANTHROPIC_API_KEY` | your Claude API key |
| `CLAUDE_MODEL`, `AI_MAX_TOKENS` | defaults: `claude-sonnet-5-5`, `16000` |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | first C2B admin created by the seed script |

`client/.env` only contains **public** values (`VITE_API_URL`, `VITE_SOCKET_URL`, `VITE_GOOGLE_CLIENT_ID`).

> Secrets live **only** in `server/.env`, which is git-ignored. Never put secrets in `client/.env` — anything prefixed
> `VITE_` is shipped to the browser.

### 2. Install and seed

```bash
cd server
npm install
npm run seed          # first admin + 15 bilingual programmes
npm run seed:demo     # optional: demo accounts and learning history (refuses to run in production)

cd ../client
npm install
```

### 3. Run

```bash
# terminal 1
cd server && npm run dev      # API on http://localhost:5000

# terminal 2
cd client && npm run dev      # app on http://localhost:5173
```

### Demo accounts (`npm run seed:demo`, development only)

| Email | Role | Notes |
|---|---|---|
| `amina.student@demo.com` | Student | Profile submitted, ready for a pathway |
| `hr@acmebank.demo` | Org admin | Acme Bank (approved), departments ICT / Finance / HR |
| `john.ict@acmebank.demo` | Employee | ICT, goal: cloud architect, 2 completed programmes |
| `grace.finance@acmebank.demo` | Employee | Finance, goal: digital finance lead, with remarks |
| `sunrise@demo.com` | Org admin | Sunrise Logistics (pending — demo the approval) |

Demo password: `Demo1234!`. The C2B admin uses the `SEED_ADMIN_*` values from `server/.env`.

---

## Scripts

| Location | Command | What it does |
|---|---|---|
| `server` | `npm run dev` | API with auto-reload (nodemon) |
| `server` | `npm start` | API for production |
| `server` | `npm run seed` | Idempotent: first admin + programme catalogue |
| `server` | `npm run seed:demo` | Adds demo accounts and completed enrollments |
| `client` | `npm run dev` | Vite dev server |
| `client` | `npm run build` | Production build into `client/dist` |

---

## Deployment

| Part | Platform | Settings |
|---|---|---|
| API | **Render** Web Service | Root `server` · build `npm install` · start `npm start` · all `server/.env` variables with `NODE_ENV=production`, `CLIENT_URL` and `CORS_ORIGINS` set to the Vercel URL · health check `/api/health` |
| Client | **Vercel** | Root `client` · preset Vite · `VITE_API_URL=https://<render-app>.onrender.com/api`, `VITE_SOCKET_URL=https://<render-app>.onrender.com`, `VITE_GOOGLE_CLIENT_ID` |
| Database | **MongoDB Atlas** | Network access `0.0.0.0/0` (Render IPs are dynamic) and a strong database password |
| Google | Cloud Console | Add the Vercel URL to *Authorized JavaScript origins* |

Free Render instances sleep when idle — open `/api/health` a minute before a demo. Full details:
[`docs/02-ENV-AND-SETUP.md`](docs/02-ENV-AND-SETUP.md).

---

## Security

- Passwords hashed with bcrypt; JWT bearer tokens; Google ID tokens verified server-side.
- Role checks in middleware (`protect`, `authorize`, `orgScope`); organization admins only reach their own employees.
- Response DTOs never include password hashes, CV text, internal notes or raw AI drafts for non-admins
  (verified per role in the Phase 10 leak test).
- Helmet, CORS whitelist, rate limits on the whole API, authentication and AI endpoints.
- CV files are stored under unguessable names; the AI receives no email, phone, date of birth or gender, and the
  organization summary receives anonymised aggregates only.

---

## Documentation

| File | Contents |
|---|---|
| [`00-PROJECT-OVERVIEW`](docs/00-PROJECT-OVERVIEW.md) | Goals, roles, features, demo story |
| [`01-ARCHITECTURE`](docs/01-ARCHITECTURE.md) | Folder structure and libraries |
| [`02-ENV-AND-SETUP`](docs/02-ENV-AND-SETUP.md) | Environment, install, deployment |
| [`03-DATABASE-MODELS`](docs/03-DATABASE-MODELS.md) | Mongoose schemas |
| [`04-AUTH-ROLES-AND-INVITES`](docs/04-AUTH-ROLES-AND-INVITES.md) | Auth, roles, organization approval, invites |
| [`05-API-ENDPOINTS`](docs/05-API-ENDPOINTS.md) | Every route |
| [`06-AI-RECOMMENDATION-ENGINE`](docs/06-AI-RECOMMENDATION-ENGINE.md) | Claude integration |
| [`07-WORKFLOWS-AND-STATUSES`](docs/07-WORKFLOWS-AND-STATUSES.md) | Status machines |
| [`08-FRONTEND-DESIGN-SYSTEM`](docs/08-FRONTEND-DESIGN-SYSTEM.md) | Colours, typography, components |
| [`09-DASHBOARDS-AND-PAGES`](docs/09-DASHBOARDS-AND-PAGES.md) | Pages per role |
| [`10-REALTIME-NOTIFICATIONS`](docs/10-REALTIME-NOTIFICATIONS.md) | Socket.IO events |
| [`11-I18N-EN-ES`](docs/11-I18N-EN-ES.md) | English and Spanish |
| [`12-BUILD-PHASES`](docs/12-BUILD-PHASES.md) | Build plan and checklist |
| [`13-IMAGES-AND-ASSETS`](docs/13-IMAGES-AND-ASSETS.md) | Images and assets |

---

© Campus2Business. All rights reserved.
