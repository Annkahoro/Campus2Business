import express, { Router } from 'express';
import * as ctrl from '../controllers/webhook.controller.js';
import { verifyWooCommerceWebhook } from '../middleware/wooCommerceWebhook.js';
import { webhookLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { wooOrderWebhookSchema } from '../validators/webhook.validator.js';

/**
 * /api/webhooks — calls from other systems, no user token. Mounted in app.js BEFORE express.json():
 * the signature is checked against the raw request bytes.
 */
const router = Router();

/** Only order webhooks are used; anything else (a wrong topic chosen in WooCommerce) is acknowledged and ignored. */
const orderOnly = (req, res, next) => {
  if (req.wooPing) return next();
  const resource = req.get('x-wc-webhook-resource');
  if (resource && resource !== 'order') {
    req.wooIgnored = true;
    return next();
  }
  return validate(wooOrderWebhookSchema)(req, res, next);
};

router.post(
  '/woocommerce',
  webhookLimiter,
  express.raw({ type: () => true, limit: '2mb' }),
  verifyWooCommerceWebhook,
  orderOnly,
  ctrl.woocommerce,
);

export default router;
