import { Router } from 'express';
import { KeywordsController } from '../controllers/keywords.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const keywordsController = new KeywordsController();

// All routes require authentication
router.use(authenticate);

// GET /api/keywords - List keywords
router.get('/', keywordsController.list);

// POST /api/keywords - Add keyword
router.post('/', authorize('admin', 'manager'), keywordsController.create);

// PATCH /api/keywords/:id - Update keyword
router.patch('/:id', authorize('admin', 'manager'), keywordsController.update);

// DELETE /api/keywords/:id - Remove keyword
router.delete('/:id', authorize('admin', 'manager'), keywordsController.delete);

export default router;
