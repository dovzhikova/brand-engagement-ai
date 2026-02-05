import { Router, Request, Response, NextFunction } from 'express';
import { BrandsController } from '../controllers/brands.controller';
import { authenticate } from '../middleware/auth';
import { ForbiddenError } from '../middleware/errorHandler';
import { prisma } from '../../utils/prisma';

const router = Router();
const brandsController = new BrandsController();

// Middleware to check brand membership from URL param
async function requireBrandMembership(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const brandId = req.params.id;
    const userId = req.user!.userId;

    const membership = await prisma.brandMember.findUnique({
      where: {
        brandId_userId: { brandId, userId },
      },
    });

    if (!membership) {
      throw new ForbiddenError('Not a member of this brand');
    }

    req.brandId = brandId;
    req.brandRole = membership.role;
    next();
  } catch (error) {
    next(error);
  }
}

// Middleware to require admin role
function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (req.brandRole !== 'admin' && req.brandRole !== 'owner') {
    next(new ForbiddenError('Admin access required'));
    return;
  }
  next();
}

// Middleware to require owner role
function requireOwner(req: Request, _res: Response, next: NextFunction): void {
  if (req.brandRole !== 'owner') {
    next(new ForbiddenError('Owner access required'));
    return;
  }
  next();
}

// All routes require authentication
router.use(authenticate);

// GET /api/brands - List all brands user is member of
router.get('/', brandsController.getMyBrands);

// POST /api/brands - Create new brand
router.post('/', brandsController.createBrand);

// GET /api/brands/:id - Get brand details
router.get('/:id', brandsController.getBrand);

// PUT /api/brands/:id - Update brand (admin/owner only)
router.put('/:id', requireBrandMembership, requireAdmin, brandsController.updateBrand);

// DELETE /api/brands/:id - Delete brand (owner only)
router.delete('/:id', requireBrandMembership, requireOwner, brandsController.deleteBrand);

// POST /api/brands/:id/default - Set as default brand
router.post('/:id/default', brandsController.setDefaultBrand);

// POST /api/brands/:id/members - Invite a member
router.post('/:id/members', requireBrandMembership, requireAdmin, brandsController.inviteMember);

// PATCH /api/brands/:id/members/:memberId - Update member role
router.patch('/:id/members/:memberId', requireBrandMembership, requireAdmin, brandsController.updateMember);

// DELETE /api/brands/:id/members/:memberId - Remove member
router.delete('/:id/members/:memberId', requireBrandMembership, requireAdmin, brandsController.removeMember);

export default router;
