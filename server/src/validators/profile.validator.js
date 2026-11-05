import { z } from 'zod';
import {
  BUDGET_RANGES,
  GENDERS,
  LANGUAGE_LEVELS,
  LEARNING_MODES,
  SKILL_CATEGORIES,
} from '../models/LearnerProfile.js';
import { stringList } from './common.js';

/**
 * One schema per wizard step (PATCH /profile/me/:step). Each step replaces its own fields wholesale
 * (arrays included), which keeps autosave simple and idempotent.
 */

const str = (max) => z.string().trim().max(max).optional().default('');
const year = z.number().int().min(1950).max(2100).nullable().optional();
const optNum = (min, max) => z.number().min(min).max(max).nullable().optional();
const urlOrEmpty = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), 'INVALID_URL')
  .optional()
  .default('');
const optDate = z
  .union([z.coerce.date(), z.literal(''), z.null()])
  .optional()
  .transform((v) => (v === '' || v === undefined ? null : v));

export const personalSchema = z.object({
  phone: str(30),
  dateOfBirth: optDate.refine((d) => !d || d < new Date(), 'DATE_IN_FUTURE'),
  gender: z.enum(GENDERS).nullable().optional(),
  country: str(80),
  city: str(80),
  languages: z
    .array(z.object({ name: z.string().trim().min(1).max(60), level: z.enum(LANGUAGE_LEVELS) }))
    .max(15)
    .default([]),
  bio: str(1000),
});

export const educationSchema = z.object({
  education: z
    .array(
      z
        .object({
          institution: z.string().trim().min(1, 'REQUIRED').max(150),
          qualification: str(100),
          fieldOfStudy: str(120),
          startYear: year,
          endYear: year,
          currentYearOfStudy: z.number().int().min(1).max(10).nullable().optional(),
          grade: str(40),
          keyCourses: stringList(30, 100).default([]),
        })
        .refine((e) => !e.startYear || !e.endYear || e.endYear >= e.startYear, {
          message: 'END_BEFORE_START',
          path: ['endYear'],
        }),
    )
    .max(10)
    .default([]),
  certifications: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'REQUIRED').max(150),
        issuer: str(120),
        year,
        credentialUrl: urlOrEmpty,
      }),
    )
    .max(20)
    .default([]),
});

export const employmentSchema = z.object({
  employment: z
    .object({
      department: str(80),
      jobTitle: str(120),
      yearsInRole: optNum(0, 60),
      totalYearsExperience: optNum(0, 60),
      responsibilities: str(2000),
      managesPeople: z.boolean().optional().default(false),
    })
    .default({}),
  pastExperience: z
    .array(
      z
        .object({
          company: z.string().trim().min(1, 'REQUIRED').max(150),
          title: str(120),
          startYear: year,
          endYear: year,
          summary: str(1000),
        })
        .refine((e) => !e.startYear || !e.endYear || e.endYear >= e.startYear, {
          message: 'END_BEFORE_START',
          path: ['endYear'],
        }),
    )
    .max(15)
    .default([]),
});

export const skillsSchema = z.object({
  skills: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'REQUIRED').max(80),
        category: z.enum(SKILL_CATEGORIES),
        level: z.number().int().min(1).max(5),
      }),
    )
    .max(50)
    .refine((s) => new Set(s.map((x) => x.name.toLowerCase())).size === s.length, 'DUPLICATE_SKILL')
    .default([]),
});

export const goalsSchema = z.object({
  hobbies: stringList(20, 60).default([]),
  interests: stringList(30, 80).default([]),
  careerGoals: z
    .object({
      shortTerm: str(1000),
      longTerm: str(1000),
      targetRoles: stringList(10, 100).default([]),
    })
    .default({}),
  learningPreferences: z
    .object({
      mode: z.enum(LEARNING_MODES).optional().default('any'),
      hoursPerWeek: optNum(0, 80),
      preferredLanguage: z.enum(['en', 'es', 'any']).optional().default('any'),
      budgetRange: z.enum(BUDGET_RANGES).nullable().optional(),
      preferredStart: optDate,
    })
    .default({}),
});

export const STEP_SCHEMAS = {
  personal: personalSchema,
  education: educationSchema,
  employment: employmentSchema,
  skills: skillsSchema,
  goals: goalsSchema,
};
