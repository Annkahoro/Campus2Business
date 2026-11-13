import { asyncHandler } from '../middleware/asyncHandler.js';
import { sendCreated, sendSuccess } from '../utils/response.js';
import * as categoryService from '../services/category.service.js';

/** GET /programmes/meta/categories — public. */
export const listPublic = asyncHandler(async (_req, res) => {
  sendSuccess(res, await categoryService.listPublic());
});

export const listAll = asyncHandler(async (_req, res) => {
  sendSuccess(res, await categoryService.listAll());
});

export const create = asyncHandler(async (req, res) => {
  sendCreated(res, await categoryService.create(req.body));
});

export const update = asyncHandler(async (req, res) => {
  sendSuccess(res, await categoryService.update(req.params.id, req.body));
});

export const reorder = asyncHandler(async (req, res) => {
  sendSuccess(res, await categoryService.reorder(req.body.ids));
});

export const remove = asyncHandler(async (req, res) => {
  sendSuccess(res, await categoryService.remove(req.params.id));
});
