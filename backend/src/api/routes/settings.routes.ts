import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller';
import { authenticate } from '../middleware/auth';
import { requireOrgContext } from '../middleware/organization';

const router = Router();
const settingsController = new SettingsController();

// All routes require authentication and organization context
router.use(authenticate);
router.use(requireOrgContext);

// GET /api/settings - Get current user's AI settings
router.get('/', settingsController.getSettings);

// PATCH /api/settings - Update AI settings
router.patch('/', settingsController.updateSettings);

export default router;
