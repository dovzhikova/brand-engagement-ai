import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const analyticsController = new AnalyticsController();

// All routes require authentication
router.use(authenticate);

// GET /api/analytics/dashboard - Get dashboard statistics
router.get('/dashboard', analyticsController.getDashboard);

// GET /api/analytics/trends - Get time-series trend data
router.get('/trends', analyticsController.getTrends);

// GET /api/analytics/subreddits - Get subreddit performance
router.get('/subreddits', analyticsController.getSubredditPerformance);

// GET /api/analytics/accounts/:id - Get account performance
router.get('/accounts/:id', analyticsController.getAccountPerformance);

export default router;
