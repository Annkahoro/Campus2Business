import { Router } from 'express';
import * as ctrl from '../controllers/organization.controller.js';
import { protect } from '../middleware/protect.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { requireFile, uploadImage } from '../middleware/upload.js';
import { ROLES } from '../models/_shared.js';
import { createOrgSchema, updateOrgSchema } from '../validators/organization.validator.js';

/** /organizations — the org admin's own organization. */
const router = Router();

router.use(protect, authorize(ROLES.ORG_ADMIN));

router.post('/', validate(createOrgSchema), ctrl.create);
router.get('/mine', ctrl.getMine);
router.patch('/mine', validate(updateOrgSchema), ctrl.updateMine);
router.post('/mine/logo', uploadImage, requireFile, ctrl.uploadLogo);

export default router;
