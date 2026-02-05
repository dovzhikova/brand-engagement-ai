import { Router } from 'express';
import { EngagementsController } from '../controllers/engagements.controller';
import { authenticate } from '../middleware/auth';
import { requireOrgContext } from '../middleware/organization';
import { optionalBrandContext } from '../middleware/brand';

const router = Router();
const engagementsController = new EngagementsController();

// All routes require authentication and organization context
router.use(authenticate);
router.use(requireOrgContext);
router.use(optionalBrandContext);

// GET /api/engagements - List engagement items (with filters)
router.get('/', engagementsController.list);

// GET /api/engagements/export - Export engagements as CSV or JSON
router.get('/export', engagementsController.export);

// GET /api/engagements/:id - Get item details
router.get('/:id', engagementsController.getById);

// POST /api/engagements/:id/analyze - Trigger AI analysis
router.post('/:id/analyze', engagementsController.analyze);

// POST /api/engagements/:id/generate - Generate draft with persona
router.post('/:id/generate', engagementsController.generate);

// POST /api/engagements/:id/regenerate - Regenerate draft
router.post('/:id/regenerate', engagementsController.regenerate);

// POST /api/engagements/:id/refine - Refine draft (shorten, expand, restyle)
router.post('/:id/refine', engagementsController.refine);

// POST /api/engagements/:id/proofread - AI proofreading pass
router.post('/:id/proofread', engagementsController.proofread);

// PATCH /api/engagements/:id - Update (edit draft, assign account)
router.patch('/:id', engagementsController.update);

// POST /api/engagements/:id/approve - Approve for publishing
router.post('/:id/approve', engagementsController.approve);

// POST /api/engagements/:id/reject - Reject item
router.post('/:id/reject', engagementsController.reject);

// POST /api/engagements/:id/publish - Post to Reddit
router.post('/:id/publish', engagementsController.publish);

export default router;
