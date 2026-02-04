import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import { AIService, GenerationOptions, RefinementOptions, AIConfig } from '../../services/ai/ai.service';
import { RedditService } from '../../services/reddit/reddit.service';

const listQuerySchema = z.object({
  status: z.enum(['discovered', 'analyzing', 'draft_ready', 'in_review', 'approved', 'rejected', 'published', 'failed']).optional(),
  subreddit: z.string().optional(),
  recommended: z.coerce.boolean().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

const exportQuerySchema = z.object({
  status: z.enum(['discovered', 'analyzing', 'draft_ready', 'in_review', 'approved', 'rejected', 'published', 'failed']).optional(),
  subreddit: z.string().optional(),
  format: z.enum(['csv', 'json']).default('csv'),
});

const updateEngagementSchema = z.object({
  editedResponse: z.string().optional(),
  assignedAccountId: z.string().uuid().nullable().optional(),
  reviewerNotes: z.string().optional(),
});

const generationOptionsSchema = z.object({
  length: z.enum(['concise', 'standard', 'detailed']).optional(),
  style: z.enum(['casual', 'professional', 'technical', 'friendly']).optional(),
  brandVoice: z.string().optional(),
  customInstructions: z.string().optional(),
});

const generateBodySchema = z.object({
  accountId: z.string().uuid().optional().or(z.literal('')),
  options: generationOptionsSchema.optional(),
});

// Default persona for generating drafts without an account
const defaultPersona = {
  name: 'Default Brand Voice',
  backgroundStory: 'A knowledgeable fitness enthusiast who has used the product and is passionate about science-backed exercise.',
  toneOfVoice: 'Friendly, helpful, and informative without being pushy or promotional',
  characterTraits: ['helpful', 'knowledgeable', 'genuine', 'science-minded'],
  expertiseAreas: ['REHIT protocol', 'VO2max', 'fitness science', 'time-efficient workouts'],
  goals: ['Share genuine experiences', 'Educate about REHIT benefits', 'Help people make informed decisions'],
  writingGuidelines: 'Be authentic and helpful. Share personal experience naturally. Never be salesy or promotional.',
  exampleResponses: [],
};

const refineBodySchema = z.object({
  action: z.enum(['shorten', 'expand', 'restyle']),
  targetLength: z.enum(['concise', 'standard', 'detailed']).optional(),
  targetStyle: z.enum(['casual', 'professional', 'technical', 'friendly']).optional(),
  customInstructions: z.string().optional(),
});

export class EngagementsController {
  private aiService = new AIService();
  private redditService = new RedditService();

  private async getUserAIConfig(userId: string): Promise<AIConfig | undefined> {
    const preferences = await prisma.userPreferences.findUnique({
      where: { userId },
    });

    if (preferences) {
      return {
        provider: preferences.aiProvider as 'openai' | 'anthropic',
        model: preferences.aiModel,
      };
    }

    return undefined;
  }

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status, subreddit, recommended, limit, offset } = listQuerySchema.parse(req.query);

      const where: Record<string, unknown> = {
        organizationId: req.organizationId,
      };
      if (status) where.status = status;
      if (subreddit) where.subreddit = subreddit;
      if (recommended !== undefined) where.isRecommended = recommended;

      const [items, total] = await Promise.all([
        prisma.engagementItem.findMany({
          where,
          include: {
            assignedAccount: {
              select: { id: true, username: true },
            },
            reviewer: {
              select: { id: true, name: true },
            },
          },
          orderBy: [
            { isRecommended: 'desc' },
            { relevanceScore: 'desc' },
            { createdAt: 'desc' },
          ],
          take: limit,
          skip: offset,
        }),
        prisma.engagementItem.count({ where }),
      ]);

      res.json({ items, total, limit, offset });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const item = await prisma.engagementItem.findFirst({
        where: {
          id,
          organizationId: req.organizationId,
        },
        include: {
          assignedAccount: {
            include: {
              persona: true,
            },
          },
          reviewer: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (!item) {
        throw new NotFoundError('Engagement item not found');
      }

      res.json(item);
    } catch (error) {
      next(error);
    }
  };

  analyze = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const item = await prisma.engagementItem.findFirst({
        where: { id, organizationId: req.organizationId },
      });
      if (!item) {
        throw new NotFoundError('Engagement item not found');
      }

      await prisma.engagementItem.update({
        where: { id },
        data: { status: 'analyzing' },
      });

      const aiConfig = await this.getUserAIConfig(userId);

      const analysis = await this.aiService.analyzePost({
        subreddit: item.subreddit,
        title: item.postTitle,
        content: item.postContent || '',
        score: item.postScore || 0,
      }, aiConfig);

      const isRecommended = analysis.relevance_score >= 7;

      const updated = await prisma.engagementItem.update({
        where: { id },
        data: {
          aiAnalysis: JSON.parse(JSON.stringify(analysis)),
          relevanceScore: analysis.relevance_score,
          isRecommended,
          status: analysis.should_engage ? 'draft_ready' : 'rejected',
        },
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  };

  generate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { accountId, options } = generateBodySchema.parse(req.body);
      const userId = req.user!.userId;

      const item = await prisma.engagementItem.findFirst({
        where: { id, organizationId: req.organizationId },
      });
      if (!item) {
        throw new NotFoundError('Engagement item not found');
      }

      // Use account's persona if accountId provided, otherwise use default persona
      let persona: {
        name: string;
        backgroundStory?: string | null;
        toneOfVoice: string;
        characterTraits: unknown;
        expertiseAreas: unknown;
        goals: unknown;
        writingGuidelines?: string | null;
        exampleResponses: unknown;
      } = defaultPersona;
      let assignedAccountId: string | null = null;

      if (accountId && accountId !== '') {
        const account = await prisma.redditAccount.findFirst({
          where: { id: accountId, organizationId: req.organizationId },
          include: { persona: true },
        });

        if (account?.persona) {
          persona = account.persona;
          assignedAccountId = accountId;
        }
      }

      const aiConfig = await this.getUserAIConfig(userId);

      const draft = await this.aiService.generateResponse({
        persona,
        subreddit: item.subreddit,
        postTitle: item.postTitle,
        postContent: item.postContent || '',
        options: options as GenerationOptions,
        config: aiConfig,
      });

      const updated = await prisma.engagementItem.update({
        where: { id },
        data: {
          draftResponse: draft,
          assignedAccountId,
          status: 'draft_ready',
        },
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  };

  regenerate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const options = generationOptionsSchema.optional().parse(req.body?.options);
      const userId = req.user!.userId;

      const item = await prisma.engagementItem.findFirst({
        where: { id, organizationId: req.organizationId },
        include: {
          assignedAccount: {
            include: { persona: true },
          },
        },
      });

      if (!item) {
        throw new NotFoundError('Engagement item not found');
      }

      if (!item.assignedAccount?.persona) {
        throw new ValidationError('Account with persona required');
      }

      const aiConfig = await this.getUserAIConfig(userId);

      const draft = await this.aiService.generateResponse({
        persona: item.assignedAccount.persona,
        subreddit: item.subreddit,
        postTitle: item.postTitle,
        postContent: item.postContent || '',
        options: options as GenerationOptions,
        config: aiConfig,
      });

      const updated = await prisma.engagementItem.update({
        where: { id },
        data: {
          draftResponse: draft,
          editedResponse: null,
        },
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  };

  refine = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const refinementOptions = refineBodySchema.parse(req.body);
      const userId = req.user!.userId;

      const item = await prisma.engagementItem.findFirst({
        where: { id, organizationId: req.organizationId },
        include: {
          assignedAccount: {
            include: { persona: true },
          },
        },
      });

      if (!item) {
        throw new NotFoundError('Engagement item not found');
      }

      const currentDraft = item.editedResponse || item.draftResponse;
      if (!currentDraft) {
        throw new ValidationError('No draft to refine');
      }

      const aiConfig = await this.getUserAIConfig(userId);

      const refined = await this.aiService.refineResponse({
        currentDraft,
        subreddit: item.subreddit,
        postTitle: item.postTitle,
        persona: item.assignedAccount?.persona || undefined,
        options: refinementOptions as RefinementOptions,
        config: aiConfig,
      });

      const updated = await prisma.engagementItem.update({
        where: { id },
        data: {
          editedResponse: refined,
          status: 'in_review',
        },
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  };

  proofread = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const item = await prisma.engagementItem.findFirst({
        where: { id, organizationId: req.organizationId },
        include: {
          assignedAccount: {
            include: { persona: true },
          },
        },
      });

      if (!item) {
        throw new NotFoundError('Engagement item not found');
      }

      const textToProofread = item.editedResponse || item.draftResponse;
      if (!textToProofread) {
        throw new ValidationError('No draft to proofread');
      }

      const aiConfig = await this.getUserAIConfig(userId);

      const result = await this.aiService.proofread({
        draft: textToProofread,
        subreddit: item.subreddit,
        persona: item.assignedAccount?.persona || undefined,
        config: aiConfig,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const data = updateEngagementSchema.parse(req.body);

      const existing = await prisma.engagementItem.findFirst({
        where: { id, organizationId: req.organizationId },
      });
      if (!existing) {
        throw new NotFoundError('Engagement item not found');
      }

      const updated = await prisma.engagementItem.update({
        where: { id },
        data: {
          ...data,
          status: 'in_review',
        },
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  };

  approve = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const item = await prisma.engagementItem.findFirst({
        where: { id, organizationId: req.organizationId },
      });
      if (!item) {
        throw new NotFoundError('Engagement item not found');
      }

      const updated = await prisma.engagementItem.update({
        where: { id },
        data: {
          status: 'approved',
          reviewerId: req.user!.userId,
          reviewedAt: new Date(),
        },
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  };

  reject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const item = await prisma.engagementItem.findFirst({
        where: { id, organizationId: req.organizationId },
      });
      if (!item) {
        throw new NotFoundError('Engagement item not found');
      }

      const updated = await prisma.engagementItem.update({
        where: { id },
        data: {
          status: 'rejected',
          reviewerId: req.user!.userId,
          reviewerNotes: reason,
          reviewedAt: new Date(),
        },
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  };

  publish = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const item = await prisma.engagementItem.findFirst({
        where: { id, organizationId: req.organizationId },
        include: { assignedAccount: true },
      });

      if (!item) {
        throw new NotFoundError('Engagement item not found');
      }

      if (item.status !== 'approved') {
        throw new ValidationError('Item must be approved before publishing');
      }

      if (!item.assignedAccount) {
        throw new ValidationError('No account assigned');
      }

      const textToPublish = item.editedResponse || item.draftResponse;
      if (!textToPublish) {
        throw new ValidationError('No content to publish');
      }

      try {
        const commentId = await this.redditService.postComment(
          item.assignedAccount,
          item.redditPostId,
          textToPublish
        );

        const updated = await prisma.engagementItem.update({
          where: { id },
          data: {
            status: 'published',
            publishedAt: new Date(),
            redditCommentId: commentId,
          },
        });

        res.json(updated);
      } catch {
        await prisma.engagementItem.update({
          where: { id },
          data: { status: 'failed' },
        });
        throw new Error('Failed to publish comment');
      }
    } catch (error) {
      next(error);
    }
  };

  export = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status, subreddit, format } = exportQuerySchema.parse(req.query);

      const where: Record<string, unknown> = {
        organizationId: req.organizationId,
      };
      if (status) where.status = status;
      if (subreddit) where.subreddit = subreddit;

      const items = await prisma.engagementItem.findMany({
        where,
        include: {
          assignedAccount: {
            select: { id: true, username: true },
          },
          reviewer: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="engagements.json"');
        res.json(items);
        return;
      }

      // CSV format
      const headers = [
        'ID',
        'Status',
        'Subreddit',
        'Post Title',
        'Post Author',
        'Post URL',
        'Matched Keyword',
        'Relevance Score',
        'Assigned Account',
        'Reviewer',
        'Draft Response',
        'Created At',
        'Published At',
        'Reddit Comment ID',
      ];

      const escapeCSV = (value: string | null | undefined): string => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rows = items.map((item: typeof items[number]) => [
        item.id,
        item.status,
        item.subreddit,
        escapeCSV(item.postTitle),
        item.postAuthor,
        item.postUrl,
        item.matchedKeyword,
        item.relevanceScore,
        item.assignedAccount?.username || '',
        item.reviewer?.name || '',
        escapeCSV(item.editedResponse || item.draftResponse),
        item.createdAt.toISOString(),
        item.publishedAt?.toISOString() || '',
        item.redditCommentId || '',
      ]);

      const csv = [headers.join(','), ...rows.map((row: (string | number | null | undefined)[]) => row.join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="engagements.csv"');
      res.send(csv);
    } catch (error) {
      next(error);
    }
  };
}
