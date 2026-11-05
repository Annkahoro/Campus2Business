import { z } from 'zod';
import { booleanQuery, paginationQuery } from './common.js';

export const listNotificationsQuery = z.object({
  unread: booleanQuery,
  ...paginationQuery,
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
