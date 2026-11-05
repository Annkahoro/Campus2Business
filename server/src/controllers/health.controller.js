import { asyncHandler } from '../middleware/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { dbState } from '../config/db.js';
import { env } from '../config/env.js';

export const getHealth = asyncHandler(async (_req, res) => {
  sendSuccess(res, {
    status: 'ok',
    env: env.NODE_ENV,
    db: dbState(),
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
