import { z } from 'zod';
import { passwordSchema } from './auth.validator.js';
import { objectId } from './common.js';

const name = z.string().trim().min(2, 'NAME_TOO_SHORT').max(120);
const email = z.string().trim().toLowerCase().email('INVALID_EMAIL').max(254);

/** POST /admin/users — an existing C2B admin creates another C2B admin (docs/04 §6). */
export const createAdminSchema = z.object({
  name,
  email,
  password: passwordSchema,
  preferredLanguage: z.enum(['en', 'es']).optional(),
});

/** POST /admin/learners — C2B admin creates a student account. */
export const createLearnerSchema = createAdminSchema;

/** PATCH /admin/users/:id and PATCH /admin/learners/:userId */
export const adminUpdateUserSchema = z
  .object({
    name,
    email,
    preferredLanguage: z.enum(['en', 'es']),
    isActive: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'NOTHING_TO_UPDATE' });

/** DELETE /auth/me — local accounts confirm with their password; Google-only accounts send nothing. */
export const bulkDeleteLearnersSchema = z
  .object({
    userIds: z.array(objectId).min(1).max(500).optional(),
    filter: z
      .object({
        type: z.enum(['student', 'employee']).optional(),
        status: z.string().trim().max(40).optional(),
        search: z.string().trim().max(100).optional(),
      })
      .optional(),
  })
  .refine((v) => !!v.userIds !== !!v.filter, { message: 'IDS_OR_FILTER', path: ['userIds'] });

export const deleteAccountSchema = z.object({
  password: z.string().max(128).optional(),
});
