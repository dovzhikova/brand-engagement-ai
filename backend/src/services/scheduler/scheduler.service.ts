import Bull from 'bull';
import { prisma } from '../../utils/prisma';
import { DiscoveryService } from '../workflow/discovery.service';
import { logger } from '../../utils/logger';

export class SchedulerService {
  private schedulerQueue: Bull.Queue;
  private discoveryService: DiscoveryService;

  constructor() {
    this.schedulerQueue = new Bull('scheduler', {
      redis: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    this.discoveryService = new DiscoveryService();

    this.setupProcessors();
  }

  private setupProcessors() {
    // Process scheduled discovery jobs
    this.schedulerQueue.process('auto-discovery', async (job) => {
      logger.info('Running scheduled auto-discovery...');

      try {
        // Check if there are active keywords and subreddits
        const activeKeywords = await prisma.keyword.count({ where: { isActive: true } });
        const activeSubreddits = await prisma.subreddit.count({ where: { isActive: true } });

        if (activeKeywords === 0 || activeSubreddits === 0) {
          logger.info('Skipping auto-discovery: no active keywords or subreddits');
          return { skipped: true, reason: 'No active keywords or subreddits' };
        }

        // Trigger discovery with default settings
        const jobId = await this.discoveryService.triggerFetch({
          limit: 10, // Limit per search to avoid overwhelming
          userId: 'system', // System-triggered job
        });

        logger.info(`Auto-discovery triggered: ${jobId}`);
        return { jobId, triggeredAt: new Date().toISOString() };
      } catch (error) {
        logger.error('Auto-discovery failed:', error);
        throw error;
      }
    });
  }

  async startScheduledJobs() {
    // Get discovery interval from env or default to 2 hours
    const intervalHours = parseInt(process.env.DISCOVERY_INTERVAL_HOURS || '2', 10);
    const intervalMs = intervalHours * 60 * 60 * 1000;

    // Remove any existing scheduled jobs to avoid duplicates
    const existingJobs = await this.schedulerQueue.getRepeatableJobs();
    for (const job of existingJobs) {
      if (job.name === 'auto-discovery') {
        await this.schedulerQueue.removeRepeatableByKey(job.key);
        logger.info('Removed existing auto-discovery schedule');
      }
    }

    // Schedule auto-discovery to run every X hours
    await this.schedulerQueue.add(
      'auto-discovery',
      {},
      {
        repeat: {
          every: intervalMs,
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs
      }
    );

    logger.info(`Auto-discovery scheduled to run every ${intervalHours} hour(s)`);

    // Also run once on startup after a short delay (5 minutes)
    // This ensures we don't miss new posts if the server was down
    const startupDelay = parseInt(process.env.DISCOVERY_STARTUP_DELAY_MS || '300000', 10); // 5 min default

    if (startupDelay > 0) {
      await this.schedulerQueue.add(
        'auto-discovery',
        { startup: true },
        {
          delay: startupDelay,
          removeOnComplete: true,
        }
      );
      logger.info(`Initial discovery scheduled to run in ${startupDelay / 1000} seconds`);
    }
  }

  async getScheduleInfo() {
    const jobs = await this.schedulerQueue.getRepeatableJobs();
    const nextRun = await this.schedulerQueue.getDelayed();

    return {
      scheduledJobs: jobs.map(j => ({
        name: j.name,
        every: j.every,
        nextRun: j.next ? new Date(j.next).toISOString() : null,
      })),
      pendingJobs: nextRun.length,
    };
  }
}

// Singleton instance
let schedulerInstance: SchedulerService | null = null;

export function getScheduler(): SchedulerService {
  if (!schedulerInstance) {
    schedulerInstance = new SchedulerService();
  }
  return schedulerInstance;
}
