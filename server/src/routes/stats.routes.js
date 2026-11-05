import { Router } from 'express';
import * as ctrl from '../controllers/stats.controller.js';

/** /stats — public, anonymous counts only (landing page). */
const router = Router();

router.get('/public', ctrl.publicStats);

export default router;
