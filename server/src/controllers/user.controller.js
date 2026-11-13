import { asyncHandler } from '../middleware/asyncHandler.js';
import { sendCreated, sendSuccess } from '../utils/response.js';
import * as userService from '../services/user.service.js';

/* C2B admins */
export const listAdmins = asyncHandler(async (_req, res) => {
  sendSuccess(res, await userService.listAdmins());
});

export const createAdmin = asyncHandler(async (req, res) => {
  sendCreated(res, await userService.createAdmin(req.body));
});

export const updateAdmin = asyncHandler(async (req, res) => {
  sendSuccess(res, await userService.updateAdmin(req.user, req.params.id, req.body));
});

export const deleteAdmin = asyncHandler(async (req, res) => {
  await userService.deleteAdmin(req.user, req.params.id);
  sendSuccess(res, undefined, { message: 'Admin deleted' });
});

/* Learners */
export const createLearner = asyncHandler(async (req, res) => {
  sendCreated(res, await userService.createLearner(req.user, req.body));
});

export const updateLearner = asyncHandler(async (req, res) => {
  sendSuccess(res, await userService.updateLearner(req.user, req.params.userId, req.body));
});

export const deleteLearner = asyncHandler(async (req, res) => {
  await userService.deleteLearner(req.user, req.params.userId);
  sendSuccess(res, undefined, { message: 'Learner deleted' });
});

export const bulkDeleteLearners = asyncHandler(async (req, res) => {
  sendSuccess(res, await userService.bulkDeleteLearners(req.user, req.body));
});
