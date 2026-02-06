import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { NotFoundError, ForbiddenError, ConflictError } from '../middleware/errorHandler';
import { BrandRole } from '@prisma/client';

const createBrandSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
  website: z.string().optional(),
  toneOfVoice: z.string().optional(),
  messagingStrategy: z.string().optional(),
  goals: z.array(z.string()).default([]),
  targetAudience: z.string().optional(),
  productDescription: z.string().optional(),
  keyDifferentiators: z.array(z.string()).default([]),
  brandValues: z.array(z.string()).default([]),
  contentGuidelines: z.string().optional(),
});

const updateBrandSchema = createBrandSchema.partial();

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member']).default('member'),
});

const updateMemberSchema = z.object({
  role: z.enum(['admin', 'member']),
});

export class BrandsController {
  /**
   * Get all brands the current user is a member of
   */
  getMyBrands = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;

      const memberships = await prisma.brandMember.findMany({
        where: { userId },
        include: {
          brand: {
            include: {
              _count: {
                select: {
                  members: true,
                  redditAccounts: true,
                  keywords: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      const brands = memberships.map((m) => ({
        ...m.brand,
        role: m.role,
      }));

      res.json(brands);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create a new brand (user becomes owner)
   */
  createBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const data = createBrandSchema.parse(req.body);

      // Check if slug is already taken
      const existingSlug = await prisma.brand.findUnique({
        where: { slug: data.slug },
      });

      if (existingSlug) {
        throw new ConflictError('Brand slug already exists');
      }

      // Create brand and membership in transaction
      const brand = await prisma.$transaction(async (tx) => {
        const newBrand = await tx.brand.create({
          data,
        });

        // Add creator as owner
        await tx.brandMember.create({
          data: {
            brandId: newBrand.id,
            userId,
            role: 'owner',
          },
        });

        // Set as default brand if user has no default
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { defaultBrandId: true },
        });

        if (!user?.defaultBrandId) {
          await tx.user.update({
            where: { id: userId },
            data: { defaultBrandId: newBrand.id },
          });
        }

        return newBrand;
      });

      res.status(201).json({ ...brand, role: 'owner' as BrandRole });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get a specific brand by ID
   */
  getBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      // Verify user is a member
      const membership = await prisma.brandMember.findUnique({
        where: {
          brandId_userId: { brandId: id, userId },
        },
      });

      if (!membership) {
        throw new ForbiddenError('Not a member of this brand');
      }

      const brand = await prisma.brand.findUnique({
        where: { id },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
          _count: {
            select: {
              redditAccounts: true,
              personas: true,
              keywords: true,
              engagements: true,
            },
          },
        },
      });

      if (!brand) {
        throw new NotFoundError('Brand not found');
      }

      res.json({ ...brand, role: membership.role });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update a brand (admin/owner only)
   */
  updateBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const data = updateBrandSchema.parse(req.body);

      // Check slug uniqueness if updating
      if (data.slug) {
        const existingSlug = await prisma.brand.findFirst({
          where: {
            slug: data.slug,
            NOT: { id },
          },
        });

        if (existingSlug) {
          throw new ConflictError('Brand slug already exists');
        }
      }

      const brand = await prisma.brand.update({
        where: { id },
        data,
      });

      res.json(brand);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete a brand (owner only)
   */
  deleteBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      await prisma.brand.delete({ where: { id } });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Invite a user to the brand
   */
  inviteMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id: brandId } = req.params;
      const data = inviteMemberSchema.parse(req.body);

      // Find the user to invite
      const userToInvite = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (!userToInvite) {
        throw new NotFoundError('User not found with this email');
      }

      // Check if already a member
      const existingMembership = await prisma.brandMember.findUnique({
        where: {
          brandId_userId: { brandId, userId: userToInvite.id },
        },
      });

      if (existingMembership) {
        throw new ConflictError('User is already a member of this brand');
      }

      const membership = await prisma.brandMember.create({
        data: {
          brandId,
          userId: userToInvite.id,
          role: data.role as BrandRole,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      res.status(201).json(membership);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update a member's role
   */
  updateMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id: brandId, memberId } = req.params;
      const data = updateMemberSchema.parse(req.body);

      const membership = await prisma.brandMember.findUnique({
        where: { id: memberId },
      });

      if (!membership || membership.brandId !== brandId) {
        throw new NotFoundError('Member not found');
      }

      // Can't change owner role
      if (membership.role === 'owner') {
        throw new ForbiddenError('Cannot change owner role');
      }

      const updated = await prisma.brandMember.update({
        where: { id: memberId },
        data: { role: data.role as BrandRole },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Remove a member from the brand
   */
  removeMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id: brandId, memberId } = req.params;

      const membership = await prisma.brandMember.findUnique({
        where: { id: memberId },
      });

      if (!membership || membership.brandId !== brandId) {
        throw new NotFoundError('Member not found');
      }

      // Can't remove owner
      if (membership.role === 'owner') {
        throw new ForbiddenError('Cannot remove the owner');
      }

      await prisma.brandMember.delete({
        where: { id: memberId },
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Set user's default brand
   */
  setDefaultBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id: brandId } = req.params;
      const userId = req.user!.userId;

      // Verify user is a member
      const membership = await prisma.brandMember.findUnique({
        where: {
          brandId_userId: { brandId, userId },
        },
      });

      if (!membership) {
        throw new ForbiddenError('Not a member of this brand');
      }

      await prisma.user.update({
        where: { id: userId },
        data: { defaultBrandId: brandId },
      });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };
}
