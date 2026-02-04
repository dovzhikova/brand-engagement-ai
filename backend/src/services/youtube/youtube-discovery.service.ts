import { v4 as uuidv4 } from 'uuid';
import Bull from 'bull';
import { prisma } from '../../utils/prisma';
import { redis } from '../../utils/redis';
import { YouTubeService } from './youtube.service';
import { YouTubeAnalysisService } from './youtube-analysis.service';
import { YouTubeROIService } from './youtube-roi.service';
import { logger } from '../../utils/logger';

interface DiscoveryJobData {
  keywords: string[];
  maxResultsPerKeyword: number;
}

interface JobStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  channelsFound: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export class YouTubeDiscoveryService {
  private queue: Bull.Queue;
  private youtubeService = new YouTubeService();
  private analysisService = new YouTubeAnalysisService();
  private roiService = new YouTubeROIService();

  constructor() {
    this.queue = new Bull('youtube-discovery', {
      redis: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    this.setupQueueProcessor();
  }

  private setupQueueProcessor() {
    this.queue.process(async (job) => {
      const { keywords, maxResultsPerKeyword } = job.data as DiscoveryJobData;
      const jobId = job.id as string;

      try {
        // Update job status to running
        await this.updateJobStatus(jobId, {
          status: 'running',
          progress: 0,
          channelsFound: 0,
          startedAt: new Date().toISOString(),
        });

        // Also update in database
        await prisma.youTubeDiscoveryJob.update({
          where: { id: jobId },
          data: {
            status: 'running',
            startedAt: new Date(),
          },
        });

        let channelsFound = 0;
        const totalKeywords = keywords.length;
        const discoveredChannelIds = new Set<string>();

        for (let i = 0; i < keywords.length; i++) {
          const keyword = keywords[i];

          try {
            // Search for channels
            const searchResults = await this.youtubeService.searchChannels(keyword, maxResultsPerKeyword);

            // Get unique channel IDs we haven't seen in this job
            const newChannelIds = searchResults
              .map((r) => r.channelId)
              .filter((id) => !discoveredChannelIds.has(id));

            if (newChannelIds.length > 0) {
              // Get detailed channel info
              const channelDetails = await this.youtubeService.getChannelDetailsBatch(newChannelIds);

              for (const channel of channelDetails) {
                // Check if channel already exists in database
                const existing = await prisma.youTubeChannel.findUnique({
                  where: { channelId: channel.channelId },
                });

                if (!existing) {
                  // Create new channel record
                  const newChannel = await prisma.youTubeChannel.create({
                    data: {
                      channelId: channel.channelId,
                      name: channel.name,
                      description: channel.description,
                      customUrl: channel.customUrl,
                      thumbnailUrl: channel.thumbnailUrl,
                      subscriberCount: channel.subscriberCount,
                      videoCount: channel.videoCount,
                      viewCount: channel.viewCount,
                      discoveredKeyword: keyword,
                      status: 'discovered',
                      lastSyncAt: new Date(),
                    },
                  });

                  channelsFound++;
                  discoveredChannelIds.add(channel.channelId);

                  // Trigger analysis in background (non-blocking)
                  this.analyzeChannel(newChannel.id).catch((err) => {
                    logger.error(`Failed to analyze channel ${newChannel.id}:`, err);
                  });
                } else {
                  discoveredChannelIds.add(channel.channelId);
                }
              }
            }

            // Update progress
            const progress = Math.round(((i + 1) / totalKeywords) * 100);
            await this.updateJobStatus(jobId, {
              status: 'running',
              progress,
              channelsFound,
            });

            await prisma.youTubeDiscoveryJob.update({
              where: { id: jobId },
              data: {
                progress,
                channelsFound,
              },
            });

            // Rate limiting - wait between searches to avoid quota issues
            if (i < keywords.length - 1) {
              await this.sleep(500);
            }
          } catch (error) {
            logger.error(`Error searching for keyword "${keyword}":`, error);
            // Continue with next keyword
          }
        }

        // Mark job as completed
        await this.updateJobStatus(jobId, {
          status: 'completed',
          progress: 100,
          channelsFound,
          completedAt: new Date().toISOString(),
        });

        await prisma.youTubeDiscoveryJob.update({
          where: { id: jobId },
          data: {
            status: 'completed',
            progress: 100,
            channelsFound,
            completedAt: new Date(),
          },
        });

        return { channelsFound };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`YouTube discovery job ${jobId} failed:`, error);

        await this.updateJobStatus(jobId, {
          status: 'failed',
          error: errorMessage,
        });

        await prisma.youTubeDiscoveryJob.update({
          where: { id: jobId },
          data: {
            status: 'failed',
            error: errorMessage,
          },
        });

        throw error;
      }
    });
  }

  /**
   * Start a new discovery job
   */
  async startDiscovery(keywords: string[], maxResultsPerKeyword = 25): Promise<string> {
    if (!this.youtubeService.isConfigured()) {
      throw new Error('YouTube API key not configured. Please set YOUTUBE_API_KEY environment variable.');
    }

    const jobId = uuidv4();

    // Create job record in database
    await prisma.youTubeDiscoveryJob.create({
      data: {
        id: jobId,
        keywords: keywords,
        status: 'pending',
        progress: 0,
        channelsFound: 0,
      },
    });

    // Initialize status in Redis
    await this.updateJobStatus(jobId, {
      status: 'pending',
      progress: 0,
      channelsFound: 0,
    });

    // Add job to queue
    await this.queue.add(
      { keywords, maxResultsPerKeyword },
      { jobId }
    );

    return jobId;
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<JobStatus | null> {
    // Try Redis first (real-time)
    const cached = await redis.get(`youtube:discovery:${jobId}`);
    if (cached) {
      return { id: jobId, ...JSON.parse(cached) };
    }

    // Fall back to database
    const job = await prisma.youTubeDiscoveryJob.findUnique({
      where: { id: jobId },
    });

    if (!job) return null;

    return {
      id: job.id,
      status: job.status as JobStatus['status'],
      progress: job.progress,
      channelsFound: job.channelsFound,
      error: job.error || undefined,
      startedAt: job.startedAt?.toISOString(),
      completedAt: job.completedAt?.toISOString(),
    };
  }

  /**
   * List recent discovery jobs
   */
  async listJobs(limit = 20): Promise<JobStatus[]> {
    const jobs = await prisma.youTubeDiscoveryJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return jobs.map((job) => ({
      id: job.id,
      status: job.status as JobStatus['status'],
      progress: job.progress,
      channelsFound: job.channelsFound,
      error: job.error || undefined,
      startedAt: job.startedAt?.toISOString(),
      completedAt: job.completedAt?.toISOString(),
    }));
  }

  /**
   * Analyze a channel (runs after discovery)
   */
  private async analyzeChannel(channelId: string): Promise<void> {
    try {
      // Update status to analyzing
      await prisma.youTubeChannel.update({
        where: { id: channelId },
        data: { status: 'analyzing' },
      });

      const channel = await prisma.youTubeChannel.findUnique({
        where: { id: channelId },
      });

      if (!channel) return;

      // Get recent videos for content analysis
      const videos = await this.youtubeService.getChannelVideos(channel.channelId, 10);

      // Store videos
      for (const video of videos) {
        await prisma.youTubeVideo.upsert({
          where: { videoId: video.videoId },
          create: {
            videoId: video.videoId,
            channelId: channelId, // Our internal ID
            title: video.title,
            description: video.description,
            publishedAt: video.publishedAt,
            thumbnailUrl: video.thumbnailUrl,
            viewCount: video.viewCount,
            likeCount: video.likeCount,
            commentCount: video.commentCount,
          },
          update: {
            viewCount: video.viewCount,
            likeCount: video.likeCount,
            commentCount: video.commentCount,
          },
        });
      }

      // Run AI analysis
      const analysis = await this.analysisService.analyzeChannel(channel, videos);

      // Calculate ROI score
      const roi = await this.roiService.calculateROIScore(channel, videos, analysis.relevanceScore);

      // Calculate engagement rate
      const engagementRate = this.calculateEngagementRate(videos);

      // Calculate average views per video
      const avgViewsPerVideo = videos.length > 0
        ? Math.round(videos.reduce((sum, v) => sum + (v.viewCount || 0), 0) / videos.length)
        : null;

      // Update channel with analysis results
      await prisma.youTubeChannel.update({
        where: { id: channelId },
        data: {
          relevanceScore: analysis.relevanceScore,
          aiAnalysis: JSON.parse(JSON.stringify(analysis)),
          roiScore: roi.score,
          roiFactors: JSON.parse(JSON.stringify(roi.factors)),
          engagementRate,
          avgViewsPerVideo,
          status: 'analyzed',
        },
      });
    } catch (error) {
      logger.error(`Failed to analyze channel ${channelId}:`, error);
      // Don't update status on error - leave in analyzing state
    }
  }

  /**
   * Manually trigger analysis for a channel
   */
  async triggerAnalysis(channelId: string): Promise<void> {
    await this.analyzeChannel(channelId);
  }

  /**
   * Refresh channel metrics from YouTube API
   */
  async refreshChannel(channelId: string): Promise<void> {
    const channel = await prisma.youTubeChannel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new Error('Channel not found');
    }

    const details = await this.youtubeService.getChannelDetails(channel.channelId);
    if (!details) {
      throw new Error('Could not fetch channel details from YouTube');
    }

    await prisma.youTubeChannel.update({
      where: { id: channelId },
      data: {
        name: details.name,
        description: details.description,
        customUrl: details.customUrl,
        thumbnailUrl: details.thumbnailUrl,
        subscriberCount: details.subscriberCount,
        videoCount: details.videoCount,
        viewCount: details.viewCount,
        lastSyncAt: new Date(),
      },
    });

    // Re-run analysis
    await this.analyzeChannel(channelId);
  }

  private calculateEngagementRate(videos: Array<{ viewCount: number | null; likeCount: number | null; commentCount: number | null }>): number | null {
    const videosWithViews = videos.filter((v) => v.viewCount && v.viewCount > 0);
    if (videosWithViews.length === 0) return null;

    const totalEngagement = videosWithViews.reduce((sum, v) => {
      const likes = v.likeCount || 0;
      const comments = v.commentCount || 0;
      const views = v.viewCount || 1;
      return sum + ((likes + comments) / views);
    }, 0);

    // Return as percentage (0-100), averaged across videos
    return Math.round((totalEngagement / videosWithViews.length) * 10000) / 100;
  }

  private async updateJobStatus(jobId: string, status: Partial<JobStatus>): Promise<void> {
    const key = `youtube:discovery:${jobId}`;
    const existing = await redis.get(key);
    const current = existing ? JSON.parse(existing) : {};
    await redis.setex(key, 86400, JSON.stringify({ ...current, ...status })); // 24 hour TTL
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
