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
  // Thinking tokens count towards max_tokens on current models, so 4000 (docs/02) is too tight; see config/anthropic.js.
  AI_MAX_TOKENS: z.coerce.number().default(16000),
  // Kept for docs/02 compatibility only: current Claude models reject custom sampling values, so it is not sent.
  AI_TEMPERATURE: z.coerce.number().default(0.3),
  AI_MAX_CATALOGUE_ITEMS: z.coerce.number().default(40),
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:', z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === 'production';

/** CORS whitelist parsed from the comma-separated CORS_ORIGINS value. */
export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
