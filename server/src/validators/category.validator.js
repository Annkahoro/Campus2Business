import { z } from 'zod';
import { CATEGORY_SLUG_REGEX } from '../models/Category.js';
import { i18nTextRequired, objectId } from './common.js';

export const createCategorySchema = z.object({
  slug: z.string().trim().toLowerCase().regex(CATEGORY_SLUG_REGEX, 'INVALID_CATEGORY_SLUG'),
  name: i18nTextRequired(80),
});

export const updateCategorySchema = z
  .object({
    name: i18nTextRequired(80),
    isActive: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'NOTHING_TO_UPDATE' });

export const reorderCategoriesSchema = z.object({ ids: z.array(objectId).min(1).max(200) });
