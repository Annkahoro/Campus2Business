# 01 — Architecture

## 1. Monorepo layout
```
c2b/
├── CLAUDE.md
├── docs/                      # these spec files
├── server/                    # Express API (Render)
└── client/                    # React + Vite (Vercel)
```

## 2. Backend — MVC + services
```
server/
├── package.json               # "type": "module"
├── .env / .env.example
└── src/
    ├── server.js              # creates http server, attaches Socket.IO, starts listening
    ├── app.js                 # express app: cors, helmet, json, routes, errorHandler
    ├── config/
    │   ├── env.js             # loads + validates env with Zod; exports `env`
    │   ├── db.js              # mongoose.connect
    │   ├── cloudinary.js
    │   └── anthropic.js       # exports a single Anthropic client instance
    ├── models/                # Mongoose schemas (see 03)
    │   ├── User.js
    │   ├── LearnerProfile.js
    │   ├── Organization.js
    │   ├── InviteLink.js
    │   ├── Programme.js
    │   ├── ProgrammeField.js
    │   ├── Recommendation.js
    │   ├── Enrollment.js
    │   ├── Notification.js
    │   └── AuditLog.js
    ├── validators/            # Zod schemas, one file per domain
    ├── middleware/
    │   ├── asyncHandler.js
    │   ├── errorHandler.js
    │   ├── protect.js         # verifies JWT, attaches req.user
    │   ├── authorize.js       # authorize('c2b_admin', 'org_admin')
    │   ├── orgScope.js        # org_admin only touches own org's data
    │   ├── validate.js        # validate(zodSchema) → req.body
    │   ├── upload.js          # multer memory storage (image / pdf filters)
    │   └── rateLimit.js       # stricter limit on /auth and /ai routes
    ├── controllers/           # thin: read req → call service → send response
    │   ├── auth.controller.js
    │   ├── profile.controller.js
    │   ├── organization.controller.js
    │   ├── invite.controller.js
    │   ├── programme.controller.js
    │   ├── programmeField.controller.js
    │   ├── recommendation.controller.js
    │   ├── enrollment.controller.js
    │   ├── notification.controller.js
    │   ├── report.controller.js
    │   └── upload.controller.js
    ├── services/              # business logic
    │   ├── auth.service.js
    │   ├── profile.service.js
    │   ├── organization.service.js
    │   ├── invite.service.js
    │   ├── programme.service.js
    │   ├── enrollment.service.js
    │   ├── report.service.js
    │   ├── upload.service.js       # Cloudinary upload/delete
    │   ├── cv.service.js           # PDF → text with pdf-parse
    │   ├── notification.service.js # saves Notification + emits socket event
    │   └── ai/
    │       ├── ai.service.js            # the ONLY file that calls anthropic.messages.create
    │       ├── context.builder.js       # gathers profile + org + history + catalogue
    │       ├── prompts.js               # system prompt + user prompt templates
    │       ├── schema.js                # Zod schema of Claude's JSON answer
    │       └── historical.signals.js    # "learners like you also took…" aggregation
    ├── sockets/
    │   └── index.js           # auth handshake, rooms, emit helpers
    ├── routes/                # one router per domain, mounted under /api
    ├── utils/
    │   ├── ApiError.js        # class ApiError(statusCode, code, message)
    │   ├── tokens.js          # signJwt, randomToken
    │   └── dto.js             # toPublicUser, toLearnerView… (strip private fields)
    └── seed/
        ├── seed.js            # npm run seed
        ├── programmes.json    # 12–15 realistic programmes (EN + ES)
        └── demoUsers.json
```

### Request lifecycle
```
Request → route → protect → authorize → orgScope? → validate(schema) → controller → service → model
                                                                                 ↘ ai.service → Claude
Response ← controller ← service result               errors → errorHandler → { success:false, code, message }
```

## 3. Frontend — component-based
```
client/
├── index.html
├── vite.config.js
├── .env / .env.example
├── public/
│   ├── favicon.svg
│   └── og-image.jpg
└── src/
    ├── main.jsx               # QueryClientProvider, Router, i18n, AuthProvider, SocketProvider
    ├── App.jsx                # route table
    ├── index.css              # Tailwind v4 @import + @theme tokens (see 08)
    ├── assets/images/         # see 13-IMAGES-AND-ASSETS
    ├── i18n/
    │   ├── index.js
    │   └── locales/{en,es}/{common,auth,profile,admin,org,learner}.json
    ├── lib/
    │   ├── axios.js           # baseURL, Bearer token interceptor, 401 → logout
    │   ├── queryClient.js
    │   └── socket.js
    ├── context/
    │   ├── AuthContext.jsx
    │   └── SocketContext.jsx
    ├── routes/
    │   ├── ProtectedRoute.jsx # checks login
    │   └── RoleRoute.jsx      # checks role
    ├── layouts/
    │   ├── PublicLayout.jsx
    │   ├── AdminLayout.jsx
    │   ├── OrgLayout.jsx
    │   └── LearnerLayout.jsx  # used by student AND employee
    ├── components/
    │   ├── ui/                # Button, Input, Select, Textarea, Card, Badge, Modal, Table, Tabs,
    │   │                      # Stepper, Avatar, EmptyState, Spinner, Toast, ProgressBar, TagInput
    │   ├── layout/            # Sidebar, Topbar, LanguageSwitcher, NotificationBell
    │   └── shared/            # StatusBadge, FileUpload, ConfirmDialog, DynamicField
    ├── features/
    │   ├── auth/              # api.js, hooks.js, LoginForm, RegisterForm, GoogleButton
    │   ├── profile/           # wizard steps, ProfileSummary, CvUpload
    │   ├── organizations/
    │   ├── invites/
    │   ├── programmes/        # ProgrammeCard, ProgrammeForm (renders custom fields)
    │   ├── programmeFields/
    │   ├── recommendations/   # PathwayTimeline, ReviewEditor
    │   ├── enrollments/       # PaymentSimulator, ProgressTracker
    │   ├── notifications/
    │   └── reports/           # charts
    └── pages/
        ├── public/            # Landing, Login, Register, RegisterOrg, JoinInvite, NotFound
        ├── admin/
        ├── org/
        └── learner/
```

## 4. Libraries

### Server
| Package | Purpose |
|---|---|
| express, cors, helmet, morgan, compression | HTTP basics |
| mongoose | MongoDB ODM |
| zod | validation (env + request bodies + AI output) |
| jsonwebtoken, bcryptjs | auth |
| google-auth-library | verify Google ID tokens |
| @anthropic-ai/sdk | Claude API |
| cloudinary, multer | file uploads |
| pdf-parse | extract CV text |
| socket.io | realtime |
| express-rate-limit | rate limiting |
| nanoid | invite tokens |
| dotenv | env loading |
| nodemon (dev) | reload |

### Client
| Package | Purpose |
|---|---|
| react, react-dom, react-router-dom | core |
| tailwindcss, @tailwindcss/vite | styling (v4) |
| @tanstack/react-query | server state |
| axios | HTTP |
| react-hook-form, @hookform/resolvers, zod | forms |
| react-i18next, i18next, i18next-browser-languagedetector | EN/ES |
| @react-oauth/google | Google button |
| socket.io-client | realtime |
| lucide-react | icons |
| recharts | report charts (solid fills only) |
| react-hot-toast | toasts |
| @dnd-kit/core, @dnd-kit/sortable | reorder pathway steps in admin review |
| dayjs | dates |

## 5. Why JavaScript (not TypeScript)
This is a time-boxed challenge. JavaScript with ES modules plus **Zod at every boundary** (env, request bodies, forms,
AI output) gives most of the safety at much less setup cost. Zod schemas double as documentation. Migrating to
TypeScript later is straightforward because the shapes are already defined in Zod.
