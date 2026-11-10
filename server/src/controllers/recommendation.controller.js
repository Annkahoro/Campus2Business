import { asyncHandler } from '../middleware/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as svc from '../services/recommendation.service.js';

/* ───────── admin ───────── */

export const list = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.listQueue(req.validatedQuery));
});

export const generate = asyncHandler(async (req, res) => {
  // 202: generation continues in the background; the queue shows the result.
  sendSuccess(res, await svc.startGeneration(req.user, req.params.userId), { status: 202 });
});

export const generateBulk = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.startBulkGeneration(req.user, req.body.userIds), { status: 202 });
});

export const get = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.getForAdmin(req.params.id));
});

export const update = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.updateFinal(req.user, req.params.id, req.body));
});

export const approve = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.approve(req.user, req.params.id));
});

export const publish = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.publish(req.user, req.params.id));
});

export const reject = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.reject(req.user, req.params.id, req.body));
});

export const translate = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.translateMissing(req.user, req.params.id));
});

/* ───────── learner ───────── */

export const myRecommendation = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.getPublishedForLearner(req.user._id));
});

export const myFeedback = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.saveFeedback(req.user._id, req.body));
});

/* ───────── org admin ───────── */

export const employeeRecommendation = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.getPublishedForEmployee(req.employee._id));
});

export const adminDelete = asyncHandler(async (req, res) => {
  await svc.adminDelete(req.user, req.params.id);
  sendSuccess(res, undefined, { message: 'Recommendation deleted' });
});
