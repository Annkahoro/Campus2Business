import { Router } from 'express';
import * as ctrl from '../controllers/profile.controller.js';
import { protect } from '../middleware/protect.js';
import { authorize } from '../middleware/authorize.js';
import { requireFile, uploadPdf } from '../middleware/upload.js';
import { ROLES } from '../models/_shared.js';
import { STEP_SCHEMAS } from '../validators/profile.validator.js';
import { ApiError } from '../utils/ApiError.js';
import { validate } from '../middleware/validate.js';
import * as recCtrl from '../controllers/recommendation.controller.js';
import { feedbackSchema } from '../validators/recommendation.validator.js';

const router = Router();

router.use(protect, authorize(ROLES.STUDENT, ROLES.EMPLOYEE));

/** Picks the Zod schema for :step; unknown steps → 404. */
const validateStep = (req, res, next) => {
  const schema = STEP_SCHEMAS[req.params.step];
  if (!schema) return next(ApiError.notFound('UNKNOWN_STEP', `Unknown profile step: ${req.params.step}`));
  return validate(schema)(req, res, next);
};

router.get('/me', ctrl.getMe);
router.post('/me/cv', uploadPdf, requireFile, ctrl.uploadCv);
router.delete('/me/cv', ctrl.deleteCv);
router.post('/me/submit', authorize(ROLES.STUDENT), ctrl.submit);
// Learners only ever see published recommendations (CLAUDE.md security rules).
router.get('/me/recommendation', recCtrl.myRecommendation);
router.post('/me/recommendation/feedback', validate(feedbackSchema), recCtrl.myFeedback);
router.patch('/me/:step', validateStep, ctrl.updateStep);

export default router;
