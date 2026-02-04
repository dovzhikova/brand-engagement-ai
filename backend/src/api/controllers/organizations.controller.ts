import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from '../middleware/errorHandler';

const createOrgSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
});

const updateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
});

export class OrganizationsController {
  /**
   * Get all organizations the current user is a member of
   */
  getMyOrganizations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;

      const memberships = await prisma.organizationMember.findMany({
        where: { userId },
        include: {
          organization: {
            include: {
              _count: {
                select: {
                  members: true,
                  redditAccounts: true,
                  personas: true,
                  keywords: true,
                  engagementItems: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      const organizations = memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
        createdAt: m.organization.createdAt,
        _count: m.organization._count,
      }));

      res.json(organizations);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create a new organization (current user becomes OWNER)
   */
  createOrganization = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { name, slug } = createOrgSchema.parse(req.body);

      // Check if slug is already taken
      const existing = await prisma.organization.findUnique({
        where: { slug },
      });

      if (existing) {
        throw new ConflictError('Organization slug already taken');
      }

      // Create organization and membership in a transaction
      const organization = await prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            name,
            slug,
          },
        });

        await tx.organizationMember.create({
          data: {
            organizationId: org.id,
            userId,
            role: 'OWNER',
          },
        });

        // Set as default org if user doesn't have one
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { defaultOrganizationId: true },
        });

        if (!user?.defaultOrganizationId) {
          await tx.user.update({
            where: { id: userId },
            data: { defaultOrganizationId: org.id },
          });
        }

        return org;
      });

      res.status(201).json({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        role: 'OWNER',
        createdAt: organization.createdAt,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get organization details (requires membership)
   */
  getOrganization = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      // Check membership
      const membership = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: id,
            userId,
          },
        },
      });

      if (!membership) {
        throw new ForbiddenError('Not a member of this organization');
      }

      const organization = await prisma.organization.findUnique({
        where: { id },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: [
              { role: 'asc' },
              { createdAt: 'asc' },
            ],
          },
          _count: {
            select: {
              redditAccounts: true,
              personas: true,
              keywords: true,
              engagementItems: true,
              youtubeChannels: true,
              googleAccounts: true,
            },
          },
        },
      });

      if (!organization) {
        throw new NotFoundError('Organization not found');
      }

      res.json({
        ...organization,
        currentUserRole: membership.role,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update organization (requires ADMIN or OWNER)
   */
  updateOrganization = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const data = updateOrgSchema.parse(req.body);

      // Middleware should have already verified admin/owner role
      // but we'll double-check for safety
      if (req.orgRole !== 'OWNER' && req.orgRole !== 'ADMIN') {
        throw new ForbiddenError('Admin or owner role required');
      }

      // If slug is being changed, check it's not taken
      if (data.slug) {
        const existing = await prisma.organization.findFirst({
          where: {
            slug: data.slug,
            NOT: { id },
          },
        });

        if (existing) {
          throw new ConflictError('Organization slug already taken');
        }
      }

      const organization = await prisma.organization.update({
        where: { id },
        data,
      });

      res.json(organization);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Invite a user to the organization (requires ADMIN or OWNER)
   */
  inviteMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { email, role } = inviteMemberSchema.parse(req.body);

      if (req.orgRole !== 'OWNER' && req.orgRole !== 'ADMIN') {
        throw new ForbiddenError('Admin or owner role required');
      }

      // Only owners can invite admins
      if (role === 'ADMIN' && req.orgRole !== 'OWNER') {
        throw new ForbiddenError('Only owners can invite admins');
      }

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new NotFoundError('User not found with that email');
      }

      // Check if already a member
      const existingMembership = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: id,
            userId: user.id,
          },
        },
      });

      if (existingMembership) {
        throw new ConflictError('User is already a member of this organization');
      }

      const membership = await prisma.organizationMember.create({
        data: {
          organizationId: id,
          userId: user.id,
          role,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      res.status(201).json({
        id: membership.id,
        role: membership.role,
        user: membership.user,
        createdAt: membership.createdAt,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Remove a member from the organization (requires ADMIN or OWNER)
   */
  removeMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id, memberId } = req.params;

      if (req.orgRole !== 'OWNER' && req.orgRole !== 'ADMIN') {
        throw new ForbiddenError('Admin or owner role required');
      }

      // Get the membership to remove
      const membershipToRemove = await prisma.organizationMember.findUnique({
        where: { id: memberId },
      });

      if (!membershipToRemove || membershipToRemove.organizationId !== id) {
        throw new NotFoundError('Member not found in this organization');
      }

      // Can't remove owner
      if (membershipToRemove.role === 'OWNER') {
        throw new ForbiddenError('Cannot remove the owner');
      }

      // Admins can't remove other admins
      if (membershipToRemove.role === 'ADMIN' && req.orgRole !== 'OWNER') {
        throw new ForbiddenError('Only owners can remove admins');
      }

      // Can't remove yourself
      if (membershipToRemove.userId === req.user!.userId) {
        throw new ValidationError('Cannot remove yourself. Use leave organization instead.');
      }

      await prisma.organizationMember.delete({
        where: { id: memberId },
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update a member's role (requires OWNER)
   */
  updateMemberRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id, memberId } = req.params;
      const { role: newRole } = updateMemberRoleSchema.parse(req.body);

      if (req.orgRole !== 'OWNER') {
        throw new ForbiddenError('Only owners can change member roles');
      }

      const membership = await prisma.organizationMember.findUnique({
        where: { id: memberId },
      });

      if (!membership || membership.organizationId !== id) {
        throw new NotFoundError('Member not found in this organization');
      }

      // Can't change own role
      if (membership.userId === req.user!.userId) {
        throw new ValidationError('Cannot change your own role');
      }

      // If transferring ownership, demote current owner to admin
      if (newRole === 'OWNER') {
        await prisma.$transaction([
          // Demote current owner to admin
          prisma.organizationMember.updateMany({
            where: {
              organizationId: id,
              userId: req.user!.userId,
            },
            data: { role: 'ADMIN' },
          }),
          // Promote new owner
          prisma.organizationMember.update({
            where: { id: memberId },
            data: { role: 'OWNER' },
          }),
        ]);
      } else {
        // Can't demote current owner through this
        if (membership.role === 'OWNER') {
          throw new ValidationError('Cannot demote owner. Transfer ownership first.');
        }

        await prisma.organizationMember.update({
          where: { id: memberId },
          data: { role: newRole },
        });
      }

      const updated = await prisma.organizationMember.findUnique({
        where: { id: memberId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
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
   * Leave an organization (any member except owner)
   */
  leaveOrganization = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const membership = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: id,
            userId,
          },
        },
      });

      if (!membership) {
        throw new NotFoundError('Not a member of this organization');
      }

      if (membership.role === 'OWNER') {
        throw new ValidationError('Owner cannot leave. Transfer ownership first or delete the organization.');
      }

      await prisma.organizationMember.delete({
        where: { id: membership.id },
      });

      // If this was the user's default org, clear it
      await prisma.user.update({
        where: { id: userId },
        data: {
          defaultOrganizationId: null,
        },
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete an organization (requires OWNER)
   */
  deleteOrganization = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      if (req.orgRole !== 'OWNER') {
        throw new ForbiddenError('Only the owner can delete an organization');
      }

      // Delete organization (cascades to members and all related data)
      await prisma.organization.delete({
        where: { id },
      });

      // Clear default org for all users who had this as default
      await prisma.user.updateMany({
        where: { defaultOrganizationId: id },
        data: { defaultOrganizationId: null },
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
