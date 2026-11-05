import { asyncHandler } from '../middleware/asyncHandler.js';
import { sendCreated, sendSuccess } from '../utils/response.js';
import { ROLES } from '../models/_shared.js';
import * as fieldService from '../services/programmeField.service.js';

/** GET /programme-fields — read-only definitions for rendering. */
export const listForRendering = asyncHandler(async (req, res) => {
  sendSuccess(res, await fieldService.listForRendering({ isAdmin: req.user?.role === ROLES.C2B_ADMIN }));
});

export const listAll = asyncHandler(async (_req, res) => {
  sendSuccess(res, await fieldService.listAll());
});

export const create = asyncHandler(async (req, res) => {
  sendCreated(res, await fieldService.create(req.body));
});

export const update = asyncHandler(async (req, res) => {
  sendSuccess(res, await fieldService.update(req.params.id, req.body));
});

export const reorder = asyncHandler(async (req, res) => {
  sendSuccess(res, await fieldService.reorder(req.body.ids));
});

export const deactivate = asyncHandler(async (req, res) => {
  sendSuccess(res, await fieldService.deactivate(req.params.id));
});
