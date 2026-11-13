import { asyncHandler } from '../middleware/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as importService from '../services/catalogueImport.service.js';

export const preview = asyncHandler(async (req, res) => {
  sendSuccess(res, await importService.preview({ fresh: !!req.validatedQuery.fresh }));
});

export const apply = asyncHandler(async (req, res) => {
  sendSuccess(res, await importService.applyImport(req.body.items, req.user._id));
});

export const restoreIgnored = asyncHandler(async (req, res) => {
  sendSuccess(res, await importService.restoreIgnored(req.params.id));
});
