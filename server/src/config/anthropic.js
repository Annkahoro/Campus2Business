import Anthropic from '@anthropic-ai/sdk';
import { env } from './env.js';

/** Server-side only. The key lives in server/.env and never reaches the client (CLAUDE.md security rules). */
export const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const PLACEHOLDER_KEYS = new Set(['sk-ant-xxxxxxxx', 'sk-ant-your-real-key-here']);

/** False while server/.env still holds the example placeholder key. */
export const isAnthropicConfigured = () => !PLACEHOLDER_KEYS.has(env.ANTHROPIC_API_KEY);

/**
 * Current models think before answering and thinking tokens count towards max_tokens,
 * so a low AI_MAX_TOKENS would cut the structured answer off. Enforce a safe floor.
 */
const MIN_MAX_TOKENS = 16000;
export const AI_MAX_TOKENS = Math.max(env.AI_MAX_TOKENS, MIN_MAX_TOKENS);
if (env.AI_MAX_TOKENS < MIN_MAX_TOKENS) {
  console.warn(`⚠️  AI_MAX_TOKENS=${env.AI_MAX_TOKENS} is too low for current Claude models; using ${MIN_MAX_TOKENS}.`);
}

/**
 * Models that accept the server-side refusal fallback (`fallbacks: "default"`): if a safety classifier
 * declines the request, the API re-runs it on a suitable model inside the same call.
 */
const FALLBACK_MODELS = new Set(['claude-fable-5-1', 'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5']);
export const supportsServerFallback = (model) => FALLBACK_MODELS.has(model);
export const SERVER_FALLBACK_BETA = 'server-side-fallback-2026-07-01';
