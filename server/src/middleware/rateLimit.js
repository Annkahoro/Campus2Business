import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { sendError } from '../utils/response.js';

const handler = (_req, res) =>
  sendError(res, { status: 429, code: 'RATE_LIMITED', message: 'Too many requests, please try again later' });

/** Whole API: generous per-IP ceiling against floods and scraping (Phase 10). */
export const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler,
});

/** Stricter limit for login/registration endpoints (brute-force protection). */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler,
});

/** AI endpoints (docs/06 §11): 20 per minute per admin. */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  // Mounted after protect, so the limit is per admin; IP as a fallback.
  keyGenerator: (req) => (req.user ? `user:${req.user._id}` : ipKeyGenerator(req.ip)),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler,
});
