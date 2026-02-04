import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const authController = new AuthController();

// POST /api/auth/login - User login, returns JWT
router.post('/login', authController.login);

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', authController.refresh);

// POST /api/auth/logout - Invalidate session
router.post('/logout', authenticate, authController.logout);

// POST /api/auth/register - Register new user (admin only initially)
router.post('/register', authController.register);

// GET /api/auth/me - Get current user
router.get('/me', authenticate, authController.me);

export default router;
