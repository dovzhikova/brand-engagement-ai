import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import { YouTubeDiscoveryService } from '../../services/youtube/youtube-discovery.service';

const discoverBodySchema = z.object({
  keywords: z.array(z.string()).min(1, 'At least one keyword is required'),
  maxResultsPerKeyword: z.number().min(1).max(50).default(25),
});

const listQuerySchema = z.object({
  status: z.enum(['discovered', 'analyzing', 'analyzed', 'shortlisted', 'contacted', 'rejected']).optional(),
  category: z.string().optional(),
  minRoiScore: z.coerce.number().min(0).max(100).optional(),
  sortBy: z.enum(['roiScore', 'relevanceScore', 'subscriberCount', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

const updateChannelSchema = z.object({
  status: z.enum(['discovered', 'analyzing', 'analyzed', 'shortlisted', 'contacted', 'rejected']).optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
});

export class YouTubeController {
  private discoveryService = new YouTubeDiscoveryService();

  /**
   * Start a YouTube channel discovery job
   */
  discover = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { keywords, maxResultsPerKeyword } = discoverBodySchema.parse(req.body);

      const jobId = await this.discoveryService.startDiscovery(keywords, maxResultsPerKeyword);

      res.status(202).json({
        message: 'Discovery job started',
        jobId,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get discovery job status
   */
  getDiscoveryStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { jobId } = req.query;

      if (jobId && typeof jobId === 'string') {
        const status = await this.discoveryService.getJobStatus(jobId);
        if (!status) {
          throw new NotFoundError('Job not found');
        }
        res.json(status);
      } else {
        // Return most recent job
        const jobs = await this.discoveryService.listJobs(1);
        res.json(jobs[0] || null);
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * List recent discovery jobs
   */
  listDiscoveryJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const jobs = await this.discoveryService.listJobs(20);
      res.json(jobs);
    } catch (error) {
      next(error);
    }
  };

  /**
   * List discovered YouTube channels
   */
  listChannels = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status, category, minRoiScore, sortBy, sortOrder, limit, offset } = listQuerySchema.parse(req.query);

      const where: Record<string, unknown> = {};
      if (status) where.status = status;
      if (category) where.category = category;
      if (minRoiScore !== undefined) {
        where.roiScore = { gte: minRoiScore };
      }

      const [channelsRaw, total] = await Promise.all([
        prisma.youTubeChannel.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          take: limit,
          skip: offset,
          include: {
            _count: {
              select: { videos: true },
            },
          },
        }),
        prisma.youTubeChannel.count({ where }),
      ]);

      // Convert BigInt to string for JSON serialization
      const channels = channelsRaw.map((ch) => ({
        ...ch,
        viewCount: ch.viewCount?.toString() ?? null,
      }));

      res.json({ channels, total, limit, offset });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get channel details
   */
  getChannel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const channelRaw = await prisma.youTubeChannel.findUnique({
        where: { id },
        include: {
          videos: {
            orderBy: { publishedAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!channelRaw) {
        throw new NotFoundError('Channel not found');
      }

      // Convert BigInt to string for JSON serialization
      const channel = {
        ...channelRaw,
        viewCount: channelRaw.viewCount?.toString() ?? null,
      };

      res.json(channel);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Trigger analysis for a channel
   */
  analyzeChannel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const channel = await prisma.youTubeChannel.findUnique({
        where: { id },
      });

      if (!channel) {
        throw new NotFoundError('Channel not found');
      }

      // Trigger analysis (async, non-blocking)
      this.discoveryService.triggerAnalysis(id).catch((err) => {
        console.error('Analysis failed:', err);
      });

      res.json({ message: 'Analysis started' });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Refresh channel metrics from YouTube API
   */
  refreshChannel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      await this.discoveryService.refreshChannel(id);

      const channel = await prisma.youTubeChannel.findUnique({
        where: { id },
      });

      res.json(channel);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update channel status/notes
   */
  updateChannel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const data = updateChannelSchema.parse(req.body);

      const existing = await prisma.youTubeChannel.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundError('Channel not found');
      }

      const updated = await prisma.youTubeChannel.update({
        where: { id },
        data,
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete a channel
   */
  deleteChannel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const existing = await prisma.youTubeChannel.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundError('Channel not found');
      }

      await prisma.youTubeChannel.delete({
        where: { id },
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get YouTube analytics dashboard
   */
  getAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const [
        totalChannels,
        statusBreakdown,
        categoryBreakdown,
        topByRoi,
        topByRelevance,
        recentlyDiscovered,
      ] = await Promise.all([
        prisma.youTubeChannel.count(),

        prisma.youTubeChannel.groupBy({
          by: ['status'],
          _count: true,
        }),

        prisma.youTubeChannel.groupBy({
          by: ['category'],
          _count: true,
          where: { category: { not: null } },
        }),

        prisma.youTubeChannel.findMany({
          where: { roiScore: { not: null } },
          orderBy: { roiScore: 'desc' },
          take: 5,
          select: {
            id: true,
            name: true,
            thumbnailUrl: true,
            subscriberCount: true,
            roiScore: true,
            relevanceScore: true,
          },
        }),

        prisma.youTubeChannel.findMany({
          where: { relevanceScore: { not: null } },
          orderBy: { relevanceScore: 'desc' },
          take: 5,
          select: {
            id: true,
            name: true,
            thumbnailUrl: true,
            subscriberCount: true,
            roiScore: true,
            relevanceScore: true,
          },
        }),

        prisma.youTubeChannel.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            name: true,
            thumbnailUrl: true,
            subscriberCount: true,
            status: true,
            createdAt: true,
          },
        }),
      ]);

      // Calculate average scores
      const avgScores = await prisma.youTubeChannel.aggregate({
        _avg: {
          roiScore: true,
          relevanceScore: true,
          engagementRate: true,
        },
        where: {
          roiScore: { not: null },
        },
      });

      res.json({
        totalChannels,
        statusBreakdown: Object.fromEntries(
          statusBreakdown.map((s) => [s.status, s._count])
        ),
        categoryBreakdown: Object.fromEntries(
          categoryBreakdown.map((c) => [c.category || 'uncategorized', c._count])
        ),
        averageScores: {
          roiScore: Math.round(avgScores._avg.roiScore || 0),
          relevanceScore: Math.round(avgScores._avg.relevanceScore || 0),
          engagementRate: Math.round((avgScores._avg.engagementRate || 0) * 100) / 100,
        },
        topByRoi,
        topByRelevance,
        recentlyDiscovered,
      });
    } catch (error) {
      next(error);
    }
  };
}
