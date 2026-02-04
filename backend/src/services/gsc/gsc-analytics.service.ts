import { prisma } from '../../utils/prisma';

export interface GSCDashboardStats {
  totalKeywords: number;
  totalClicks: number;
  totalImpressions: number;
  avgCTR: number;
  avgPosition: number;
  topKeywords: Array<{
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    linkedKeywordId?: string;
  }>;
  contentGaps: Array<{
    query: string;
    impressions: number;
    position: number;
    ctr: number;
    opportunity: 'high' | 'medium' | 'low';
    reason: string;
  }>;
  deviceBreakdown: Array<{
    device: string;
    clicks: number;
    impressions: number;
  }>;
  trends: Array<{
    date: string;
    clicks: number;
    impressions: number;
  }>;
}

export interface KeywordCorrelation {
  keyword: string;
  redditEngagements: number;
  redditPublished: number;
  gscClicks: number;
  gscImpressions: number;
  avgPosition: number;
}

export interface KeywordSuggestion {
  query: string;
  impressions: number;
  clicks: number;
  position: number;
  ctr: number;
  suggestedPriority: number;
  suggestedCategory: 'core' | 'broad' | 'competitor' | 'brand';
  reason: string;
}

export class GSCAnalyticsService {
  async getDashboardStats(googleAccountId: string, days: number = 30): Promise<GSCDashboardStats> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Aggregate metrics
    const aggregates = await prisma.gSCKeyword.aggregate({
      where: {
        googleAccountId,
        dataDate: { gte: startDate },
      },
      _sum: {
        clicks: true,
        impressions: true,
      },
      _avg: {
        ctr: true,
        position: true,
      },
    });

    // Count unique queries
    const uniqueKeywords = await prisma.gSCKeyword.groupBy({
      by: ['query'],
      where: {
        googleAccountId,
        dataDate: { gte: startDate },
      },
    });

    // Top performing keywords (by clicks)
    const topKeywords = await prisma.gSCKeyword.groupBy({
      by: ['query', 'linkedKeywordId'],
      where: {
        googleAccountId,
        dataDate: { gte: startDate },
      },
      _sum: {
        clicks: true,
        impressions: true,
      },
      _avg: {
        ctr: true,
        position: true,
      },
      orderBy: {
        _sum: { clicks: 'desc' },
      },
      take: 20,
    });

    // Content gaps
    const contentGaps = await this.identifyContentGaps(googleAccountId, startDate);

    // Device breakdown
    const deviceBreakdown = await prisma.gSCKeyword.groupBy({
      by: ['device'],
      where: {
        googleAccountId,
        dataDate: { gte: startDate },
        device: { not: null },
      },
      _sum: {
        clicks: true,
        impressions: true,
      },
    });

    // Daily trends
    const trends = await this.getDailyTrends(googleAccountId, days);

    return {
      totalKeywords: uniqueKeywords.length,
      totalClicks: aggregates._sum.clicks || 0,
      totalImpressions: aggregates._sum.impressions || 0,
      avgCTR: aggregates._avg.ctr || 0,
      avgPosition: aggregates._avg.position || 0,
      topKeywords: topKeywords.map((k: typeof topKeywords[number]) => ({
        query: k.query,
        clicks: k._sum.clicks || 0,
        impressions: k._sum.impressions || 0,
        ctr: k._avg.ctr || 0,
        position: k._avg.position || 0,
        linkedKeywordId: k.linkedKeywordId || undefined,
      })),
      contentGaps,
      deviceBreakdown: deviceBreakdown.map((d: typeof deviceBreakdown[number]) => ({
        device: d.device || 'unknown',
        clicks: d._sum.clicks || 0,
        impressions: d._sum.impressions || 0,
      })),
      trends,
    };
  }

  private async identifyContentGaps(
    googleAccountId: string,
    startDate: Date
  ): Promise<GSCDashboardStats['contentGaps']> {
    // Find keywords with high impressions but low CTR or poor position
    const keywords = await prisma.gSCKeyword.groupBy({
      by: ['query'],
      where: {
        googleAccountId,
        dataDate: { gte: startDate },
        impressions: { gte: 50 }, // Minimum visibility threshold
        linkedKeywordId: null, // Not yet tracked internally
      },
      _sum: { impressions: true, clicks: true },
      _avg: { position: true, ctr: true },
      orderBy: { _sum: { impressions: 'desc' } },
      take: 100,
    });

    return keywords
      .filter((k: typeof keywords[number]) => {
        const position = k._avg.position || 0;
        const ctr = k._avg.ctr || 0;
        // Content gap criteria: high impressions with poor performance
        return position > 10 || ctr < 0.02;
      })
      .map((k: typeof keywords[number]) => {
        const position = k._avg.position || 0;
        const ctr = k._avg.ctr || 0;
        const impressions = k._sum.impressions || 0;

        let opportunity: 'high' | 'medium' | 'low';
        let reason: string;

        if (impressions > 1000 && position > 20) {
          opportunity = 'high';
          reason = 'High search volume, not ranking well - significant opportunity';
        } else if (position > 10 && position <= 20 && ctr < 0.01) {
          opportunity = 'high';
          reason = 'Page 2 ranking with low CTR - close to breaking through';
        } else if (impressions > 500 && position > 10) {
          opportunity = 'medium';
          reason = 'Moderate search volume with room for improvement';
        } else if (impressions > 200) {
          opportunity = 'medium';
          reason = 'Decent visibility - optimization could help';
        } else {
          opportunity = 'low';
          reason = 'Lower priority opportunity';
        }

        return {
          query: k.query,
          impressions,
          position,
          ctr,
          opportunity,
          reason,
        };
      })
      .filter((g: { opportunity: string }) => g.opportunity !== 'low')
      .slice(0, 20);
  }

  private async getDailyTrends(
    googleAccountId: string,
    days: number
  ): Promise<Array<{ date: string; clicks: number; impressions: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dailyData = await prisma.gSCKeyword.groupBy({
      by: ['dataDate'],
      where: {
        googleAccountId,
        dataDate: { gte: startDate },
      },
      _sum: {
        clicks: true,
        impressions: true,
      },
      orderBy: { dataDate: 'asc' },
    });

    return dailyData.map((d: typeof dailyData[number]) => ({
      date: d.dataDate.toISOString().split('T')[0],
      clicks: d._sum.clicks || 0,
      impressions: d._sum.impressions || 0,
    }));
  }

  async getKeywordCorrelations(days: number = 30): Promise<KeywordCorrelation[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get keywords that have both GSC data and internal keywords
    const linkedKeywords = await prisma.keyword.findMany({
      where: {
        isActive: true,
        gscKeywords: { some: {} },
      },
      include: {
        gscKeywords: {
          where: { dataDate: { gte: startDate } },
        },
      },
    });

    const correlations: KeywordCorrelation[] = [];

    for (const keyword of linkedKeywords) {
      // Count Reddit engagements for this keyword
      const engagementCount = await prisma.engagementItem.count({
        where: {
          matchedKeyword: keyword.keyword,
          createdAt: { gte: startDate },
        },
      });

      const publishedCount = await prisma.engagementItem.count({
        where: {
          matchedKeyword: keyword.keyword,
          status: 'published',
          publishedAt: { gte: startDate },
        },
      });

      // Aggregate GSC metrics for this keyword
      const gscMetrics = keyword.gscKeywords.reduce(
        (acc: { clicks: number; impressions: number; positionSum: number; count: number }, k: { clicks: number; impressions: number; position: number }) => ({
          clicks: acc.clicks + k.clicks,
          impressions: acc.impressions + k.impressions,
          positionSum: acc.positionSum + k.position,
          count: acc.count + 1,
        }),
        { clicks: 0, impressions: 0, positionSum: 0, count: 0 }
      );

      correlations.push({
        keyword: keyword.keyword,
        redditEngagements: engagementCount,
        redditPublished: publishedCount,
        gscClicks: gscMetrics.clicks,
        gscImpressions: gscMetrics.impressions,
        avgPosition: gscMetrics.count > 0 ? gscMetrics.positionSum / gscMetrics.count : 0,
      });
    }

    return correlations.sort((a, b) => b.gscImpressions - a.gscImpressions);
  }

  async suggestKeywordsForDiscovery(googleAccountId: string): Promise<KeywordSuggestion[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    // Find high-opportunity GSC keywords not in our keyword list
    const opportunities = await prisma.gSCKeyword.groupBy({
      by: ['query'],
      where: {
        googleAccountId,
        dataDate: { gte: startDate },
        linkedKeywordId: null, // Not linked to internal keyword
        impressions: { gte: 30 },
      },
      _sum: { impressions: true, clicks: true },
      _avg: { position: true, ctr: true },
      orderBy: { _sum: { impressions: 'desc' } },
      take: 100,
    });

    // Filter to relevant fitness/bike keywords
    const fitnessKeywords = opportunities.filter((o: typeof opportunities[number]) =>
      /bike|cycling|fitness|workout|exercise|cardio|hiit|spin|peloton|carol|rehit|vo2|interval|training|gym|health/i.test(
        o.query
      )
    );

    return fitnessKeywords.map((o: typeof opportunities[number]) => {
      const impressions = o._sum.impressions || 0;
      const clicks = o._sum.clicks || 0;
      const position = o._avg.position || 0;
      const ctr = o._avg.ctr || 0;
      const query = o.query.toLowerCase();

      let suggestedPriority = 2;
      let suggestedCategory: 'core' | 'broad' | 'competitor' | 'brand' = 'broad';
      let reason = '';

      // Determine category based on query content
      if (/carol|rehit/i.test(query)) {
        suggestedCategory = 'brand';
      } else if (/peloton|nordictrack|echelon|schwinn|bowflex/i.test(query)) {
        suggestedCategory = 'competitor';
      } else if (/vo2|hiit|interval|cardio fitness/i.test(query)) {
        suggestedCategory = 'core';
      }

      // Determine priority based on metrics
      if (impressions > 500 && position < 10) {
        suggestedPriority = 1;
        reason = 'High visibility, good ranking - protect and expand presence';
      } else if (impressions > 300 && position > 10) {
        suggestedPriority = 1;
        reason = 'Good visibility, ranking opportunity - priority target';
      } else if (impressions > 100) {
        suggestedPriority = 2;
        reason = 'Moderate search volume - worth tracking';
      } else {
        suggestedPriority = 3;
        reason = 'Lower volume - monitor for growth';
      }

      return {
        query: o.query,
        impressions,
        clicks,
        position,
        ctr,
        suggestedPriority,
        suggestedCategory,
        reason,
      };
    });
  }

  async getTopPages(
    googleAccountId: string,
    days: number = 30
  ): Promise<
    Array<{
      page: string;
      clicks: number;
      impressions: number;
      avgPosition: number;
    }>
  > {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const pages = await prisma.gSCKeyword.groupBy({
      by: ['page'],
      where: {
        googleAccountId,
        dataDate: { gte: startDate },
        page: { not: null },
      },
      _sum: {
        clicks: true,
        impressions: true,
      },
      _avg: {
        position: true,
      },
      orderBy: {
        _sum: { clicks: 'desc' },
      },
      take: 20,
    });

    return pages.map((p: typeof pages[number]) => ({
      page: p.page || '',
      clicks: p._sum.clicks || 0,
      impressions: p._sum.impressions || 0,
      avgPosition: p._avg.position || 0,
    }));
  }
}
