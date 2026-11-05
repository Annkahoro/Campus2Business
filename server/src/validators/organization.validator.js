import { z } from 'zod';
import { ORG_SIZES, ORG_STATUSES, TRAINING_BUDGETS } from '../models/Organization.js';
import { REMARK_CATEGORIES } from '../models/LearnerProfile.js';
import { objectId, paginationQuery, stringList } from './common.js';

const str = (max) => z.string().trim().max(max).optional().default('');
// No .default() here: it is used in the partial (PATCH) schema.
const urlOrEmpty = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), 'INVALID_URL');

const departments = z
  .array(
    z.object({
      name: z.string().trim().min(1, 'REQUIRED').max(80),
      headcount: z.number().int().min(0).max(1_000_000).nullable().optional(),
    }),
  )
  .min(1, 'DEPARTMENTS_REQUIRED')
  .max(50)
  .refine((d) => new Set(d.map((x) => x.name.toLowerCase())).size === d.length, 'DUPLICATE_DEPARTMENT');

/** No `.default()`s on the shape used for PATCH, so a partial update never resets omitted fields (Zod 4). */
const shape = {
  name: z.string().trim().min(2, 'NAME_TOO_SHORT').max(150),
  industry: z.string().trim().max(100),
  size: z.enum(ORG_SIZES).nullable(),
  country: z.string().trim().max(80),
  city: z.string().trim().max(80),
  website: urlOrEmpty,
  contactPerson: z.object({
    name: str(120),
    email: z.union([z.literal(''), z.string().trim().toLowerCase().email('INVALID_EMAIL')]).optional().default(''),
    phone: str(30),
    position: str(120),
  }),
  description: z.string().trim().max(2000),
  departments,
  goals: stringList(20, 200),
  objectives: stringList(20, 200),
  skillGaps: stringList(30, 120),
  trainingBudget: z.enum(TRAINING_BUDGETS),
  digitalMaturity: z.number().int().min(1).max(5).nullable(),
  additionalInfo: z.string().trim().max(2000),
};

export const createOrgSchema = z.object(shape).partial().required({ name: true, departments: true });
export const updateOrgSchema = z
  .object(shape)
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'NOTHING_TO_UPDATE' });

export const rejectOrgSchema = z.object({ reason: z.string().trim().min(3, 'REQUIRED').max(1000) });

export const adminListOrgsQuery = z.object({
  status: z.enum(ORG_STATUSES).optional(),
  search: z.string().trim().max(100).optional(),
  ...paginationQuery,
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/* ── invites ── */
export const createInviteSchema = z.object({
  label: z.string().trim().max(100).optional().default(''),
  department: z.string().trim().max(80).optional().default(''),
  expiresAt: z.coerce.date().nullable().optional().default(null),
  maxUses: z.number().int().min(1).max(100000).nullable().optional().default(null),
});

export const updateInviteSchema = z
  .object({
    label: z.string().trim().max(100),
    department: z.string().trim().max(80),
    expiresAt: z.coerce.date().nullable(),
    maxUses: z.number().int().min(1).max(100000).nullable(),
    isActive: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'NOTHING_TO_UPDATE' });

/* ── org employees ── */
export const remarkSchema = z.object({
  text: z.string().trim().min(1, 'REQUIRED').max(2000),
  category: z.enum(REMARK_CATEGORIES).optional().default('other'),
});

export const updateRemarkSchema = z
  .object({ text: z.string().trim().min(1, 'REQUIRED').max(2000), category: z.enum(REMARK_CATEGORIES) })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'NOTHING_TO_UPDATE' });

export const bulkSubmitSchema = z.object({ employeeIds: z.array(objectId).min(1).max(200) });

export const listEmployeesQuery = z.object({
  department: z.string().trim().max(80).optional(),
  status: z.enum(['draft', 'complete', 'submitted', 'under_review', 'pathway_published']).optional(),
  search: z.string().trim().max(100).optional(),
});
