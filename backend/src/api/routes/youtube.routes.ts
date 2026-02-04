import { Router } from 'express';
import { YouTubeController } from '../controllers/youtube.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const youtubeController = new YouTubeController();

// All routes require authentication
router.use(authenticate);

// ==========================================
// Discovery
// ==========================================
router.post('/discover', youtubeController.discover);
router.get('/discover/status', youtubeController.getDiscoveryStatus);
router.get('/discover/jobs', youtubeController.listDiscoveryJobs);

// ==========================================
// Channels
// ==========================================
router.get('/channels', youtubeController.listChannels);
router.get('/channels/:id', youtubeController.getChannel);
router.post('/channels/:id/analyze', youtubeController.analyzeChannel);
router.post('/channels/:id/refresh', youtubeController.refreshChannel);
router.patch('/channels/:id', youtubeController.updateChannel);
router.delete('/channels/:id', youtubeController.deleteChannel);

// ==========================================
// Analytics
// ==========================================
router.get('/analytics', youtubeController.getAnalytics);

export default router;
