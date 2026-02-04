import { logger } from '../../utils/logger';

interface YouTubeChannelData {
  channelId: string;
  name: string;
  description: string | null;
  customUrl: string | null;
  thumbnailUrl: string | null;
  subscriberCount: number | null;
  videoCount: number | null;
  viewCount: bigint | null;
}

interface YouTubeVideoData {
  videoId: string;
  channelId: string;
  title: string;
  description: string | null;
  publishedAt: Date | null;
  thumbnailUrl: string | null;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
}

interface YouTubeSearchResult {
  channelId: string;
  name: string;
  description: string;
  thumbnailUrl: string | null;
}

export class YouTubeService {
  private apiKey: string;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';

  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY || '';
    if (!this.apiKey) {
      logger.warn('YOUTUBE_API_KEY not configured - YouTube features will not work');
    }
  }

  private async fetch<T>(endpoint: string, params: Record<string, string>): Promise<T> {
    if (!this.apiKey) {
      throw new Error('YouTube API key not configured');
    }

    const url = new URL(`${this.baseUrl}/${endpoint}`);
    url.searchParams.set('key', this.apiKey);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      logger.error('YouTube API error:', error);
      throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Search for YouTube channels by keyword
   */
  async searchChannels(keyword: string, maxResults = 25): Promise<YouTubeSearchResult[]> {
    interface SearchResponse {
      items: Array<{
        snippet: {
          channelId: string;
          channelTitle: string;
          description: string;
          thumbnails?: {
            default?: { url: string };
            medium?: { url: string };
          };
        };
      }>;
    }

    const response = await this.fetch<SearchResponse>('search', {
      part: 'snippet',
      type: 'channel',
      q: keyword,
      maxResults: maxResults.toString(),
      order: 'relevance',
    });

    return response.items.map((item) => ({
      channelId: item.snippet.channelId,
      name: item.snippet.channelTitle,
      description: item.snippet.description,
      thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || null,
    }));
  }

  /**
   * Get detailed channel information
   */
  async getChannelDetails(channelId: string): Promise<YouTubeChannelData | null> {
    interface ChannelResponse {
      items: Array<{
        id: string;
        snippet: {
          title: string;
          description: string;
          customUrl?: string;
          thumbnails?: {
            default?: { url: string };
            medium?: { url: string };
            high?: { url: string };
          };
        };
        statistics: {
          subscriberCount?: string;
          videoCount?: string;
          viewCount?: string;
          hiddenSubscriberCount?: boolean;
        };
      }>;
    }

    const response = await this.fetch<ChannelResponse>('channels', {
      part: 'snippet,statistics',
      id: channelId,
    });

    if (!response.items || response.items.length === 0) {
      return null;
    }

    const channel = response.items[0];
    const stats = channel.statistics;

    return {
      channelId: channel.id,
      name: channel.snippet.title,
      description: channel.snippet.description || null,
      customUrl: channel.snippet.customUrl || null,
      thumbnailUrl: channel.snippet.thumbnails?.high?.url ||
                    channel.snippet.thumbnails?.medium?.url ||
                    channel.snippet.thumbnails?.default?.url || null,
      subscriberCount: stats.hiddenSubscriberCount ? null : parseInt(stats.subscriberCount || '0', 10),
      videoCount: parseInt(stats.videoCount || '0', 10),
      viewCount: stats.viewCount ? BigInt(stats.viewCount) : null,
    };
  }

  /**
   * Get multiple channel details in a single request (batch)
   */
  async getChannelDetailsBatch(channelIds: string[]): Promise<YouTubeChannelData[]> {
    if (channelIds.length === 0) return [];

    // YouTube API allows up to 50 IDs per request
    const batchSize = 50;
    const results: YouTubeChannelData[] = [];

    for (let i = 0; i < channelIds.length; i += batchSize) {
      const batch = channelIds.slice(i, i + batchSize);

      interface ChannelResponse {
        items: Array<{
          id: string;
          snippet: {
            title: string;
            description: string;
            customUrl?: string;
            thumbnails?: {
              default?: { url: string };
              medium?: { url: string };
              high?: { url: string };
            };
          };
          statistics: {
            subscriberCount?: string;
            videoCount?: string;
            viewCount?: string;
            hiddenSubscriberCount?: boolean;
          };
        }>;
      }

      const response = await this.fetch<ChannelResponse>('channels', {
        part: 'snippet,statistics',
        id: batch.join(','),
      });

      for (const channel of response.items || []) {
        const stats = channel.statistics;
        results.push({
          channelId: channel.id,
          name: channel.snippet.title,
          description: channel.snippet.description || null,
          customUrl: channel.snippet.customUrl || null,
          thumbnailUrl: channel.snippet.thumbnails?.high?.url ||
                        channel.snippet.thumbnails?.medium?.url ||
                        channel.snippet.thumbnails?.default?.url || null,
          subscriberCount: stats.hiddenSubscriberCount ? null : parseInt(stats.subscriberCount || '0', 10),
          videoCount: parseInt(stats.videoCount || '0', 10),
          viewCount: stats.viewCount ? BigInt(stats.viewCount) : null,
        });
      }
    }

    return results;
  }

  /**
   * Get recent videos from a channel
   */
  async getChannelVideos(channelId: string, maxResults = 10): Promise<YouTubeVideoData[]> {
    // First, search for videos from the channel
    interface SearchResponse {
      items: Array<{
        id: { videoId: string };
        snippet: {
          channelId: string;
          title: string;
          description: string;
          publishedAt: string;
          thumbnails?: {
            default?: { url: string };
            medium?: { url: string };
          };
        };
      }>;
    }

    const searchResponse = await this.fetch<SearchResponse>('search', {
      part: 'snippet',
      type: 'video',
      channelId,
      order: 'date',
      maxResults: maxResults.toString(),
    });

    if (!searchResponse.items || searchResponse.items.length === 0) {
      return [];
    }

    // Get video statistics
    const videoIds = searchResponse.items.map((item) => item.id.videoId);
    const stats = await this.getVideoStats(videoIds);

    return searchResponse.items.map((item) => {
      const videoStats = stats.get(item.id.videoId);
      return {
        videoId: item.id.videoId,
        channelId: item.snippet.channelId,
        title: item.snippet.title,
        description: item.snippet.description || null,
        publishedAt: new Date(item.snippet.publishedAt),
        thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || null,
        viewCount: videoStats?.viewCount ?? null,
        likeCount: videoStats?.likeCount ?? null,
        commentCount: videoStats?.commentCount ?? null,
      };
    });
  }

  /**
   * Get video statistics for multiple videos
   */
  async getVideoStats(videoIds: string[]): Promise<Map<string, { viewCount: number; likeCount: number; commentCount: number }>> {
    if (videoIds.length === 0) return new Map();

    interface VideoResponse {
      items: Array<{
        id: string;
        statistics: {
          viewCount?: string;
          likeCount?: string;
          commentCount?: string;
        };
      }>;
    }

    // YouTube API allows up to 50 IDs per request
    const batchSize = 50;
    const results = new Map<string, { viewCount: number; likeCount: number; commentCount: number }>();

    for (let i = 0; i < videoIds.length; i += batchSize) {
      const batch = videoIds.slice(i, i + batchSize);

      const response = await this.fetch<VideoResponse>('videos', {
        part: 'statistics',
        id: batch.join(','),
      });

      for (const video of response.items || []) {
        results.set(video.id, {
          viewCount: parseInt(video.statistics.viewCount || '0', 10),
          likeCount: parseInt(video.statistics.likeCount || '0', 10),
          commentCount: parseInt(video.statistics.commentCount || '0', 10),
        });
      }
    }

    return results;
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}
