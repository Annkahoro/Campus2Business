import { asyncHandler } from '../middleware/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as wooService from '../services/shop/woocommerce.service.js';

/** POST /api/webhooks/woocommerce — always 2xx for accepted deliveries (WooCommerce disables failing webhooks). */
export const woocommerce = asyncHandler(async (req, res) => {
  if (req.wooPing) return sendSuccess(res, { received: true }, { message: 'pong' });
  if (req.wooIgnored) return sendSuccess(res, { ignored: true });
  return sendSuccess(res, await wooService.handleOrderWebhook(req.get('x-wc-webhook-topic') ?? '', req.body));
});
