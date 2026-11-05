import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller.js';
import { protect } from '../middleware/protect.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { requireFile, uploadAvatar } from '../middleware/upload.js';
import {
  changePasswordSchema,
  googleSchema,
  loginSchema,
  registerEmployeeSchema,
  registerSchema,
  updateMeSchema,
} from '../validators/auth.validator.js';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), ctrl.register);
router.post('/register-org-admin', authLimiter, validate(registerSchema), ctrl.registerOrgAdmin);
router.post('/register-employee', authLimiter, validate(registerEmployeeSchema), ctrl.registerEmployee);
router.post('/login', authLimiter, validate(loginSchema), ctrl.login);
router.post('/google', authLimiter, validate(googleSchema), ctrl.google);

router.get('/me', protect, ctrl.getMe);
router.patch('/me', protect, validate(updateMeSchema), ctrl.updateMe);
router.patch('/me/password', protect, authLimiter, validate(changePasswordSchema), ctrl.changePassword);
router.post('/me/avatar', protect, uploadAvatar, requireFile, ctrl.uploadAvatar);

export default router;
