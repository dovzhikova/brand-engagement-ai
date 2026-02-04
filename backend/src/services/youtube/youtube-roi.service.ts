interface ChannelData {
  subscriberCount: number | null;
  videoCount: number | null;
  viewCount: bigint | null;
}

interface VideoData {
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  publishedAt: Date | null;
}

interface ROIFactors {
  audienceFit: number;       // 0-35: Based on AI relevance score
  engagementQuality: number; // 0-30: Based on engagement rate
  channelAuthority: number;  // 0-20: Based on subscriber tier
  growthPotential: number;   // 0-15: Based on recent activity
}

interface ROIResult {
  score: number;
  factors: ROIFactors;
  tier: 'excellent' | 'good' | 'moderate' | 'low';
  recommendation: string;
}

export class YouTubeROIService {
  /**
   * Calculate ROI/engagement value score for a YouTube channel
   */
  calculateROIScore(channel: ChannelData, videos: VideoData[], relevanceScore: number): ROIResult {
    const audienceFit = this.calculateAudienceFit(relevanceScore);
    const engagementQuality = this.calculateEngagementQuality(videos);
    const channelAuthority = this.calculateChannelAuthority(channel);
    const growthPotential = this.calculateGrowthPotential(videos);

    const totalScore = audienceFit + engagementQuality + channelAuthority + growthPotential;

    const factors: ROIFactors = {
      audienceFit,
      engagementQuality,
      channelAuthority,
      growthPotential,
    };

    return {
      score: Math.round(totalScore),
      factors,
      tier: this.getTier(totalScore),
      recommendation: this.getRecommendation(totalScore, factors),
    };
  }

  /**
   * Audience Fit Score (0-35)
   * Based on AI relevance analysis
   */
  private calculateAudienceFit(relevanceScore: number): number {
    // relevanceScore is 1-10, multiply by 3.5 to get 0-35
    return Math.round(relevanceScore * 3.5);
  }

  /**
   * Engagement Quality Score (0-30)
   * Based on average engagement rate across videos
   */
  private calculateEngagementQuality(videos: VideoData[]): number {
    if (videos.length === 0) return 15; // Default middle score

    const videosWithViews = videos.filter((v) => v.viewCount && v.viewCount > 0);
    if (videosWithViews.length === 0) return 10;

    // Calculate average engagement rate (likes + comments) / views
    const avgEngagementRate = videosWithViews.reduce((sum, v) => {
      const likes = v.likeCount || 0;
      const comments = v.commentCount || 0;
      const views = v.viewCount || 1;
      return sum + ((likes + comments) / views);
    }, 0) / videosWithViews.length;

    // Convert to percentage
    const engagementPercent = avgEngagementRate * 100;

    // Score mapping:
    // >10% engagement = 30 (excellent)
    // 5-10% = 25
    // 3-5% = 20
    // 2-3% = 15
    // 1-2% = 10
    // <1% = 5
    if (engagementPercent >= 10) return 30;
    if (engagementPercent >= 5) return 25;
    if (engagementPercent >= 3) return 20;
    if (engagementPercent >= 2) return 15;
    if (engagementPercent >= 1) return 10;
    return 5;
  }

  /**
   * Channel Authority Score (0-20)
   * Based on subscriber count tiers
   */
  private calculateChannelAuthority(channel: ChannelData): number {
    const subs = channel.subscriberCount;
    if (!subs) return 5; // Hidden or unknown

    // Subscriber tier scoring:
    if (subs >= 1000000) return 20;  // 1M+
    if (subs >= 500000) return 18;   // 500K+
    if (subs >= 100000) return 15;   // 100K+
    if (subs >= 50000) return 12;    // 50K+
    if (subs >= 10000) return 8;     // 10K+
    if (subs >= 1000) return 5;      // 1K+
    return 2;                         // <1K
  }

  /**
   * Growth Potential Score (0-15)
   * Based on posting frequency and recent activity
   */
  private calculateGrowthPotential(videos: VideoData[]): number {
    if (videos.length === 0) return 5;

    // Check recent activity (videos in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentVideos = videos.filter((v) =>
      v.publishedAt && v.publishedAt > thirtyDaysAgo
    );

    // Score based on posting frequency
    if (recentVideos.length >= 8) return 15;  // 2+ per week
    if (recentVideos.length >= 4) return 12;  // 1 per week
    if (recentVideos.length >= 2) return 9;   // 2 per month
    if (recentVideos.length >= 1) return 6;   // 1 per month
    return 3;                                  // Inactive
  }

  /**
   * Get tier classification based on total score
   */
  private getTier(score: number): 'excellent' | 'good' | 'moderate' | 'low' {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'moderate';
    return 'low';
  }

  /**
   * Generate recommendation based on score and factors
   */
  private getRecommendation(score: number, factors: ROIFactors): string {
    if (score >= 80) {
      return 'High-priority target. Strong audience alignment and engagement. Consider immediate outreach for collaboration.';
    }

    if (score >= 60) {
      if (factors.audienceFit >= 25) {
        return 'Good audience fit with decent engagement. Worth pursuing for product review or sponsored content.';
      }
      if (factors.engagementQuality >= 20) {
        return 'Strong engagement metrics. Consider for awareness campaigns if content aligns.';
      }
      return 'Solid overall profile. Monitor for opportunities or consider for broader campaigns.';
    }

    if (score >= 40) {
      if (factors.audienceFit >= 20) {
        return 'Relevant content but limited reach. May be good for niche targeting or emerging creator partnership.';
      }
      if (factors.channelAuthority >= 12) {
        return 'Established channel but limited relevance. Monitor for fitness content expansion.';
      }
      return 'Moderate potential. Add to watchlist for future opportunities.';
    }

    return 'Low priority. Limited alignment with your brand target audience or metrics.';
  }
}
