import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { UnauthorizedError, ValidationError, ConflictError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';
import { OrgRole } from '@prisma/client';

interface OrganizationInfo {
  id: string;
  name: string;
  slug: string;
  role: OrgRole;
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'manager', 'reviewer']).optional(),
});

export class AuthController {
  private async getUserOrganizations(userId: string): Promise<OrganizationInfo[]> {
    const memberships = await prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      role: m.role,
    }));
  }

  private generateTokens(userId: string, email: string, role: string, organizations: OrganizationInfo[]) {
    const accessToken = jwt.sign(
      { userId, email, role, organizations },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' } as any
    );

    const refreshToken = uuidv4();

    return { accessToken, refreshToken };
  }

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user || !await bcrypt.compare(password, user.passwordHash)) {
        throw new UnauthorizedError('Invalid credentials');
      }

      // Get user's organizations
      const organizations = await this.getUserOrganizations(user.id);

      const { accessToken, refreshToken } = this.generateTokens(
        user.id,
        user.email,
        user.role,
        organizations
      );

      // Store refresh token
      const refreshExpiresAt = new Date();
      refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);

      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: refreshExpiresAt,
        },
      });

      res.json({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          defaultOrganizationId: user.defaultOrganizationId,
          organizations,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new ValidationError('Refresh token required');
      }

      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedError('Invalid or expired refresh token');
      }

      const user = await prisma.user.findUnique({
        where: { id: storedToken.userId },
      });

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      // Get user's organizations
      const organizations = await this.getUserOrganizations(user.id);

      // Delete old refresh token
      await prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });

      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } = this.generateTokens(
        user.id,
        user.email,
        user.role,
        organizations
      );

      // Store new refresh token
      const refreshExpiresAt = new Date();
      refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);

      await prisma.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: user.id,
          expiresAt: refreshExpiresAt,
        },
      });

      res.json({
        accessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        await prisma.refreshToken.deleteMany({
          where: { token: refreshToken },
        });
      }

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  };

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password, name, role } = registerSchema.parse(req.body);

      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new ConflictError('Email already registered');
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          role: role || 'reviewer',
        },
      });

      res.status(201).json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
    } catch (error) {
      next(error);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          defaultOrganizationId: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      // Get user's organizations
      const organizations = await this.getUserOrganizations(user.id);

      res.json({
        ...user,
        organizations,
      });
    } catch (error) {
      next(error);
    }
  };
}
