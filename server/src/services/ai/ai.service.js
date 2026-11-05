import Anthropic from '@anthropic-ai/sdk';
import {
  AI_MAX_TOKENS,
  SERVER_FALLBACK_BETA,
  anthropic,
  isAnthropicConfigured,
  supportsServerFallback,
} from '../../config/anthropic.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import {
  ORG_SUMMARY_SYSTEM_PROMPT,
  PROMPT_VERSION,
  SYSTEM_PROMPT,
  TRANSLATE_SYSTEM_PROMPT,
  buildOrgSummaryPrompt,
  buildTranslatePrompt,
  buildUserPrompt,
} from './prompts.js';
import {
  OrgSummarySchema,
  PathwayResultSchema,
  TranslationResultSchema,
  submitOrgSummaryTool,
  submitPathwayTool,
  submitTranslationsTool,
} from './schema.js';

/**
 * The ONLY module that calls Claude (docs/06 §1, CLAUDE.md architecture rule 1).
 *
 * Deviations from the docs/06 §7 reference, required by the current model (claude-sonnet-5-5):
 *  - `tool_choice: { type: 'tool' }` is rejected (400), so we use `auto` + a prompt instruction, `strict: true`
 *    on the tool for schema-valid arguments, and retry if no tool call comes back.
 *  - Custom `temperature` values are rejected (400), so AI_TEMPERATURE is not sent.
 *  - The server-side refusal fallback is enabled where the model supports it.
 */

export function assertAiConfigured() {
  if (!isAnthropicConfigured()) {
    throw new ApiError(503, 'AI_NOT_CONFIGURED', 'ANTHROPIC_API_KEY is not set in server/.env');
  }
}

/** One Messages API call that must answer through `tool`. Returns { input, response }. */
async function callTool({ system, prompt, tool }) {
  const params = {
    model: env.CLAUDE_MODEL,
    max_tokens: AI_MAX_TOKENS,
    system,
    tools: [tool],
    tool_choice: { type: 'auto' },
    messages: [{ role: 'user', content: prompt }],
  };

  let response;
  try {
    response = supportsServerFallback(env.CLAUDE_MODEL)
      ? await anthropic.beta.messages.create({ ...params, betas: [SERVER_FALLBACK_BETA], fallbacks: 'default' })
      : await anthropic.messages.create(params);
  } catch (err) {
    // Most specific first. (In the TS/JS SDK, APIConnectionError is a subclass of APIError.)
    if (err instanceof Anthropic.RateLimitError) {
      throw new ApiError(429, 'AI_RATE_LIMITED', 'AI is busy, try again shortly');
    }
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      throw new ApiError(502, 'AI_FAILED', 'The Anthropic API key was rejected');
    }
    if (err instanceof Anthropic.APIConnectionError) {
      throw new ApiError(502, 'AI_FAILED', 'Could not reach the AI service');
    }
    if (err instanceof Anthropic.APIError) {
      throw new ApiError(502, 'AI_FAILED', `AI request failed (${err.status ?? 'unknown'}): ${err.message}`);
    }
    throw err;
  }

  if (response.stop_reason === 'refusal') {
    throw new ApiError(502, 'AI_FAILED', 'The AI declined this request', { retryable: false });
  }
  const toolUse = response.content.find((b) => b.type === 'tool_use' && b.name === tool.name);
  if (!toolUse) {
    const reason = response.stop_reason === 'max_tokens' ? 'The AI answer was cut off' : 'No structured answer from AI';
    throw new ApiError(502, 'AI_FAILED', reason, { retryable: true, response });
  }
  return { input: toolUse.input, response };
}

/**
 * Calls Claude, validates with Zod, and retries once on a missing/invalid structured answer (docs/06 §7).
 * Network errors and 5xx are already retried by the SDK.
 */
async function callWithRetry({ system, prompt, tool, schema }) {
  let lastError;
  let usage = { inputTokens: 0, outputTokens: 0 };
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const { input, response } = await callTool({ system, prompt, tool });
      usage = {
        inputTokens: usage.inputTokens + (response.usage?.input_tokens ?? 0),
        outputTokens: usage.outputTokens + (response.usage?.output_tokens ?? 0),
      };
      const parsed = schema.safeParse(input);
      if (parsed.success) return { data: parsed.data, response, usage, attempts: attempt };
      lastError = new ApiError(502, 'AI_FAILED', 'AI answer failed validation', { retryable: true });
    } catch (err) {
      if (!(err instanceof ApiError) || !err.details?.retryable) throw err;
      const resp = err.details.response;
      if (resp?.usage) {
        usage = {
          inputTokens: usage.inputTokens + (resp.usage.input_tokens ?? 0),
          outputTokens: usage.outputTokens + (resp.usage.output_tokens ?? 0),
        };
      }
      lastError = new ApiError(502, 'AI_FAILED', err.message);
    }
  }
  throw lastError;
}

/** context: output of context.builder.js → { result, meta } */
export async function generatePathway(context) {
  assertAiConfigured();
  const started = Date.now();
  const { data, response, usage, attempts } = await callWithRetry({
    system: SYSTEM_PROMPT,
    prompt: buildUserPrompt(context),
    tool: submitPathwayTool,
    schema: PathwayResultSchema,
  });

  return {
    result: data,
    meta: {
      model: response.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      latencyMs: Date.now() - started,
      promptVersion: PROMPT_VERSION,
      catalogueSize: context.catalogue.length,
      attempts,
    },
  };
}

/**
 * items: [{ id, from, to, text }] → Map(id → translated text).
 * Used by POST /admin/recommendations/:id/translate to fill empty en/es fields.
 */
export async function translateTexts(items) {
  assertAiConfigured();
  if (items.length === 0) return { translations: new Map(), usage: { inputTokens: 0, outputTokens: 0 } };
  const { data, usage } = await callWithRetry({
    system: TRANSLATE_SYSTEM_PROMPT,
    prompt: buildTranslatePrompt(items),
    tool: submitTranslationsTool,
    schema: TranslationResultSchema,
  });
  const wanted = new Set(items.map((i) => i.id));
  const translations = new Map(data.translations.filter((t) => wanted.has(t.id) && t.text).map((t) => [t.id, t.text]));
  return { translations, usage };
}

/** Org-level training summary from anonymised aggregates (docs/06 §10). → { result, meta } */
export async function generateOrgSummary(context) {
  assertAiConfigured();
  const started = Date.now();
  const { data, response, usage } = await callWithRetry({
    system: ORG_SUMMARY_SYSTEM_PROMPT,
    prompt: buildOrgSummaryPrompt(context),
    tool: submitOrgSummaryTool,
    schema: OrgSummarySchema,
  });
  return {
    result: data,
    meta: { model: response.model, ...usage, latencyMs: Date.now() - started, promptVersion: PROMPT_VERSION },
  };
}
