import { asyncHandler } from '../middleware/asyncHandler.js';
import { sendCreated, sendSuccess } from '../utils/response.js';
import * as userService from '../services/user.service.js';

export const listAdmins = asyncHandler(async (_req, res) => {
  sendSuccess(res, await userService.listAdmins());
});

export const createAdmin = asyncHandler(async (req, res) => {
  sendCreated(res, await userService.createAdmin(req.body));
});
