import { Router } from 'express';
import { AlertsController } from '../controllers/alerts.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const alertsController = new AlertsController();

// All routes require authentication
router.use(authenticate);

// GET /api/alerts/competitors - Get posts mentioning competitors
router.get('/competitors', alertsController.getCompetitorMentions);

// GET /api/alerts/competitors/summary - Get competitor mention summary
router.get('/competitors/summary', alertsController.getCompetitorSummary);

// GET /api/alerts/competitors/tracked - Get list of tracked competitors
router.get('/competitors/tracked', alertsController.getTrackedCompetitors);

// POST /api/alerts/analyze - Analyze a post for competitor mentions
router.post('/analyze', alertsController.analyzePost);

export default router;
