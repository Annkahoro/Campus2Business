import { asyncHandler } from '../middleware/asyncHandler.js';
import { sendCreated, sendSuccess } from '../utils/response.js';
import * as orgService from '../services/organization.service.js';

/* Org admin */
export const create = asyncHandler(async (req, res) => {
  sendCreated(res, await orgService.createOrg(req.user, req.body));
});

export const getMine = asyncHandler(async (req, res) => {
  sendSuccess(res, await orgService.getMine(req.user)); // data: null when no org yet
});

export const updateMine = asyncHandler(async (req, res) => {
  sendSuccess(res, await orgService.updateMine(req.user, req.body));
});

export const uploadLogo = asyncHandler(async (req, res) => {
  sendSuccess(res, await orgService.uploadLogo(req.user, req.file));
});

/* C2B admin */
export const adminList = asyncHandler(async (req, res) => {
  sendSuccess(res, await orgService.adminList(req.validatedQuery));
});

export const adminGet = asyncHandler(async (req, res) => {
  sendSuccess(res, await orgService.adminGet(req.params.id));
});

export const approve = asyncHandler(async (req, res) => {
  sendSuccess(res, await orgService.approve(req.params.id, req.user));
});

export const reject = asyncHandler(async (req, res) => {
  sendSuccess(res, await orgService.reject(req.params.id, req.user, req.body.reason));
});

export const suspend = asyncHandler(async (req, res) => {
  sendSuccess(res, await orgService.suspend(req.params.id, req.user));
});

export const adminCreate = asyncHandler(async (req, res) => {
  sendCreated(res, await orgService.adminCreate(req.user, req.body));
});

export const adminUpdate = asyncHandler(async (req, res) => {
  sendSuccess(res, await orgService.adminUpdate(req.user, req.params.id, req.body));
});

export const adminDelete = asyncHandler(async (req, res) => {
  sendSuccess(res, await orgService.adminDelete(req.user, req.params.id), { message: 'Organization deleted' });
});
