import { asyncHandler } from '../middleware/asyncHandler.js';
import { sendCreated, sendSuccess } from '../utils/response.js';
import * as svc from '../services/orgEmployee.service.js';

export const list = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.list(req.org, req.validatedQuery));
});

export const detail = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.detail(req.employee));
});

export const addRemark = asyncHandler(async (req, res) => {
  sendCreated(res, await svc.addRemark(req.employee, req.user, req.body));
});

export const updateRemark = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.updateRemark(req.employee, req.user, req.params.remarkId, req.body));
});

export const deleteRemark = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.deleteRemark(req.employee, req.user, req.params.remarkId));
});

export const submit = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.submit(req.org, req.employee, req.user));
});

export const submitBulk = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.submitBulk(req.org, req.user, req.body.employeeIds));
});

export const deactivate = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.deactivate(req.employee, req.user));
});
