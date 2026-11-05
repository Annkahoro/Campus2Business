import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import programmeRoutes from './programme.routes.js';
import programmeFieldRoutes from './programmeField.routes.js';
import profileRoutes from './profile.routes.js';
import organizationRoutes from './organization.routes.js';
import inviteRoutes from './invite.routes.js';
import orgRoutes from './org.routes.js';
import notificationRoutes from './notification.routes.js';
import enrollmentRoutes from './enrollment.routes.js';
import statsRoutes from './stats.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/programmes', programmeRoutes);
router.use('/programme-fields', programmeFieldRoutes);
router.use('/profile', profileRoutes);
router.use('/organizations', organizationRoutes);
router.use('/invites', inviteRoutes);
router.use('/org', orgRoutes);
router.use('/notifications', notificationRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/stats', statsRoutes);

export default router;
