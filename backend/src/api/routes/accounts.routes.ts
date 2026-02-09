import { Router } from 'express';
import { AccountsController } from '../controllers/accounts.controller';
import { authenticate } from '../middleware/auth';
import { requireBrandContext } from '../middleware/brand';

const router = Router();
const accountsController = new AccountsController();

// OAuth callback must be BEFORE auth middleware (Reddit redirects here without our token)
router.get('/oauth/callback', accountsController.oauthCallback);

// All other routes require authentication and brand context
router.use(authenticate);
router.use(requireBrandContext);

// GET /api/accounts - List all Reddit accounts
router.get('/', accountsController.list);

// GET /api/accounts/oauth/init - Start Reddit OAuth flow
router.get('/oauth/init', accountsController.oauthInit);

// Shadowban detection routes (before :id routes)
// GET /api/accounts/shadowban/check-all - Check all accounts for shadowbans
router.get('/shadowban/check-all', accountsController.checkAllShadowbans);

// GET /api/accounts/shadowban/suspected - Get accounts with suspected shadowbans
router.get('/shadowban/suspected', accountsController.getSuspectedShadowbans);

// Health scoring routes (before :id routes)
// GET /api/accounts/health/all - Calculate health for all accounts
router.get('/health/all', accountsController.getAllHealth);

// GET /api/accounts/health/low - Get accounts with low health scores
router.get('/health/low', accountsController.getLowHealthAccounts);

// GET /api/accounts/:id - Get account details
router.get('/:id', accountsController.getById);

// POST /api/accounts/:id/shadowban/check - Check specific account for shadowban
router.post('/:id/shadowban/check', accountsController.checkShadowban);

// GET /api/accounts/:id/health - Get health score for specific account
router.get('/:id/health', accountsController.getHealth);

// PATCH /api/accounts/:id - Update account (assign persona)
router.patch('/:id', accountsController.update);

// DELETE /api/accounts/:id - Disconnect account
router.delete('/:id', accountsController.delete);

export default router;
