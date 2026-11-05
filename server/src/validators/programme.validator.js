import { z } from 'zod';
import {
  AUDIENCES,
  DELIVERY_MODES,
  DURATION_UNITS,
  PROGRAMME_LEVELS,
  PROGRAMME_STATUSES,
} from '../models/Programme.js';
import { booleanQuery, i18nText, i18nTextRequired, objectId, paginationQuery, stringList } from './common.js';

const intake = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional().nullable(),
    seats: z.number().int().min(0).max(100000).optional().nullable(),
    location: z.string().trim().max(200).optional(),
  })
  .refine((i) => !i.endDate || i.endDate >= i.startDate, { message: 'END_BEFORE_START', path: ['endDate'] });

/**
 * No `.default()`s here on purpose: the update schema is `.partial()` and Zod 4 would apply inner
 * defaults to omitted fields, silently resetting them. Defaults are applied in programme.service on create.
 */
const shape = {
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9-]{1,29}$/, 'INVALID_CODE'),
  title: i18nTextRequired(200),
  shortDescription: i18nText(400),
  description: i18nText(8000),
  category: z.string().trim().min(1).max(60),
  level: z.enum(PROGRAMME_LEVELS),
  durationValue: z.number().positive().max(10000).nullable(),
  durationUnit: z.enum(DURATION_UNITS).nullable(),
  deliveryMode: z.enum(DELIVERY_MODES).nullable(),
  language: z.array(z.enum(['en', 'es'])).min(1).max(2),
  prerequisites: z.array(objectId).max(20),
  prerequisiteText: i18nText(1000),
  skillsGained: stringList(40, 100),
  targetAudience: z.array(z.enum(AUDIENCES)).min(1).max(2),
  targetDepartments: stringList(30, 80),
  price: z.object({
    amount: z.number().min(0).max(1_000_000).nullable().optional(),
    currency: z.string().trim().toUpperCase().length(3).optional(),
  }),
  intakes: z.array(intake).max(50),
  tags: stringList(40, 60),
  customFields: z.record(z.string(), z.unknown()),
  status: z.enum(PROGRAMME_STATUSES),
};

export const createProgrammeSchema = z.object(shape).partial().required({ title: true, category: true, level: true });

export const updateProgrammeSchema = z
  .object(shape)
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'NOTHING_TO_UPDATE' });

export const programmeStatusSchema = z.object({ status: z.enum(PROGRAMME_STATUSES) });

export const listProgrammesQuery = z.object({
  category: z.string().trim().max(60).optional(),
  level: z.enum(PROGRAMME_LEVELS).optional(),
  mode: z.enum(DELIVERY_MODES).optional(),
  lang: z.enum(['en', 'es']).optional(),
  audience: z.enum(AUDIENCES).optional(),
  search: z.string().trim().max(100).optional(),
  ...paginationQuery,
});

export const adminListProgrammesQuery = listProgrammesQuery.extend({
  status: z.enum(PROGRAMME_STATUSES).optional(),
  all: booleanQuery, // all=true → no pagination (e.g. prerequisite picker)
  limit: z.coerce.number().int().min(1).max(200).default(20),
});
