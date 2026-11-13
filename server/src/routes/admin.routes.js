import { Router } from 'express';
import { protect } from '../middleware/protect.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { requireFile, uploadImage } from '../middleware/upload.js';
import { ROLES } from '../models/_shared.js';
import * as userCtrl from '../controllers/user.controller.js';
import * as programmeCtrl from '../controllers/programme.controller.js';
import * as fieldCtrl from '../controllers/programmeField.controller.js';
import * as categoryCtrl from '../controllers/category.controller.js';
import * as importCtrl from '../controllers/catalogueImport.controller.js';
import { applyImportSchema, importPreviewQuery } from '../validators/catalogueImport.validator.js';
import { createCategorySchema, reorderCategoriesSchema, updateCategorySchema } from '../validators/category.validator.js';
import { adminUpdateUserSchema, bulkDeleteLearnersSchema, createAdminSchema, createLearnerSchema } from '../validators/user.validator.js';
import {
  adminListProgrammesQuery,
  createProgrammeSchema,
  programmeStatusSchema,
  updateProgrammeSchema,
} from '../validators/programme.validator.js';
import { createFieldSchema, reorderFieldsSchema, updateFieldSchema } from '../validators/programmeField.validator.js';
import * as orgCtrl from '../controllers/organization.controller.js';
import { adminCreateOrgSchema, adminListOrgsQuery, bulkOrgSchema, rejectOrgSchema, updateOrgSchema } from '../validators/organization.validator.js';
import * as learnerCtrl from '../controllers/learner.controller.js';
import * as recCtrl from '../controllers/recommendation.controller.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import * as enrollCtrl from '../controllers/enrollment.controller.js';
import * as reportCtrl from '../controllers/report.controller.js';
import { adminListEnrollmentsQuery, adminProgressSchema, adminStatusSchema } from '../validators/enrollment.validator.js';
import {
  bulkGenerateSchema,
  listLearnersQuery,
  listRecommendationsQuery,
  rejectRecommendationSchema,
  updateRecommendationSchema,
} from '../validators/recommendation.validator.js';

const router = Router();

// Every /admin route requires a logged-in C2B admin.
router.use(protect, authorize(ROLES.C2B_ADMIN));

/* Admin users */
router.get('/users', userCtrl.listAdmins);
router.post('/users', validate(createAdminSchema), userCtrl.createAdmin);
router.patch('/users/:id', validate(adminUpdateUserSchema), userCtrl.updateAdmin);
router.delete('/users/:id', userCtrl.deleteAdmin);

/* Programmes */
// Import from campus2b.com — before the /programmes/:id routes
router.get('/programmes/import/preview', validate(importPreviewQuery, 'query'), importCtrl.preview);
router.post('/programmes/import', validate(applyImportSchema), importCtrl.apply);
router.delete('/programmes/import/ignored/:id', importCtrl.restoreIgnored);
router.get('/programmes', validate(adminListProgrammesQuery, 'query'), programmeCtrl.adminList);
router.post('/programmes', validate(createProgrammeSchema), programmeCtrl.create);
router.patch('/programmes/:id', validate(updateProgrammeSchema), programmeCtrl.update);
router.patch('/programmes/:id/status', validate(programmeStatusSchema), programmeCtrl.setStatus);
router.post('/programmes/:id/cover', uploadImage, requireFile, programmeCtrl.uploadCover);
router.delete('/programmes/:id', programmeCtrl.remove);

/* Programme custom fields — /reorder must come before /:id */
router.get('/programme-fields', fieldCtrl.listAll);
router.post('/programme-fields', validate(createFieldSchema), fieldCtrl.create);
router.patch('/programme-fields/reorder', validate(reorderFieldsSchema), fieldCtrl.reorder);
router.patch('/programme-fields/:id', validate(updateFieldSchema), fieldCtrl.update);
router.delete('/programme-fields/:id', fieldCtrl.deactivate);

/* Programme categories — /reorder must come before /:id */
router.get('/categories', categoryCtrl.listAll);
router.post('/categories', validate(createCategorySchema), categoryCtrl.create);
router.patch('/categories/reorder', validate(reorderCategoriesSchema), categoryCtrl.reorder);
router.patch('/categories/:id', validate(updateCategorySchema), categoryCtrl.update);
router.delete('/categories/:id', categoryCtrl.remove);

/* Organizations */
router.get('/organizations', validate(adminListOrgsQuery, 'query'), orgCtrl.adminList);
router.post('/organizations', validate(adminCreateOrgSchema), orgCtrl.adminCreate);
router.post('/organizations/bulk', validate(bulkOrgSchema), orgCtrl.bulkAction);
router.get('/organizations/:id', orgCtrl.adminGet);
router.patch('/organizations/:id', validate(updateOrgSchema), orgCtrl.adminUpdate);
router.delete('/organizations/:id', orgCtrl.adminDelete);
router.patch('/organizations/:id/approve', orgCtrl.approve);
router.patch('/organizations/:id/reject', validate(rejectOrgSchema), orgCtrl.reject);
router.patch('/organizations/:id/suspend', orgCtrl.suspend);

/* Learners */
router.get('/learners', validate(listLearnersQuery, 'query'), learnerCtrl.list);
router.post('/learners', validate(createLearnerSchema), userCtrl.createLearner);
router.post('/learners/bulk-delete', validate(bulkDeleteLearnersSchema), userCtrl.bulkDeleteLearners);
router.get('/learners/:userId', learnerCtrl.detail);
router.patch('/learners/:userId', validate(adminUpdateUserSchema), userCtrl.updateLearner);
router.delete('/learners/:userId', userCtrl.deleteLearner);

/* Recommendations — generate routes are rate-limited (docs/06 §11); generate-bulk before /:id */
router.get('/recommendations', validate(listRecommendationsQuery, 'query'), recCtrl.list);
router.post('/recommendations/generate-bulk', aiLimiter, validate(bulkGenerateSchema), recCtrl.generateBulk);
router.post('/recommendations/generate/:userId', aiLimiter, recCtrl.generate);
router.get('/recommendations/:id', recCtrl.get);
router.patch('/recommendations/:id', validate(updateRecommendationSchema), recCtrl.update);
router.post('/recommendations/:id/approve', recCtrl.approve);
router.post('/recommendations/:id/publish', recCtrl.publish);
router.post('/recommendations/:id/reject', validate(rejectRecommendationSchema), recCtrl.reject);
router.post('/recommendations/:id/translate', aiLimiter, recCtrl.translate);
router.delete('/recommendations/:id', recCtrl.adminDelete);

/* Enrollments */
router.get('/enrollments', validate(adminListEnrollmentsQuery, 'query'), enrollCtrl.adminList);
router.patch('/enrollments/:id/status', validate(adminStatusSchema), enrollCtrl.adminSetStatus);
router.patch('/enrollments/:id/progress', validate(adminProgressSchema), enrollCtrl.adminSetProgress);
router.delete('/enrollments/:id', enrollCtrl.adminDelete);

/* Reports */
router.get('/reports/overview', reportCtrl.adminOverview);

export default router;
