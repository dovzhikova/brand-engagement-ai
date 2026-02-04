import { Router } from 'express';
import { SubredditsController } from '../controllers/subreddits.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const subredditsController = new SubredditsController();

// All routes require authentication
router.use(authenticate);

// GET /api/subreddits - List subreddits
router.get('/', subredditsController.list);

// POST /api/subreddits - Add subreddit
router.post('/', authorize('admin', 'manager'), subredditsController.create);

// PATCH /api/subreddits/:id - Update subreddit
router.patch('/:id', authorize('admin', 'manager'), subredditsController.update);

// DELETE /api/subreddits/:id - Remove subreddit
router.delete('/:id', authorize('admin', 'manager'), subredditsController.delete);

export default router;
