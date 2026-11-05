import { z } from 'zod';
import { ENROLLMENT_STATUSES, PAYMENT_METHODS } from '../models/Enrollment.js';
import { objectId, paginationQuery } from './common.js';

export const requestEnrollmentSchema = z.object({
  programmeId: objectId,
  intakeStartDate: z.coerce.date().optional(),
  recommendationId: objectId.optional(),
  learnerId: objectId.optional(), // org_admin only
});

export const paySchema = z.object({ method: z.enum(PAYMENT_METHODS) });

export const rateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().trim().max(1000).optional().default(''),
});

/** Admin moves: approve | reject | active | completed | dropped (payment_pending is reached by approving). */
export const adminStatusSchema = z.object({
  status: z.enum(['approved', 'rejected', 'active', 'completed', 'dropped']),
  score: z.number().int().min(0).max(100).nullable().optional(),
  adminNotes: z.string().trim().max(2000).optional(),
});

export const adminProgressSchema = z.object({
  progressPercent: z.number().int().min(0).max(100),
  score: z.number().int().min(0).max(100).nullable().optional(),
});

export const adminListEnrollmentsQuery = z.object({
  status: z.enum(ENROLLMENT_STATUSES).optional(),
  programme: objectId.optional(),
  org: objectId.optional(),
  search: z.string().trim().max(100).optional(),
  ...paginationQuery,
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const orgListEnrollmentsQuery = z.object({
  status: z.enum(ENROLLMENT_STATUSES).optional(),
  search: z.string().trim().max(100).optional(),
});
