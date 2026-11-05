import { asyncHandler } from '../middleware/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as svc from '../services/stats.service.js';

export const publicStats = asyncHandler(async (_req, res) => {
  sendSuccess(res, await svc.publicStats());
});
