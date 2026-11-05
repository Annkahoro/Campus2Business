import { asyncHandler } from '../middleware/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as svc from '../services/notification.service.js';

export const list = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.listMine(req.user, req.validatedQuery));
});

export const markRead = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.markRead(req.user, req.params.id));
});

export const markAllRead = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.markAllRead(req.user));
});
