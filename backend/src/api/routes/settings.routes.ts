import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const settingsController = new SettingsController();

// All routes require authentication
router.use(authenticate);

// GET /api/settings - Get current user's AI settings
router.get('/', settingsController.getSettings);

// PATCH /api/settings - Update AI settings
router.patch('/', settingsController.updateSettings);

export default router;
