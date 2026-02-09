import { v4 as uuidv4 } from 'uuid';
import Bull from 'bull';
import { prisma } from '../../utils/prisma';
import { redis, redisHelpers } from '../../utils/redis';
import { RedditService } from '../reddit/reddit.service';
import { AIService } from '../ai/ai.service';
import { logger } from '../../utils/logger';

interface DiscoveryJobData {
  subreddits?: string[];
  keywords?: string[];
  limit: number;
  userId: string;
  brandId?: string;
}

interface JobStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  discoveredCount: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export class DiscoveryService {
  private queue: Bull.Queue;
  private redditService = new RedditService();
  private aiService = new AIService();

  constructor() {
    this.queue = new Bull('discovery', {
      redis: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    this.setupQueueProcessor();
  }

  private setupQueueProcessor() {
    this.queue.process(async (job) => {
      const { subreddits, keywords, limit, brandId } = job.data as DiscoveryJobData;
      const jobId = job.id as string;

      try {
        await this.updateJobStatus(jobId, {
          status: 'running',
          progress: 0,
          discoveredCount: 0,
          startedAt: new Date().toISOString(),
        });

        // Get active subreddits and keywords from DB if not specified
        // Subreddits are shared across all brands, keywords are brand-specific
        const targetSubreddits = subreddits?.length
          ? subreddits
          : (await prisma.subreddit.findMany({
              where: { isActive: true },
              select: { name: true },
            })).map((s: { name: string }) => s.name);

        // Filter keywords by brandId if provided
        const keywordWhere = brandId
          ? { isActive: true, brandId }
          : { isActive: true };

        const targetKeywords = keywords?.length
          ? keywords
          : (await prisma.keyword.findMany({
              where: keywordWhere,
              select: { keyword: true, searchVariants: true },
            })).flatMap((k: { keyword: string; searchVariants: unknown }) => [k.keyword, ...(k.searchVariants as string[])]);

        let discoveredCount = 0;
        const totalSearches = targetSubreddits.length * targetKeywords.length;
        let completedSearches = 0;

        for (const subreddit of targetSubreddits) {
          for (const keyword of targetKeywords) {
            try {
              const posts = await this.redditService.searchPosts(subreddit, keyword, limit);

              for (const post of posts) {
                // Check if post already exists
                const existing = await prisma.engagementItem.findFirst({
                  where: { redditPostId: post.id },
                });

                if (!existing) {
                  const newItem = await prisma.engagementItem.create({
                    data: {
                      redditPostId: post.id,
                      subreddit: post.subreddit,
                      postTitle: post.title,
                      postContent: post.selftext,
                      postUrl: `https://reddit.com${post.permalink}`,
                      postAuthor: post.author,
                      postScore: post.score,
                      postCreatedAt: new Date(post.created_utc * 1000),
                      matchedKeyword: keyword,
                      status: 'discovered',
                      brandId: brandId,
                    },
                  });
                  discoveredCount++;

                  // Auto-analyze the post (non-blocking)
                  this.analyzePost(newItem.id, post.subreddit, post.title, post.selftext || '', post.score)
                    .catch(err => logger.warn(`Auto-analyze failed for ${newItem.id}:`, err));
                }
              }

              // Rate limiting - Reddit allows 60 requests per minute
              await new Promise((resolve) => setTimeout(resolve, 1000));
            } catch (error) {
              logger.warn(`Failed to search ${subreddit} for ${keyword}:`, error);
            }

            completedSearches++;
            const progress = Math.round((completedSearches / totalSearches) * 100);

            await this.updateJobStatus(jobId, {
              progress,
              discoveredCount,
            });
          }
        }

        await this.updateJobStatus(jobId, {
          status: 'completed',
          progress: 100,
          discoveredCount,
          completedAt: new Date().toISOString(),
        });

        return { discoveredCount };
      } catch (error) {
        logger.error('Discovery job failed:', error);

        await this.updateJobStatus(jobId, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date().toISOString(),
        });

        throw error;
      }
    });
  }

  async triggerFetch(data: DiscoveryJobData): Promise<string> {
    const jobId = uuidv4();

    await this.updateJobStatus(jobId, {
      id: jobId,
      status: 'pending',
      progress: 0,
      discoveredCount: 0,
    });

    await this.queue.add(data, { jobId });

    // Update latest job reference
    await redisHelpers.setJSON('discovery:latest', {
      id: jobId,
      status: 'pending',
      progress: 0,
      discoveredCount: 0,
    });

    return jobId;
  }

  async getJobStatus(jobId: string): Promise<JobStatus | null> {
    return redisHelpers.getJSON<JobStatus>(`discovery:job:${jobId}`);
  }

  private async updateJobStatus(jobId: string, updates: Partial<JobStatus>): Promise<void> {
    const current = await this.getJobStatus(jobId) || {
      id: jobId,
      status: 'pending' as const,
      progress: 0,
      discoveredCount: 0,
    };

    const updated = { ...current, ...updates };
    await redisHelpers.setJSON(`discovery:job:${jobId}`, updated, 86400); // 24 hours TTL

    // Also update latest if this is the current job
    const latest = await redisHelpers.getJSON<{ id: string }>('discovery:latest');
    if (latest?.id === jobId) {
      await redisHelpers.setJSON('discovery:latest', updated);
    }
  }

  async getRecentJobs(): Promise<JobStatus[]> {
    const jobs = await this.queue.getJobs(['completed', 'failed', 'active', 'waiting']);
    const statuses: JobStatus[] = [];

    for (const job of jobs.slice(0, 20)) {
      const status = await this.getJobStatus(job.id as string);
      if (status) {
        statuses.push(status);
      }
    }

    return statuses;
  }

  // Auto-analyze a discovered post
  private async analyzePost(
    itemId: string,
    subreddit: string,
    title: string,
    content: string,
    score: number
  ): Promise<void> {
    try {
      logger.info(`Auto-analyzing post: ${itemId}`);

      const analysis = await this.aiService.analyzePost({
        subreddit,
        title,
        content,
        score,
      });

      // Update the engagement item with analysis results
      const newStatus = analysis.should_engage ? 'analyzing' : 'rejected';
      const isRecommended = analysis.relevance_score >= 7;

      await prisma.engagementItem.update({
        where: { id: itemId },
        data: {
          relevanceScore: analysis.relevance_score,
          aiAnalysis: analysis as object,
          status: newStatus,
          isRecommended,
        },
      });

      logger.info(`Auto-analyzed ${itemId}: relevance=${analysis.relevance_score}, engage=${analysis.should_engage}, recommended=${isRecommended}`);
    } catch (error) {
      logger.error(`Failed to auto-analyze post ${itemId}:`, error);
      // Don't throw - we don't want to fail the discovery for analysis errors
    }
  }
}
