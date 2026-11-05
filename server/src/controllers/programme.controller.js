import { asyncHandler } from '../middleware/asyncHandler.js';
import { sendCreated, sendSuccess } from '../utils/response.js';
import * as programmeService from '../services/programme.service.js';

/* Public / learner catalogue */
export const listPublished = asyncHandler(async (req, res) => {
  sendSuccess(res, await programmeService.listPublished(req.validatedQuery, req.user));
});

export const getOne = asyncHandler(async (req, res) => {
  sendSuccess(res, await programmeService.getForViewer(req.params.id, req.user));
});

export const listCategories = asyncHandler(async (_req, res) => {
  sendSuccess(res, await programmeService.listCategories());
});

/* Admin */
export const adminList = asyncHandler(async (req, res) => {
  sendSuccess(res, await programmeService.adminList(req.validatedQuery));
});

export const create = asyncHandler(async (req, res) => {
  sendCreated(res, await programmeService.create(req.body, req.user._id));
});

export const update = asyncHandler(async (req, res) => {
  sendSuccess(res, await programmeService.update(req.params.id, req.body));
});

export const setStatus = asyncHandler(async (req, res) => {
  sendSuccess(res, await programmeService.setStatus(req.params.id, req.body.status));
});

export const uploadCover = asyncHandler(async (req, res) => {
  sendSuccess(res, await programmeService.uploadCover(req.params.id, req.file));
});

export const remove = asyncHandler(async (req, res) => {
  sendSuccess(res, await programmeService.remove(req.params.id));
});
