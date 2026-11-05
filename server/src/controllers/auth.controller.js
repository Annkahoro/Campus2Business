import { asyncHandler } from '../middleware/asyncHandler.js';
import { sendCreated, sendSuccess } from '../utils/response.js';
import * as authService from '../services/auth.service.js';

export const register = asyncHandler(async (req, res) => {
  sendCreated(res, await authService.registerStudent(req.body));
});

export const registerOrgAdmin = asyncHandler(async (req, res) => {
  sendCreated(res, await authService.registerOrgAdmin(req.body));
});

export const registerEmployee = asyncHandler(async (req, res) => {
  sendCreated(res, await authService.registerEmployee(req.body));
});

export const login = asyncHandler(async (req, res) => {
  sendSuccess(res, await authService.login(req.body));
});

export const google = asyncHandler(async (req, res) => {
  const result = await authService.googleLogin(req.body);
  sendSuccess(res, result, { status: result.isNew ? 201 : 200 });
});

export const getMe = asyncHandler(async (req, res) => {
  sendSuccess(res, await authService.getMe(req.user));
});

export const updateMe = asyncHandler(async (req, res) => {
  sendSuccess(res, { user: await authService.updateMe(req.user, req.body) });
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  sendSuccess(res, { user: await authService.uploadAvatar(req.user, req.file) });
});

export const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user._id, req.body);
  sendSuccess(res, undefined, { message: 'Password updated' });
});
