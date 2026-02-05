import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError, NotFoundError } from './errorHandler';
import { prisma } from '../../utils/prisma';
import { BrandRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      brandId?: string;
      brandRole?: BrandRole;
    }
  }
}

/**
 * Middleware that requires a brand context via X-Brand-Id header.
 * Sets req.brandId and req.brandRole for downstream use.
 */
export async function requireBrandContext(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const brandId = req.headers['x-brand-id'] as string;
    if (!brandId) {
      throw new ForbiddenError('Brand context required (X-Brand-Id header)');
    }

    // Verify user is a member of this brand
    const membership = await prisma.brandMember.findUnique({
      where: {
        brandId_userId: {
          brandId,
          userId: req.user.userId,
        },
      },
      include: {
        brand: true,
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

/**
 * Middleware that optionally sets brand context if X-Brand-Id header is present.
 * Does not fail if header is missing.
 */
export async function optionalBrandContext(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const brandId = req.headers['x-brand-id'] as string;

    if (brandId && req.user) {
      const membership = await prisma.brandMember.findUnique({
        where: {
          brandId_userId: {
            brandId,
            userId: req.user.userId,
          },
        },
      });

      if (membership) {
        req.brandId = brandId;
        req.brandRole = membership.role;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware that requires admin or owner role in the current brand.
 * Must be used after requireBrandContext.
 */
export function requireBrandAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.brandId || !req.brandRole) {
    next(new ForbiddenError('Brand context required'));
    return;
  }

  if (req.brandRole !== 'admin' && req.brandRole !== 'owner') {
    next(new ForbiddenError('Admin access required'));
    return;
  }

  next();
}

/**
 * Middleware that requires owner role in the current brand.
 * Must be used after requireBrandContext.
 */
export function requireBrandOwner(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.brandId || !req.brandRole) {
    next(new ForbiddenError('Brand context required'));
    return;
  }

  if (req.brandRole !== 'owner') {
    next(new ForbiddenError('Owner access required'));
    return;
  }

  next();
}

/**
 * Helper to check if user has at least the specified role level.
 */
export function hasMinimumRole(userRole: BrandRole, requiredRole: BrandRole): boolean {
  const roleHierarchy: BrandRole[] = ['member', 'admin', 'owner'];
  const userLevel = roleHierarchy.indexOf(userRole);
  const requiredLevel = roleHierarchy.indexOf(requiredRole);
  return userLevel >= requiredLevel;
}
