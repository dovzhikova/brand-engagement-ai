import { Router } from 'express';
import { GSCController } from '../controllers/gsc.controller';
import { authenticate } from '../middleware/auth';
import { requireOrgContext } from '../middleware/organization';

const router = Router();
const gscController = new GSCController();

// OAuth callback must be BEFORE auth middleware (Google redirects here without JWT)
router.get('/oauth/callback', gscController.oauthCallback);

// All other routes require authentication and organization context
router.use(authenticate);
router.use(requireOrgContext);

// ==========================================
// OAuth
// ==========================================
router.get('/oauth/init', gscController.oauthInit);

// ==========================================
// Account management
// ==========================================
router.get('/accounts', gscController.listAccounts);
router.get('/accounts/:id', gscController.getAccount);
router.patch('/accounts/:id', gscController.updateAccount);
router.delete('/accounts/:id', gscController.deleteAccount);

// ==========================================
// Sync operations
// ==========================================
router.post('/accounts/:id/sync', gscController.triggerSync);
router.post('/accounts/:id/sync/full', gscController.triggerFullSync);
router.get('/accounts/:id/sync/jobs', gscController.listSyncJobs);
router.get('/sync/:jobId/status', gscController.getSyncStatus);

// ==========================================
// Analytics (account-specific)
// ==========================================
router.get('/accounts/:id/dashboard', gscController.getDashboard);
router.get('/accounts/:id/keywords', gscController.getKeywords);
router.get('/accounts/:id/content-gaps', gscController.getContentGaps);
router.get('/accounts/:id/top-pages', gscController.getTopPages);

// ==========================================
// Cross-platform analytics
// ==========================================
router.get('/correlations', gscController.getCorrelations);
router.get('/suggestions', gscController.getSuggestions);
router.post('/suggestions/add', gscController.addSuggestedKeyword);

export default router;
