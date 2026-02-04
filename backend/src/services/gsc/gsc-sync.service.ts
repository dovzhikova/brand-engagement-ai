import Bull from 'bull';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../utils/prisma';
import { redisHelpers } from '../../utils/redis';
import { GoogleService } from './google.service';
import { logger } from '../../utils/logger';

interface SyncJobData {
  googleAccountId: string;
  syncType: 'daily' | 'weekly' | 'manual';
  startDate: string;
  endDate: string;
}

export interface SyncJobStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  keywordsImported: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export class GSCSyncService {
  private queue: Bull.Queue<SyncJobData>;
  private googleService: GoogleService;

  constructor() {
    this.googleService = new GoogleService();
    this.queue = new Bull<SyncJobData>('gsc-sync', {
      redis: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    this.setupQueueProcessor();
    this.setupScheduledJobs();
  }

  private setupQueueProcessor() {
    this.queue.process(async (job) => {
      const { googleAccountId, syncType, startDate, endDate } = job.data;
      const jobId = job.id as string;

      logger.info(`Starting GSC sync job ${jobId} for account ${googleAccountId}`);

      try {
        await this.updateJobStatus(jobId, {
          id: jobId,
          status: 'running',
          progress: 0,
          keywordsImported: 0,
          startedAt: new Date().toISOString(),
        });

        // Update database record
        await prisma.gSCSyncJob.update({
          where: { id: jobId },
          data: {
            status: 'running',
            startedAt: new Date(),
          },
        });

        // Fetch GSC data with pagination
        let allRows: any[] = [];
        let startRow = 0;
        const rowLimit = 25000;
        let hasMore = true;

        while (hasMore) {
          const response = await this.googleService.querySearchAnalytics(
            googleAccountId,
            startDate,
            endDate,
            {
              dimensions: ['query', 'page', 'country', 'device', 'date'],
              rowLimit,
              startRow,
            }
          );

          if (response.rows && response.rows.length > 0) {
            allRows = allRows.concat(response.rows);
            startRow += rowLimit;
            hasMore = response.rows.length === rowLimit;

            logger.info(`Fetched ${allRows.length} rows so far for job ${jobId}`);
          } else {
            hasMore = false;
          }

          // Update progress (fetching phase: 0-50%)
          await this.updateJobStatus(jobId, {
            progress: Math.min(50, Math.round((allRows.length / 50000) * 50)),
          });

          // Rate limiting - GSC API has quotas
          await this.sleep(100);
        }

        logger.info(`Total rows fetched: ${allRows.length} for job ${jobId}`);

        // Process and store keywords in batches using raw SQL for performance
        let imported = 0;
        const batchSize = 1000; // Larger batches for bulk insert

        for (let i = 0; i < allRows.length; i += batchSize) {
          const batch = allRows.slice(i, i + batchSize);

          // Prepare batch data
          const batchData = batch.map((row) => ({
            id: uuidv4(),
            googleAccountId,
            query: row.keys[0],
            page: row.keys[1] || null,
            country: row.keys[2] || null,
            device: row.keys[3] || null,
            dataDate: new Date(row.keys[4]),
            clicks: row.clicks,
            impressions: row.impressions,
            ctr: row.ctr,
            position: row.position,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          // Use createMany with skipDuplicates for bulk insert
          try {
            await prisma.gSCKeyword.createMany({
              data: batchData,
              skipDuplicates: true,
            });
          } catch (batchError) {
            // If createMany fails, fall back to individual upserts for this batch
            logger.warn(`Batch insert failed, falling back to upserts for batch at ${i}`);
            for (const data of batchData) {
              await prisma.gSCKeyword.upsert({
                where: {
                  googleAccountId_query_page_country_device_dataDate: {
                    googleAccountId: data.googleAccountId,
                    query: data.query,
                    page: data.page,
                    country: data.country,
                    device: data.device,
                    dataDate: data.dataDate,
                  },
                },
                create: data,
                update: {
                  clicks: data.clicks,
                  impressions: data.impressions,
                  ctr: data.ctr,
                  position: data.position,
                  updatedAt: new Date(),
                },
              });
            }
          }

          imported += batch.length;

          // Update progress (storing phase: 50-100%)
          if (imported % 10000 === 0 || i + batchSize >= allRows.length) {
            await this.updateJobStatus(jobId, {
              progress: 50 + Math.round((imported / allRows.length) * 50),
              keywordsImported: imported,
            });
            logger.info(`Imported ${imported}/${allRows.length} keywords for job ${jobId}`);
          }
        }

        // Link GSC keywords to internal Keywords
        await this.linkKeywords(googleAccountId);

        // Mark as completed
        await this.updateJobStatus(jobId, {
          status: 'completed',
          progress: 100,
          keywordsImported: imported,
          completedAt: new Date().toISOString(),
        });

        await prisma.gSCSyncJob.update({
          where: { id: jobId },
          data: {
            status: 'completed',
            progress: 100,
            keywordsImported: imported,
            completedAt: new Date(),
          },
        });

        logger.info(`GSC sync job ${jobId} completed. Imported ${imported} keywords.`);
        return { imported };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`GSC sync job ${jobId} failed:`, error);

        await this.updateJobStatus(jobId, {
          status: 'failed',
          error: errorMessage,
          completedAt: new Date().toISOString(),
        });

        await prisma.gSCSyncJob.update({
          where: { id: jobId },
          data: {
            status: 'failed',
            error: errorMessage,
            completedAt: new Date(),
          },
        });

        throw error;
      }
    });

    // Handle failed jobs
    this.queue.on('failed', (job, err) => {
      logger.error(`GSC sync job ${job.id} failed:`, err);
    });

    // Handle completed jobs
    this.queue.on('completed', (job, result) => {
      logger.info(`GSC sync job ${job.id} completed:`, result);
    });
  }

  private setupScheduledJobs() {
    // Check for scheduled syncs every hour
    // The actual scheduled sync will be triggered based on account settings
    this.queue.add(
      { googleAccountId: 'scheduled', syncType: 'daily', startDate: '', endDate: '' },
      {
        repeat: { cron: '0 2 * * *' }, // Daily at 2 AM
        jobId: 'gsc-scheduled-sync-check',
      }
    );

    logger.info('GSC scheduled sync configured for daily at 2 AM');
  }

  async triggerSync(
    googleAccountId: string,
    syncType: 'daily' | 'weekly' | 'manual' = 'manual'
  ): Promise<string> {
    const jobId = uuidv4();

    // Calculate date range based on sync type
    const endDate = new Date();
    const startDate = new Date();

    switch (syncType) {
      case 'daily':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'manual':
      default:
        startDate.setDate(startDate.getDate() - 30); // Last 30 days for manual
        break;
    }

    // Create sync job record in database
    await prisma.gSCSyncJob.create({
      data: {
        id: jobId,
        googleAccountId,
        syncType,
        startDate,
        endDate,
        status: 'pending',
      },
    });

    // Initialize job status in Redis
    await this.updateJobStatus(jobId, {
      id: jobId,
      status: 'pending',
      progress: 0,
      keywordsImported: 0,
    });

    // Add job to queue
    await this.queue.add(
      {
        googleAccountId,
        syncType,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      { jobId }
    );

    logger.info(`Created GSC sync job ${jobId} for account ${googleAccountId}`);
    return jobId;
  }

  async triggerFullSync(googleAccountId: string): Promise<string> {
    const jobId = uuidv4();

    // GSC provides up to 16 months of data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 16);

    // Create sync job record
    await prisma.gSCSyncJob.create({
      data: {
        id: jobId,
        googleAccountId,
        syncType: 'manual',
        startDate,
        endDate,
        status: 'pending',
      },
    });

    await this.updateJobStatus(jobId, {
      id: jobId,
      status: 'pending',
      progress: 0,
      keywordsImported: 0,
    });

    await this.queue.add(
      {
        googleAccountId,
        syncType: 'manual',
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      { jobId }
    );

    logger.info(`Created full GSC sync job ${jobId} for account ${googleAccountId} (16 months)`);
    return jobId;
  }

  private async linkKeywords(googleAccountId: string): Promise<void> {
    // Get all internal keywords
    const keywords = await prisma.keyword.findMany({
      where: { isActive: true },
    });

    logger.info(`Linking GSC keywords to ${keywords.length} internal keywords`);

    for (const keyword of keywords) {
      // Get keyword and its variants for matching
      const variants = [
        keyword.keyword.toLowerCase(),
        ...(keyword.searchVariants as string[]).map((v) => v.toLowerCase()),
      ];

      // Update GSC keywords that match this keyword (case-insensitive)
      for (const variant of variants) {
        await prisma.gSCKeyword.updateMany({
          where: {
            googleAccountId,
            query: {
              equals: variant,
              mode: 'insensitive',
            },
            linkedKeywordId: null,
          },
          data: {
            linkedKeywordId: keyword.id,
          },
        });
      }
    }

    // Count linked keywords
    const linkedCount = await prisma.gSCKeyword.count({
      where: {
        googleAccountId,
        linkedKeywordId: { not: null },
      },
    });

    logger.info(`Linked ${linkedCount} GSC keywords to internal keywords`);
  }

  async getJobStatus(jobId: string): Promise<SyncJobStatus | null> {
    return redisHelpers.getJSON<SyncJobStatus>(`gsc:sync:${jobId}`);
  }

  async getRecentJobs(googleAccountId: string, limit: number = 20): Promise<any[]> {
    return prisma.gSCSyncJob.findMany({
      where: { googleAccountId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  private async updateJobStatus(jobId: string, updates: Partial<SyncJobStatus>): Promise<void> {
    const current = (await this.getJobStatus(jobId)) || {
      id: jobId,
      status: 'pending' as const,
      progress: 0,
      keywordsImported: 0,
    };

    const updated = { ...current, ...updates };
    await redisHelpers.setJSON(`gsc:sync:${jobId}`, updated, 86400); // 24 hour TTL
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
