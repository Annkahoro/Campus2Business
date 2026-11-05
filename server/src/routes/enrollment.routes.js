import { Router } from 'express';
import * as ctrl from '../controllers/enrollment.controller.js';
import { protect } from '../middleware/protect.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../models/_shared.js';
import { paySchema, rateSchema, requestEnrollmentSchema } from '../validators/enrollment.validator.js';

/** /enrollments — learners, and org admins acting for their employees (docs/05). */
const router = Router();

router.use(protect);
router.post('/', authorize(ROLES.STUDENT, ROLES.EMPLOYEE, ROLES.ORG_ADMIN), validate(requestEnrollmentSchema), ctrl.request);
router.get('/mine', authorize(ROLES.STUDENT, ROLES.EMPLOYEE), ctrl.mine);
router.post('/:id/pay', authorize(ROLES.STUDENT, ROLES.EMPLOYEE, ROLES.ORG_ADMIN), validate(paySchema), ctrl.pay);
router.post('/:id/rate', authorize(ROLES.STUDENT, ROLES.EMPLOYEE), validate(rateSchema), ctrl.rate);

export default router;
