import { asyncHandler } from '../middleware/asyncHandler.js';
import { sendCreated, sendSuccess } from '../utils/response.js';
import * as inviteService from '../services/invite.service.js';

export const validate = asyncHandler(async (req, res) => {
  sendSuccess(res, await inviteService.validateToken(req.params.token));
});

export const list = asyncHandler(async (req, res) => {
  sendSuccess(res, await inviteService.list(req.org._id));
});

export const create = asyncHandler(async (req, res) => {
  sendCreated(res, await inviteService.create(req.org, req.user, req.body));
});

export const update = asyncHandler(async (req, res) => {
  sendSuccess(res, await inviteService.update(req.org, req.params.id, req.body));
});

export const regenerate = asyncHandler(async (req, res) => {
  sendSuccess(res, await inviteService.regenerate(req.org, req.params.id));
});

export const remove = asyncHandler(async (req, res) => {
  sendSuccess(res, await inviteService.remove(req.org, req.params.id));
});
