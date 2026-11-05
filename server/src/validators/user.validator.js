import { z } from 'zod';
import { passwordSchema } from './auth.validator.js';

/** POST /admin/users — an existing C2B admin creates another C2B admin (docs/04 §6). */
export const createAdminSchema = z.object({
  name: z.string().trim().min(2, 'NAME_TOO_SHORT').max(120),
  email: z.string().trim().toLowerCase().email('INVALID_EMAIL').max(254),
  password: passwordSchema,
  preferredLanguage: z.enum(['en', 'es']).optional(),
});
