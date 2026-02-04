import { Router } from 'express';
import { DiscoveryController } from '../controllers/discovery.controller';
import { authenticate, authorize } from '../middleware/auth';
import { requireOrgContext } from '../middleware/organization';

const router = Router();
const discoveryController = new DiscoveryController();

// All routes require authentication and organization context
router.use(authenticate);
router.use(requireOrgContext);

// POST /api/discovery/fetch - Trigger manual fetch
router.post('/fetch', authorize('admin', 'manager'), discoveryController.fetch);

// GET /api/discovery/status - Get fetch job status
router.get('/status', discoveryController.getStatus);

// GET /api/discovery/jobs - List recent discovery jobs
router.get('/jobs', discoveryController.listJobs);

// GET /api/discovery/schedule - Get auto-discovery schedule info
router.get('/schedule', discoveryController.getScheduleInfo);

export default router;
