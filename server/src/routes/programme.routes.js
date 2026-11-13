import { Router } from 'express';
import * as ctrl from '../controllers/programme.controller.js';
import * as categoryCtrl from '../controllers/category.controller.js';
import { optionalAuth } from '../middleware/protect.js';
import { validate } from '../middleware/validate.js';
import { listProgrammesQuery } from '../validators/programme.validator.js';

/**
 * Catalogue routes. docs/05 marks these 🔐, but docs/09 needs a public catalogue (/programmes and the
 * landing page's featured programmes), so they are public with optional auth. Only published programmes
 * and `showToLearners` custom fields are exposed to non-admins.
 */
const router = Router();

router.use(optionalAuth);

router.get('/', validate(listProgrammesQuery, 'query'), ctrl.listPublished);
router.get('/meta/categories', categoryCtrl.listPublic);
router.get('/:id', ctrl.getOne);

export default router;
