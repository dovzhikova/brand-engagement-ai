import { Router } from 'express';
import { PersonasController } from '../controllers/personas.controller';
import { authenticate, authorize } from '../middleware/auth';
import { requireOrgContext } from '../middleware/organization';
import { optionalBrandContext } from '../middleware/brand';

const router = Router();
const personasController = new PersonasController();

// All routes require authentication and organization context
router.use(authenticate);
router.use(requireOrgContext);
router.use(optionalBrandContext);

// GET /api/personas - List all personas
router.get('/', personasController.list);

// POST /api/personas - Create new persona
router.post('/', authorize('admin', 'manager'), personasController.create);

// GET /api/personas/:id - Get persona details
router.get('/:id', personasController.getById);

// PUT /api/personas/:id - Update persona
router.put('/:id', authorize('admin', 'manager'), personasController.update);

// DELETE /api/personas/:id - Delete persona
router.delete('/:id', authorize('admin', 'manager'), personasController.delete);

export default router;
