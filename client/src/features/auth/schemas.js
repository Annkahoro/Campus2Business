import { z } from 'zod';

// Messages are i18n keys (common namespace), rendered with t() by <Field>.
const email = z.string().trim().min(1, 'validation.required').email('validation.emailInvalid');

export const passwordRule = z
  .string()
  .min(8, 'validation.passwordTooShort')
  .regex(/[A-Za-z]/, 'validation.passwordNeedsLetter')
  .regex(/\d/, 'validation.passwordNeedsNumber');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'validation.required'),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'validation.nameTooShort'),
    email,
    password: passwordRule,
    confirmPassword: z.string().min(1, 'validation.required'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'validation.passwordsMismatch',
    path: ['confirmPassword'],
  });
