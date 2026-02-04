import { prisma } from '../../utils/prisma';

export interface CompetitorMention {
  engagementId: string;
  postTitle: string;
  subreddit: string;
  postUrl: string;
  competitors: string[];
  sentiment: 'positive' | 'negative' | 'neutral' | 'comparison';
  priority: 'high' | 'medium' | 'low';
  createdAt: Date;
}

// Known competitor brands for CAROL Bike
const COMPETITORS = [
  // Major competitors
  { name: 'Peloton', variants: ['peloton', 'pelaton', 'peleton'] },
  { name: 'NordicTrack', variants: ['nordictrack', 'nordic track', 'nordictrk'] },
  { name: 'Echelon', variants: ['echelon'] },
  { name: 'SoulCycle', variants: ['soulcycle', 'soul cycle'] },
  { name: 'Bowflex', variants: ['bowflex', 'bow flex', 'velocore'] },
  { name: 'Schwinn', variants: ['schwinn', 'ic4', 'ic8'] },
  { name: 'Keiser', variants: ['keiser', 'm3i'] },
  { name: 'Concept2', variants: ['concept2', 'concept 2', 'bikeerg'] },
  { name: 'Stages', variants: ['stages cycling', 'stages bike'] },
  { name: 'Wahoo', variants: ['wahoo kickr', 'wahoo bike'] },
  { name: 'Tacx', variants: ['tacx', 'garmin tacx'] },
  // HIIT alternatives
  { name: 'Tonal', variants: ['tonal'] },
  { name: 'Mirror', variants: ['mirror fitness', 'lululemon mirror'] },
  { name: 'Hydrow', variants: ['hydrow'] },
];

// Sentiment indicators
const POSITIVE_INDICATORS = [
  'love', 'amazing', 'best', 'great', 'excellent', 'recommend', 'worth',
  'fantastic', 'perfect', 'awesome', 'impressive', 'solid'
];

const NEGATIVE_INDICATORS = [
  'hate', 'terrible', 'worst', 'avoid', 'disappointed', 'regret', 'broken',
  'poor quality', 'waste', 'scam', 'overpriced', 'problems'
];

const COMPARISON_INDICATORS = [
  'vs', 'versus', 'compared to', 'better than', 'worse than', 'difference',
  'switch from', 'alternative to', 'instead of', 'or'
];

export class CompetitorAlertService {
  /**
   * Check a post for competitor mentions
   */
  analyzePost(title: string, content: string | null): {
    competitors: string[];
    sentiment: 'positive' | 'negative' | 'neutral' | 'comparison';
    priority: 'high' | 'medium' | 'low';
  } | null {
    const text = `${title} ${content || ''}`.toLowerCase();

    // Find mentioned competitors
    const mentionedCompetitors: string[] = [];
    for (const competitor of COMPETITORS) {
      for (const variant of competitor.variants) {
        if (text.includes(variant)) {
          if (!mentionedCompetitors.includes(competitor.name)) {
            mentionedCompetitors.push(competitor.name);
          }
          break;
        }
      }
    }

    if (mentionedCompetitors.length === 0) {
      return null;
    }

    // Analyze sentiment
    const sentiment = this.analyzeSentiment(text);

    // Determine priority
    let priority: 'high' | 'medium' | 'low' = 'medium';

    // High priority: comparison posts or negative sentiment about competitor
    if (sentiment === 'comparison') {
      priority = 'high';
    } else if (sentiment === 'negative' && mentionedCompetitors.length > 0) {
      priority = 'high'; // User unhappy with competitor - opportunity!
    } else if (mentionedCompetitors.includes('Peloton')) {
      priority = 'high'; // Main competitor
    }

    // Low priority: positive sentiment about competitor
    if (sentiment === 'positive') {
      priority = 'low';
    }

    return {
      competitors: mentionedCompetitors,
      sentiment,
      priority,
    };
  }

  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' | 'comparison' {
    // Check for comparison context first
    for (const indicator of COMPARISON_INDICATORS) {
      if (text.includes(indicator)) {
        return 'comparison';
      }
    }

    let positiveCount = 0;
    let negativeCount = 0;

    for (const indicator of POSITIVE_INDICATORS) {
      if (text.includes(indicator)) {
        positiveCount++;
      }
    }

    for (const indicator of NEGATIVE_INDICATORS) {
      if (text.includes(indicator)) {
        negativeCount++;
      }
    }

    if (negativeCount > positiveCount) {
      return 'negative';
    } else if (positiveCount > negativeCount) {
      return 'positive';
    }

    return 'neutral';
  }

  /**
   * Get all engagement items with competitor mentions
   */
  async getCompetitorMentions(options?: {
    priority?: 'high' | 'medium' | 'low';
    competitor?: string;
    limit?: number;
  }): Promise<CompetitorMention[]> {
    const items = await prisma.engagementItem.findMany({
      orderBy: { createdAt: 'desc' },
      take: (options?.limit || 50) * 2, // Fetch extra to compensate for filtering
    });

    // Filter items with aiAnalysis in JavaScript
    const itemsWithAnalysis = items.filter((item: typeof items[number]) => item.aiAnalysis !== null);

    const mentions: CompetitorMention[] = [];

    for (const item of itemsWithAnalysis.slice(0, options?.limit || 50)) {
      const analysis = this.analyzePost(item.postTitle, item.postContent);
      if (analysis) {
        // Apply filters
        if (options?.priority && analysis.priority !== options.priority) {
          continue;
        }
        if (options?.competitor && !analysis.competitors.includes(options.competitor)) {
          continue;
        }

        mentions.push({
          engagementId: item.id,
          postTitle: item.postTitle,
          subreddit: item.subreddit,
          postUrl: item.postUrl,
          competitors: analysis.competitors,
          sentiment: analysis.sentiment,
          priority: analysis.priority,
          createdAt: item.createdAt,
        });
      }
    }

    return mentions;
  }

  /**
   * Get summary of competitor mentions
   */
  async getCompetitorSummary(): Promise<{
    totalMentions: number;
    byCompetitor: { name: string; count: number }[];
    bySentiment: { sentiment: string; count: number }[];
    highPriorityCount: number;
  }> {
    const mentions = await this.getCompetitorMentions({ limit: 500 });

    const competitorCounts: Record<string, number> = {};
    const sentimentCounts: Record<string, number> = {
      positive: 0,
      negative: 0,
      neutral: 0,
      comparison: 0,
    };
    let highPriorityCount = 0;

    for (const mention of mentions) {
      for (const competitor of mention.competitors) {
        competitorCounts[competitor] = (competitorCounts[competitor] || 0) + 1;
      }
      sentimentCounts[mention.sentiment]++;
      if (mention.priority === 'high') {
        highPriorityCount++;
      }
    }

    return {
      totalMentions: mentions.length,
      byCompetitor: Object.entries(competitorCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      bySentiment: Object.entries(sentimentCounts)
        .map(([sentiment, count]) => ({ sentiment, count })),
      highPriorityCount,
    };
  }

  /**
   * Get list of tracked competitors
   */
  getTrackedCompetitors(): { name: string; variants: string[] }[] {
    return COMPETITORS;
  }
}

export const competitorAlertService = new CompetitorAlertService();
