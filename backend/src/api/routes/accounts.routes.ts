import { Router } from 'express';
import { AccountsController } from '../controllers/accounts.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const accountsController = new AccountsController();

// All routes require authentication
router.use(authenticate);

// GET /api/accounts - List all Reddit accounts
router.get('/', accountsController.list);

// GET /api/accounts/oauth/init - Start Reddit OAuth flow
router.get('/oauth/init', accountsController.oauthInit);

// GET /api/accounts/oauth/callback - OAuth callback handler
router.get('/oauth/callback', accountsController.oauthCallback);

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
