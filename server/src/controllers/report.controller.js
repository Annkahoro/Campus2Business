import { asyncHandler } from '../middleware/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as svc from '../services/report.service.js';

export const adminOverview = asyncHandler(async (_req, res) => {
  sendSuccess(res, await svc.adminOverview());
});

export const orgOverview = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.orgOverview(req.org));
});

export const orgSkillGaps = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.orgSkillGaps(req.org));
});

export const getOrgAiSummary = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.getOrgAiSummary(req.org));
});

export const createOrgAiSummary = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.createOrgAiSummary(req.org, req.body));
});
