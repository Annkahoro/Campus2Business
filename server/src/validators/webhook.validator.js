import { z } from 'zod';

/** Number fields arrive as strings in WooCommerce payloads ("400.00"). */
const num = z.coerce.number();

/**
 * The parts of a WooCommerce order (REST API v3 shape) the platform uses.
 * Other fields are allowed and ignored.
 */
export const wooOrderWebhookSchema = z
  .object({
    id: num.int().positive(),
    number: z.coerce.string().optional(),
    status: z.string().trim().min(1),
    currency: z.string().trim().max(3).optional(),
    total: num.optional(),
    date_paid_gmt: z.string().nullable().optional(),
    billing: z
      .object({
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        email: z.string().optional(),
      })
      .partial()
      .loose()
      .optional(),
    line_items: z
      .array(
        z
          .object({
            product_id: num.int(),
            name: z.string().optional(),
            quantity: num.optional(),
            total: num.optional(),
          })
          .loose(),
      )
      .default([]),
  })
  .loose();
