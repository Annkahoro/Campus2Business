import { z } from 'zod';
import { PATHWAY_PHASES, RECOMMENDATION_STATUSES } from '../models/Recommendation.js';
import { PROFILE_STATUSES } from '../models/LearnerProfile.js';
import { i18nText, objectId, paginationQuery } from './common.js';

/* ───────── admin queue & learners ───────── */

export const listRecommendationsQuery = z.object({
  status: z.enum(RECOMMENDATION_STATUSES).optional(),
  learner: objectId.optional(),
  search: z.string().trim().max(100).optional(),
  ...paginationQuery,
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const listLearnersQuery = z.object({
  type: z.enum(['student', 'employee']).optional(),
  org: objectId.optional(),
  status: z.enum(PROFILE_STATUSES).optional(),
  department: z.string().trim().max(80).optional(),
  search: z.string().trim().max(100).optional(),
  ...paginationQuery,
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const bulkGenerateSchema = z.object({
  userIds: z.array(objectId).min(1, 'REQUIRED').max(50),
});

/* ───────── review editor ───────── */

const step = z.object({
  programmeId: objectId,
  phase: z.enum(PATHWAY_PHASES),
  reason: i18nText(1500),
  matchScore: z.number().int().min(0).max(100).nullable().optional(),
  expectedOutcome: i18nText(1500),
});

const alternative = z.object({ programmeId: objectId, reason: i18nText(1500) });

export const updateRecommendationSchema = z
  .object({
    final: z
      .object({
        summary: i18nText(3000),
        pathway: z.array(step).min(1, 'PATHWAY_EMPTY').max(10),
        alternatives: z.array(alternative).max(5),
        adminNoteToLearner: i18nText(2000),
      })
      .optional(),
    internalNotes: z.string().trim().max(5000).optional(),
  })
  .refine((v) => v.final !== undefined || v.internalNotes !== undefined, { message: 'NOTHING_TO_UPDATE' });

export const rejectRecommendationSchema = z.object({
  reason: z.string().trim().min(3, 'REASON_REQUIRED').max(1000),
});

/* ───────── learner ───────── */

export const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().default(''),
});
