import { z } from 'zod';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'INVALID_ID');

/** Bilingual text `{ en, es }`. Both keys optional; missing ones become ''. */
export const i18nText = (max = 2000) =>
  z.object({
    en: z.string().trim().max(max).optional().transform((v) => v ?? ''),
    es: z.string().trim().max(max).optional().transform((v) => v ?? ''),
  });

/** Bilingual text where at least one language must be filled in. */
export const i18nTextRequired = (max = 2000) =>
  i18nText(max).refine((v) => v.en || v.es, { message: 'I18N_TEXT_REQUIRED' });

/** List of short trimmed strings, empty values removed, duplicates removed. */
export const stringList = (maxItems = 50, maxLen = 100) =>
  z
    .array(z.string().trim().max(maxLen))
    .max(maxItems)
    .transform((arr) => [...new Set(arr.filter(Boolean))]);

export const paginationQuery = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
};

export const booleanQuery = z
  .enum(['true', 'false'])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === 'true'));

/** Bilingual list `{ en: [String], es: [String] }`; blank items removed. */
export const i18nList = (maxItems = 50, maxLen = 500) => {
  const list = z
    .array(z.string().trim().max(maxLen))
    .max(maxItems)
    .optional()
    .transform((arr) => (arr ?? []).filter(Boolean));
  return z.object({ en: list, es: list });
};
