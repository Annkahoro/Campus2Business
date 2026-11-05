import { Router } from 'express';
import * as ctrl from '../controllers/notification.controller.js';
import { protect } from '../middleware/protect.js';
import { validate } from '../middleware/validate.js';
import { listNotificationsQuery } from '../validators/notification.validator.js';

/** /notifications — every logged-in user, always scoped to req.user (docs/05). */
const router = Router();

router.use(protect);
router.get('/', validate(listNotificationsQuery, 'query'), ctrl.list);
router.patch('/read-all', ctrl.markAllRead); // before /:id/read
router.patch('/:id/read', ctrl.markRead);

export default router;
