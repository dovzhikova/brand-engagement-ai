import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  generateReferralCode,
  getReferralStats,
  validateReferralCode,
  applyReferralCode,
  getReferralHistory,
} from '../controllers/referrals.controller';

const router = Router();

// All routes require authentication except validate
router.get('/validate/:code', validateReferralCode);

// Protected routes
router.use(authenticate);

router.post('/generate', generateReferralCode);
router.get('/stats', getReferralStats);
router.post('/apply', applyReferralCode);
router.get('/history', getReferralHistory);

export default router;
