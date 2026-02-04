import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import { GoogleService, GSCSyncService, GSCAnalyticsService } from '../../services/gsc';

const syncSchema = z.object({
  syncType: z.enum(['daily', 'weekly', 'manual']).default('manual'),
});

const updateAccountSchema = z.object({
  siteUrl: z.string().url().optional(),
});

export class GSCController {
  private googleService: GoogleService;
  private syncService: GSCSyncService;
  private analyticsService: GSCAnalyticsService;

  constructor() {
    this.googleService = new GoogleService();
    this.syncService = new GSCSyncService();
    this.analyticsService = new GSCAnalyticsService();
  }

  // ==========================================
  // OAuth endpoints
  // ==========================================

  oauthInit = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authUrl = this.googleService.getAuthorizationUrl();
      res.json({ authUrl });
    } catch (error) {
      next(error);
    }
  };

  oauthCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { code, error: oauthError, state } = req.query;

      if (oauthError) {
        throw new ValidationError(`OAuth error: ${oauthError}`);
      }

      if (!code || typeof code !== 'string') {
        throw new ValidationError('Authorization code required');
      }

      if (!state || typeof state !== 'string') {
        throw new ValidationError('OAuth state required');
      }

      const result = await this.googleService.handleCallback(code, state);

      // Return account info and available sites
      res.json({
        account: result.account,
        availableSites: result.sites,
        message: 'Google Search Console connected successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // ==========================================
  // Account management
  // ==========================================

  listAccounts = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const accounts = await prisma.googleAccount.findMany({
        select: {
          id: true,
          email: true,
          siteUrl: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              gscKeywords: true,
              syncJobs: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(accounts);
    } catch (error) {
      next(error);
    }
  };

  getAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const account = await prisma.googleAccount.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          siteUrl: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              gscKeywords: true,
              syncJobs: true,
            },
          },
        },
      });

      if (!account) {
        throw new NotFoundError('Google account not found');
      }

      res.json(account);
    } catch (error) {
      next(error);
    }
  };

  updateAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const data = updateAccountSchema.parse(req.body);

      const account = await prisma.googleAccount.update({
        where: { id },
        data,
        select: {
          id: true,
          email: true,
          siteUrl: true,
          status: true,
        },
      });

      res.json(account);
    } catch (error) {
      next(error);
    }
  };

  deleteAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      // Revoke tokens at Google
      await this.googleService.revokeTokens(id);

      // Delete account (cascades to keywords and sync jobs)
      await prisma.googleAccount.delete({ where: { id } });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // ==========================================
  // Sync operations
  // ==========================================

  triggerSync = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { syncType } = syncSchema.parse(req.body);

      // Verify account exists and is active
      const account = await prisma.googleAccount.findUnique({
        where: { id },
      });

      if (!account) {
        throw new NotFoundError('Google account not found');
      }

      if (account.status !== 'active') {
        throw new ValidationError(
          `Account is ${account.status}. Please reconnect to enable sync.`
        );
      }

      const jobId = await this.syncService.triggerSync(id, syncType);

      res.json({
        jobId,
        message: `${syncType} sync job started`,
      });
    } catch (error) {
      next(error);
    }
  };

  triggerFullSync = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      // Verify account exists and is active
      const account = await prisma.googleAccount.findUnique({
        where: { id },
      });

      if (!account) {
        throw new NotFoundError('Google account not found');
      }

      if (account.status !== 'active') {
        throw new ValidationError(
          `Account is ${account.status}. Please reconnect to enable sync.`
        );
      }

      const jobId = await this.syncService.triggerFullSync(id);

      res.json({
        jobId,
        message: 'Full sync job started (16 months of data)',
      });
    } catch (error) {
      next(error);
    }
  };

  getSyncStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { jobId } = req.params;

      const status = await this.syncService.getJobStatus(jobId);

      if (!status) {
        // Try to get from database
        const dbJob = await prisma.gSCSyncJob.findUnique({
          where: { id: jobId },
        });

        if (!dbJob) {
          throw new NotFoundError('Sync job not found');
        }

        res.json({
          id: dbJob.id,
          status: dbJob.status,
          progress: dbJob.progress,
          keywordsImported: dbJob.keywordsImported,
          error: dbJob.error,
          startedAt: dbJob.startedAt?.toISOString(),
          completedAt: dbJob.completedAt?.toISOString(),
        });
        return;
      }

      res.json(status);
    } catch (error) {
      next(error);
    }
  };

  listSyncJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const jobs = await this.syncService.getRecentJobs(id);

      res.json(jobs);
    } catch (error) {
      next(error);
    }
  };

  // ==========================================
  // Analytics endpoints
  // ==========================================

  getDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const days = parseInt(req.query.days as string) || 30;

      // Verify account exists
      const account = await prisma.googleAccount.findUnique({
        where: { id },
      });

      if (!account) {
        throw new NotFoundError('Google account not found');
      }

      const stats = await this.analyticsService.getDashboardStats(id, days);

      res.json(stats);
    } catch (error) {
      next(error);
    }
  };

  getKeywords = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const search = req.query.search as string | undefined;

      const where: any = { googleAccountId: id };
      if (search) {
        where.query = { contains: search, mode: 'insensitive' };
      }

      const [keywords, total] = await Promise.all([
        prisma.gSCKeyword.findMany({
          where,
          orderBy: { impressions: 'desc' },
          take: limit,
          skip: offset,
          include: {
            linkedKeyword: {
              select: { id: true, keyword: true, category: true },
            },
          },
        }),
        prisma.gSCKeyword.count({ where }),
      ]);

      res.json({ keywords, total, limit, offset });
    } catch (error) {
      next(error);
    }
  };

  getContentGaps = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const days = parseInt(req.query.days as string) || 30;

      const stats = await this.analyticsService.getDashboardStats(id, days);

      res.json(stats.contentGaps);
    } catch (error) {
      next(error);
    }
  };

  getTopPages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const days = parseInt(req.query.days as string) || 30;

      const pages = await this.analyticsService.getTopPages(id, days);

      res.json(pages);
    } catch (error) {
      next(error);
    }
  };

  // ==========================================
  // Cross-platform analytics
  // ==========================================

  getCorrelations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const days = parseInt(req.query.days as string) || 30;

      const correlations = await this.analyticsService.getKeywordCorrelations(days);

      res.json(correlations);
    } catch (error) {
      next(error);
    }
  };

  getSuggestions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get first active Google account (or use query param)
      const accountId = req.query.accountId as string;

      let googleAccountId = accountId;
      if (!googleAccountId) {
        const account = await prisma.googleAccount.findFirst({
          where: { status: 'active' },
          select: { id: true },
        });

        if (!account) {
          res.json({ suggestions: [] });
          return;
        }

        googleAccountId = account.id;
      }

      const suggestions = await this.analyticsService.suggestKeywordsForDiscovery(googleAccountId);

      res.json({ suggestions });
    } catch (error) {
      next(error);
    }
  };

  // Add suggested keyword to internal keywords
  addSuggestedKeyword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { query, priority, category } = req.body;

      if (!query) {
        throw new ValidationError('Query is required');
      }

      // Check if keyword already exists
      const existing = await prisma.keyword.findFirst({
        where: {
          keyword: { equals: query, mode: 'insensitive' },
        },
      });

      if (existing) {
        throw new ValidationError('Keyword already exists');
      }

      const keyword = await prisma.keyword.create({
        data: {
          keyword: query,
          category: category || 'broad',
          priority: priority || 2,
          isActive: true,
        },
      });

      // Link any existing GSC keywords to this new keyword
      await prisma.gSCKeyword.updateMany({
        where: {
          query: { equals: query, mode: 'insensitive' },
          linkedKeywordId: null,
        },
        data: {
          linkedKeywordId: keyword.id,
        },
      });

      res.status(201).json(keyword);
    } catch (error) {
      next(error);
    }
  };
}
