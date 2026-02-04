import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../utils/prisma';
import { ForbiddenError, ValidationError } from './errorHandler';
import { OrgRole } from '@prisma/client';

// Extend Express Request to include organization context
declare global {
  namespace Express {
    interface Request {
      organizationId?: string;
      orgRole?: OrgRole;
    }
  }
}

/**
 * Middleware that requires and validates organization context.
 * Must be used after authenticate middleware.
 * Reads X-Organization-Id header and verifies user is a member.
 */
export async function requireOrgContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orgId = req.headers['x-organization-id'];

    if (!orgId || typeof orgId !== 'string') {
      throw new ValidationError('Organization ID required in X-Organization-Id header');
    }

    if (!req.user?.userId) {
      throw new ForbiddenError('User not authenticated');
    }

    // Verify user is member of this organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: req.user.userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenError('Not a member of this organization');
    }

    req.organizationId = orgId;
    req.orgRole = membership.role;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware that requires admin or owner role within the organization.
 * Must be used after requireOrgContext middleware.
 */
export function requireOrgAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.orgRole) {
    next(new ForbiddenError('Organization context required'));
    return;
  }

  if (req.orgRole !== 'OWNER' && req.orgRole !== 'ADMIN') {
    next(new ForbiddenError('Admin or owner role required'));
    return;
  }

  next();
}

/**
 * Middleware that requires owner role within the organization.
 * Must be used after requireOrgContext middleware.
 */
export function requireOrgOwner(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.orgRole) {
    next(new ForbiddenError('Organization context required'));
    return;
  }

  if (req.orgRole !== 'OWNER') {
    next(new ForbiddenError('Owner role required'));
    return;
  }

  next();
}

/**
 * Optional organization context middleware.
 * If X-Organization-Id header is provided, validates it.
 * If not provided, continues without organization context.
 * Useful for endpoints that can work with or without org context.
 */
export async function optionalOrgContext(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orgId = req.headers['x-organization-id'];

    if (!orgId || typeof orgId !== 'string') {
      // No org context provided, continue without it
      next();
      return;
    }

    if (!req.user?.userId) {
      next();
      return;
    }

    // Verify user is member of this organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: req.user.userId,
        },
      },
    });

    if (membership) {
      req.organizationId = orgId;
      req.orgRole = membership.role;
    }

    next();
  } catch (error) {
    next(error);
  }
}
