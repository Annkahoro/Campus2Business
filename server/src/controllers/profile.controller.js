import { asyncHandler } from '../middleware/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as profileService from '../services/profile.service.js';

export const getMe = asyncHandler(async (req, res) => {
  sendSuccess(res, await profileService.getMyProfile(req.user));
});

export const updateStep = asyncHandler(async (req, res) => {
  sendSuccess(res, await profileService.updateStep(req.user, req.params.step, req.body));
});

export const uploadCv = asyncHandler(async (req, res) => {
  sendSuccess(res, await profileService.uploadCv(req.user, req.file));
});

export const deleteCv = asyncHandler(async (req, res) => {
  sendSuccess(res, await profileService.deleteCv(req.user));
});

export const submit = asyncHandler(async (req, res) => {
  sendSuccess(res, await profileService.submitOwnProfile(req.user), { message: 'Profile submitted' });
});
