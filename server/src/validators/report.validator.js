import { z } from 'zod';

export const orgAiSummarySchema = z.object({ refresh: z.boolean().optional().default(false) });
