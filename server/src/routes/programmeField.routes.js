import { Router } from 'express';
import * as ctrl from '../controllers/programmeField.controller.js';
import { optionalAuth } from '../middleware/protect.js';

/** Read-only field definitions for rendering programme pages (public, like the catalogue). */
const router = Router();

router.get('/', optionalAuth, ctrl.listForRendering);

export default router;
