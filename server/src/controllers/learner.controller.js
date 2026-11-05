import { asyncHandler } from '../middleware/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as svc from '../services/learner.service.js';

export const list = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.list(req.validatedQuery));
});

export const detail = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.detail(req.params.userId));
});
