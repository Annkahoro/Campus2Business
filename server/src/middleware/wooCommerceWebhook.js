import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Checks that a request really comes from the campus2b.com shop (WooCommerce webhook).
 * Runs after express.raw(): WooCommerce signs the exact bytes it sends —
 * X-WC-Webhook-Signature = base64( HMAC-SHA256( raw body, webhook secret ) ).
 *
 * The ping WooCommerce sends when the webhook is saved ("webhook_id=12", unsigned) is answered with 200,
 * otherwise WooCommerce refuses to save the webhook. A ping changes nothing.
 */
export function verifyWooCommerceWebhook(req, _res, next) {
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  const signature = req.get('x-wc-webhook-signature');

  if (!signature && /^webhook_id=\d+$/.test(raw.toString('utf8').trim())) {
    req.wooPing = true;
    return next();
  }

  const secret = env.WOOCOMMERCE_WEBHOOK_SECRET;
  if (!secret) return next(new ApiError(503, 'WEBHOOK_NOT_CONFIGURED', 'WooCommerce webhook secret is not set'));
  if (!signature) return next(ApiError.unauthorized('WEBHOOK_SIGNATURE_INVALID', 'Missing webhook signature'));

  const expected = Buffer.from(crypto.createHmac('sha256', secret).update(raw).digest('base64'));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
    return next(ApiError.unauthorized('WEBHOOK_SIGNATURE_INVALID', 'Invalid webhook signature'));
  }

  try {
    req.body = JSON.parse(raw.toString('utf8'));
  } catch {
    return next(ApiError.badRequest('VALIDATION_ERROR', 'Webhook body is not JSON'));
  }
  return next();
}
