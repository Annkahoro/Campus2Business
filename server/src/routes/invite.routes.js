import { Router } from 'express';
import * as ctrl from '../controllers/invite.controller.js';

/** Public: /invites/:token/validate */
const router = Router();

router.get('/:token/validate', ctrl.validate);

export default router;
