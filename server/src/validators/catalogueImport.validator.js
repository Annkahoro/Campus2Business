import { z } from 'zod';
import { booleanQuery, objectId } from './common.js';
import { isCourseUrl } from '../services/import/campus2b.scraper.js';

export const importPreviewQuery = z.object({
  fresh: booleanQuery, // true = re-read campus2b.com instead of the 10-minute cache
});

// Only campus2b.com course pages are accepted, so the server can never be pointed at another host.
const courseUrl = z.string().trim().max(500).refine(isCourseUrl, 'INVALID_IMPORT_URL');

const importItem = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), url: courseUrl }),
  z.object({ action: z.literal('merge'), url: courseUrl, programmeId: objectId }),
  z.object({ action: z.literal('ignore'), url: courseUrl, title: z.string().trim().max(300).optional() }),
]);

export const applyImportSchema = z.object({
  items: z
    .array(importItem)
    .min(1, 'REQUIRED')
    .max(60)
    .refine((items) => new Set(items.map((i) => i.url.replace(/\/?$/, '/'))).size === items.length, 'DUPLICATE_ITEMS'),
});
