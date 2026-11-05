import { z } from 'zod';

/**
 * Structured answers from Claude (docs/06 §6).
 *
 * The tools use `strict: true`, which guarantees schema-valid arguments. Strict schemas cannot carry numeric
 * or array-length limits (minimum/maximum/maxItems) and need `additionalProperties: false` on every object,
 * so those limits live in the descriptions and are enforced again by the Zod schemas below.
 * `strengths` and `skillGaps[].skill` are bilingual (see models/Recommendation.js).
 */

const i18n = {
  type: 'object',
  description: 'The same text in English ("en") and natural, neutral Spanish ("es").',
  properties: { en: { type: 'string' }, es: { type: 'string' } },
  required: ['en', 'es'],
  additionalProperties: false,
};

export const submitPathwayTool = {
  name: 'submit_pathway',
  description:
    'Submit the recommended learning pathway for the learner. Call this exactly once with the complete answer.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      summary: { ...i18n, description: '2–4 sentence overview of the pathway for this learner, in en and es.' },
      strengths: { type: 'array', description: 'Up to 6 learner strengths.', items: i18n },
      skillGaps: {
        type: 'array',
        description: 'Up to 8 skill gaps the pathway closes.',
        items: {
          type: 'object',
          properties: { skill: i18n, importance: { type: 'string', enum: ['high', 'medium', 'low'] } },
          required: ['skill', 'importance'],
          additionalProperties: false,
        },
      },
      pathway: {
        type: 'array',
        description: '3–6 programmes ordered from foundation to advanced.',
        items: {
          type: 'object',
          properties: {
            programmeId: { type: 'string', description: 'The exact "id" of a programme from <catalogue>.' },
            order: { type: 'integer', description: '1 for the first programme, then 2, 3…' },
            phase: { type: 'string', enum: ['foundation', 'core', 'advanced', 'specialisation'] },
            reason: { ...i18n, description: '1–3 sentences specific to this learner (goal, skill gap, remark or history).' },
            matchScore: { type: 'integer', description: 'Fit for this learner, 0–100.' },
            expectedOutcome: { ...i18n, description: 'What the learner can do after the programme.' },
          },
          required: ['programmeId', 'order', 'phase', 'reason', 'matchScore', 'expectedOutcome'],
          additionalProperties: false,
        },
      },
      alternatives: {
        type: 'array',
        description: 'Up to 3 alternative programmes from <catalogue> that are not in the pathway.',
        items: {
          type: 'object',
          properties: { programmeId: { type: 'string' }, reason: i18n },
          required: ['programmeId', 'reason'],
          additionalProperties: false,
        },
      },
      confidence: { type: 'integer', description: 'How confident you are in this pathway, 0–100.' },
    },
    required: ['summary', 'strengths', 'skillGaps', 'pathway', 'alternatives', 'confidence'],
    additionalProperties: false,
  },
};

export const submitTranslationsTool = {
  name: 'submit_translations',
  description: 'Submit the translations. Call this exactly once, with one entry per requested id.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      translations: {
        type: 'array',
        items: {
          type: 'object',
          properties: { id: { type: 'string' }, text: { type: 'string' } },
          required: ['id', 'text'],
          additionalProperties: false,
        },
      },
    },
    required: ['translations'],
    additionalProperties: false,
  },
};

/* ───────── Zod second pass: enforce the limits strict mode cannot express ───────── */

const clampInt = (min, max) =>
  z.coerce
    .number()
    .finite()
    .transform((n) => Math.min(max, Math.max(min, Math.round(n))));

const I18nZ = z.object({ en: z.string().trim().max(2000), es: z.string().trim().max(2000) });
const capped = (schema, max) => z.array(schema).transform((a) => a.slice(0, max));

export const PathwayResultSchema = z.object({
  summary: I18nZ,
  strengths: capped(I18nZ, 6),
  skillGaps: capped(z.object({ skill: I18nZ, importance: z.enum(['high', 'medium', 'low']) }), 8),
  pathway: z
    .array(
      z.object({
        programmeId: z.string().trim().min(1),
        order: z.coerce.number().int(),
        phase: z.enum(['foundation', 'core', 'advanced', 'specialisation']),
        reason: I18nZ,
        matchScore: clampInt(0, 100),
        expectedOutcome: I18nZ,
      }),
    )
    .min(1),
  alternatives: capped(z.object({ programmeId: z.string().trim().min(1), reason: I18nZ }), 3),
  confidence: clampInt(0, 100),
});

export const TranslationResultSchema = z.object({
  translations: z.array(z.object({ id: z.string(), text: z.string().trim() })),
});

/* ───────── Org AI summary (docs/06 §10, stretch) ───────── */

export const submitOrgSummaryTool = {
  name: 'submit_org_summary',
  description: 'Submit the training-needs summary for the organization. Call this exactly once.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      summary: { ...i18n, description: '3–5 sentences on the organization\'s training needs, in en and es.' },
      highlights: { type: 'array', description: 'Up to 4 short key findings.', items: i18n },
      suggestedProgrammes: {
        type: 'array',
        description: 'Exactly 3 group programmes from <catalogue>, most useful first.',
        items: {
          type: 'object',
          properties: {
            programmeId: { type: 'string', description: 'The exact "id" of a programme from <catalogue>.' },
            departments: { type: 'array', items: { type: 'string' }, description: 'Departments it suits.' },
            reason: i18n,
          },
          required: ['programmeId', 'departments', 'reason'],
          additionalProperties: false,
        },
      },
    },
    required: ['summary', 'highlights', 'suggestedProgrammes'],
    additionalProperties: false,
  },
};

export const OrgSummarySchema = z.object({
  summary: I18nZ,
  highlights: capped(I18nZ, 4),
  suggestedProgrammes: capped(
    z.object({ programmeId: z.string().trim().min(1), departments: capped(z.string().trim().max(80), 6), reason: I18nZ }),
    3,
  ),
});
