# 02 — Environment and Setup

## 1. `server/.env`  (PRIVATE — never commit)
```env
# ── Server ─────────────────────────────
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
# comma-separated list allowed for CORS, e.g. https://c2b.vercel.app,http://localhost:5173
CORS_ORIGINS=http://localhost:5173

# ── Database ───────────────────────────
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/c2b?retryWrites=true&w=majority

# ── Auth ───────────────────────────────
JWT_SECRET=replace_with_64_random_chars
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com

# ── Cloudinary ─────────────────────────
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
CLOUDINARY_FOLDER=c2b

# ── Claude (Anthropic) ─────────────────
ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
CLAUDE_MODEL=claude-sonnet-5-5
AI_MAX_TOKENS=4000
AI_TEMPERATURE=0.3
# max programmes sent to Claude per request after pre-filtering
AI_MAX_CATALOGUE_ITEMS=40

# ── Seed ───────────────────────────────
SEED_ADMIN_EMAIL=admin@c2b.local
SEED_ADMIN_PASSWORD=ChangeMe123!
```

### Getting the Claude API key
1. Go to **console.anthropic.com**, sign in, and add billing credit (a few dollars is plenty for a demo).
2. Open **API Keys → Create Key**, name it `c2b-dev`, and copy it into `ANTHROPIC_API_KEY`.
3. Create a **separate key** for production (`c2b-prod`) and put it only in Render's environment settings.
4. Set a monthly spend limit in the console.

### `server/src/config/env.js` — validate env at startup
```js
import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  CLIENT_URL: z.string().url(),
  CORS_ORIGINS: z.string(),
  MONGO_URI: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  GOOGLE_CLIENT_ID: z.string().min(1),
  CLOUDINARY_CLOUD_NAME: z.string(),
  CLOUDINARY_API_KEY: z.string(),
  CLOUDINARY_API_SECRET: z.string(),
  CLOUDINARY_FOLDER: z.string().default('c2b'),
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-'),
  CLAUDE_MODEL: z.string().default('claude-sonnet-5-5'),
  AI_MAX_TOKENS: z.coerce.number().default(4000),
  AI_TEMPERATURE: z.coerce.number().default(0.3),
  AI_MAX_CATALOGUE_ITEMS: z.coerce.number().default(40),
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = parsed.data;
```

### `server/src/config/anthropic.js`
```js
import Anthropic from '@anthropic-ai/sdk';
import { env } from './env.js';

export const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
```

## 2. `client/.env`  (PUBLIC — everything here ships to the browser)
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
VITE_DEFAULT_LANG=en
```
> ⚠️ **Never** put `ANTHROPIC_API_KEY`, `JWT_SECRET`, `MONGO_URI` or Cloudinary secrets here.
> Uploads go through the backend, so the frontend never needs Cloudinary secrets.

## 3. `.gitignore` (root)
```
node_modules
.env
dist
.DS_Store
*.log
```
Commit `.env.example` files with placeholder values only.

## 4. Google OAuth setup
In Google Cloud Console → Credentials → your OAuth Client ID:
- **Authorized JavaScript origins:** `http://localhost:5173` and your Vercel URL (`https://<app>.vercel.app`).
- No redirect URI is needed. We use the Google Identity button, which returns an **ID token** that the backend verifies.

## 5. Install and run
```bash
# server
cd server
npm init -y
npm i express mongoose cors helmet morgan compression zod jsonwebtoken bcryptjs google-auth-library \
  @anthropic-ai/sdk cloudinary multer pdf-parse socket.io express-rate-limit nanoid dotenv
npm i -D nodemon

# client
npm create vite@latest client -- --template react
cd client
npm i react-router-dom @tanstack/react-query axios react-hook-form @hookform/resolvers zod \
  react-i18next i18next i18next-browser-languagedetector @react-oauth/google socket.io-client \
  lucide-react recharts react-hot-toast @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities dayjs
npm i -D tailwindcss @tailwindcss/vite
```

### `server/package.json` scripts
```json
{
  "type": "module",
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "seed": "node src/seed/seed.js"
  }
}
```

## 6. Deployment

### Backend → Render (Web Service)
- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`
- Environment: paste every `server/.env` variable. Set `NODE_ENV=production`,
  `CLIENT_URL=https://<app>.vercel.app`, and `CORS_ORIGINS=https://<app>.vercel.app`.
- Socket.IO works on Render web services (WebSockets are supported).
- Free instances sleep when idle. Hit `/api/health` a minute before the demo to wake it.

### Frontend → Vercel
- Root directory: `client`, framework preset **Vite**.
- Environment: `VITE_API_URL=https://<render-app>.onrender.com/api`, `VITE_SOCKET_URL=https://<render-app>.onrender.com`,
  `VITE_GOOGLE_CLIENT_ID=...`.
- Add `client/vercel.json` so React Router deep links work:
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

### MongoDB Atlas
- Network Access: allow `0.0.0.0/0` (Render IPs are dynamic) and use a strong DB password.
