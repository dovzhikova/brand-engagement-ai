import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import { RedditService } from '../../services/reddit/reddit.service';
import { shadowbanService } from '../../services/reddit/shadowban.service';
import { accountHealthService } from '../../services/accounts/health.service';

const updateAccountSchema = z.object({
  personaId: z.string().uuid().nullable().optional(),
  status: z.enum(['active', 'warming_up', 'suspended', 'disconnected']).optional(),
});

export class AccountsController {
  private redditService = new RedditService();

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const accounts = await prisma.redditAccount.findMany({
        where: {
          brandId: req.brandId!,
        },
        include: {
          persona: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Don't expose tokens - omit sensitive fields
      const sanitizedAccounts = accounts.map((acc: typeof accounts[number]) => {
        const { accessToken, refreshToken, ...account } = acc;
        return account;
      });

      res.json(sanitizedAccounts);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const account = await prisma.redditAccount.findFirst({
        where: {
          id,
          brandId: req.brandId!,
        },
        include: {
          persona: true,
          _count: {
            select: { engagements: true },
          },
        },
      });

      if (!account) {
        throw new NotFoundError('Account not found');
      }

      // Don't expose tokens
      const { accessToken, refreshToken, ...sanitized } = account;

      res.json(sanitized);
    } catch (error) {
      next(error);
    }
  };

  oauthInit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authUrl = this.redditService.getAuthorizationUrl(req.brandId);
      res.json({ authUrl });
    } catch (error) {
      next(error);
    }
  };

  oauthCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const frontendUrl = process.env.FRONTEND_URL || 'https://brand-engagement-ai.vercel.app';

    try {
      const { code, error: oauthError, state } = req.query;

      if (oauthError) {
        res.redirect(`${frontendUrl}/accounts?error=${encodeURIComponent(String(oauthError))}`);
        return;
      }

      if (!code || typeof code !== 'string') {
        res.redirect(`${frontendUrl}/accounts?error=${encodeURIComponent('Authorization code required')}`);
        return;
      }

      const account = await this.redditService.handleCallback(code, state as string);

      // Redirect to frontend with success
      res.redirect(`${frontendUrl}/accounts?connected=${encodeURIComponent(account.username)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OAuth failed';
      res.redirect(`${frontendUrl}/accounts?error=${encodeURIComponent(message)}`);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const data = updateAccountSchema.parse(req.body);

      const existing = await prisma.redditAccount.findFirst({
        where: { id, brandId: req.brandId! },
      });
      if (!existing) {
        throw new NotFoundError('Account not found');
      }

      const account = await prisma.redditAccount.update({
        where: { id },
        data,
        include: {
          persona: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      const { accessToken, refreshToken, ...sanitized } = account;
      res.json(sanitized);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const existing = await prisma.redditAccount.findFirst({
        where: { id, brandId: req.brandId! },
      });
      if (!existing) {
        throw new NotFoundError('Account not found');
      }

      // Revoke Reddit OAuth tokens
      await this.redditService.revokeTokens(existing.accessToken, existing.refreshToken);

      await prisma.redditAccount.delete({ where: { id } });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // Shadowban detection
  checkShadowban = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const existing = await prisma.redditAccount.findFirst({
        where: { id, brandId: req.brandId! },
      });
      if (!existing) {
        throw new NotFoundError('Account not found');
      }

      const result = await shadowbanService.checkShadowban(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  checkAllShadowbans = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const results = await shadowbanService.checkAllAccounts();
      res.json({
        checked: results.length,
        suspected: results.filter(r => r.isShadowbanned).length,
        results,
      });
    } catch (error) {
      next(error);
    }
  };

  getSuspectedShadowbans = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const accounts = await shadowbanService.getSuspectedShadowbans();
      res.json(accounts);
    } catch (error) {
      next(error);
    }
  };

  // Account health scoring
  getHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const existing = await prisma.redditAccount.findFirst({
        where: { id, brandId: req.brandId! },
      });
      if (!existing) {
        throw new NotFoundError('Account not found');
      }

      const result = await accountHealthService.calculateHealth(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getAllHealth = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const results = await accountHealthService.calculateAllHealthScores();
      res.json({
        total: results.length,
        excellent: results.filter(r => r.status === 'excellent').length,
        good: results.filter(r => r.status === 'good').length,
        fair: results.filter(r => r.status === 'fair').length,
        poor: results.filter(r => r.status === 'poor').length,
        critical: results.filter(r => r.status === 'critical').length,
        results,
      });
    } catch (error) {
      next(error);
    }
  };

  getLowHealthAccounts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const threshold = parseInt(req.query.threshold as string) || 50;
      const accounts = await accountHealthService.getLowHealthAccounts(threshold);
      res.json(accounts);
    } catch (error) {
      next(error);
    }
  };
}
