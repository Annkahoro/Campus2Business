import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('INVALID_EMAIL').max(254);
const name = z.string().trim().min(2, 'NAME_TOO_SHORT').max(120);

/** Minimum 8 characters, at least 1 letter and 1 number (docs/04 §1). */
export const passwordSchema = z
  .string()
  .min(8, 'PASSWORD_TOO_SHORT')
  .max(128)
  .regex(/[A-Za-z]/, 'PASSWORD_NEEDS_LETTER')
  .regex(/\d/, 'PASSWORD_NEEDS_NUMBER');

export const registerSchema = z.object({
  name,
  email,
  password: passwordSchema,
  preferredLanguage: z.enum(['en', 'es']).optional(),
});

export const registerEmployeeSchema = registerSchema.extend({
  inviteToken: z.string().trim().min(1),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});

export const googleSchema = z
  .object({
    credential: z.string().min(1),
    intent: z.enum(['login', 'student', 'employee', 'org_admin']).default('login'),
    inviteToken: z.string().trim().min(1).optional(),
    preferredLanguage: z.enum(['en', 'es']).optional(),
  })
  .refine((v) => v.intent !== 'employee' || !!v.inviteToken, {
    message: 'INVITE_TOKEN_REQUIRED',
    path: ['inviteToken'],
  });

export const updateMeSchema = z
  .object({
    name: name.optional(),
    preferredLanguage: z.enum(['en', 'es']).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'NOTHING_TO_UPDATE' });

export const changePasswordSchema = z.object({
  currentPassword: z.string().max(128).optional(), // optional for Google-only users setting a first password
  newPassword: passwordSchema,
});
