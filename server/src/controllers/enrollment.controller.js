import { asyncHandler } from '../middleware/asyncHandler.js';
import { sendCreated, sendSuccess } from '../utils/response.js';
import * as svc from '../services/enrollment.service.js';

export const request = asyncHandler(async (req, res) => {
  sendCreated(res, await svc.requestEnrollment(req.user, req.body));
});

export const mine = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.listMine(req.user));
});

export const pay = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.pay(req.user, req.params.id, req.body));
});

export const rate = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.rate(req.user, req.params.id, req.body));
});

export const orgList = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.listForOrg(req.org, req.validatedQuery));
});

export const adminList = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.adminList(req.validatedQuery));
});

export const adminSetStatus = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.adminSetStatus(req.user, req.params.id, req.body));
});

export const adminSetProgress = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.adminSetProgress(req.user, req.params.id, req.body));
});
