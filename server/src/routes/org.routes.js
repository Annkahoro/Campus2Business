import { Router } from 'express';
import * as inviteCtrl from '../controllers/invite.controller.js';
import * as empCtrl from '../controllers/orgEmployee.controller.js';
import { protect } from '../middleware/protect.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { loadOrg, orgScope, requireApprovedOrg } from '../middleware/orgScope.js';
import { ROLES } from '../models/_shared.js';
import * as recCtrl from '../controllers/recommendation.controller.js';
import * as enrollCtrl from '../controllers/enrollment.controller.js';
import * as reportCtrl from '../controllers/report.controller.js';
import { orgAiSummarySchema } from '../validators/report.validator.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { orgListEnrollmentsQuery } from '../validators/enrollment.validator.js';
import {
  bulkSubmitSchema,
  createInviteSchema,
  listEmployeesQuery,
  remarkSchema,
  updateInviteSchema,
  updateEmployeeSchema,
  updateRemarkSchema,
} from '../validators/organization.validator.js';

/** /org — org admin area, always scoped to req.user's own organization. */
const router = Router();

router.use(protect, authorize(ROLES.ORG_ADMIN), loadOrg);

/* Invite links (approved orgs only) */
router.get('/invites', requireApprovedOrg, inviteCtrl.list);
router.post('/invites', requireApprovedOrg, validate(createInviteSchema), inviteCtrl.create);
router.patch('/invites/:id', requireApprovedOrg, validate(updateInviteSchema), inviteCtrl.update);
router.post('/invites/:id/regenerate', requireApprovedOrg, inviteCtrl.regenerate);
router.delete('/invites/:id', requireApprovedOrg, inviteCtrl.remove);

/* Employees — /submit-bulk must come before /:employeeId */
router.get('/employees', validate(listEmployeesQuery, 'query'), empCtrl.list);
router.post('/employees/submit-bulk', validate(bulkSubmitSchema), empCtrl.submitBulk);
router.get('/employees/:employeeId', orgScope, empCtrl.detail);
router.post('/employees/:employeeId/remarks', orgScope, validate(remarkSchema), empCtrl.addRemark);
router.patch('/employees/:employeeId/remarks/:remarkId', orgScope, validate(updateRemarkSchema), empCtrl.updateRemark);
router.delete('/employees/:employeeId/remarks/:remarkId', orgScope, empCtrl.deleteRemark);
router.post('/employees/:employeeId/submit', orgScope, empCtrl.submit);
router.patch('/employees/:employeeId/deactivate', orgScope, empCtrl.deactivate);
router.patch('/employees/:employeeId', orgScope, validate(updateEmployeeSchema), empCtrl.update);
router.delete('/employees/:employeeId', orgScope, empCtrl.remove);
router.get('/employees/:employeeId/recommendation', orgScope, recCtrl.employeeRecommendation);

/* Enrollments of own employees (paying for them goes through POST /enrollments/:id/pay) */
router.get('/enrollments', validate(orgListEnrollmentsQuery, 'query'), enrollCtrl.orgList);

/* Reports — own organization only, aggregated (no names in the AI summary) */
router.get('/reports/overview', reportCtrl.orgOverview);
router.get('/reports/skill-gaps', reportCtrl.orgSkillGaps);
router.get('/reports/ai-summary', reportCtrl.getOrgAiSummary);
router.post('/reports/ai-summary', requireApprovedOrg, aiLimiter, validate(orgAiSummarySchema), reportCtrl.createOrgAiSummary);

export default router;
