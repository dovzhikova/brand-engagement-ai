import { prisma } from '../../utils/prisma';

export interface DashboardStats {
  totalEngagements: number;
  statusBreakdown: Record<string, number>;
  publishedCount: number;
  avgRelevanceScore: number | null;
  avgCommentScore: number | null;
  totalUpvotes: number;
  totalReplies: number;
  topSubreddits: Array<{ subreddit: string; count: number }>;
  topAccounts: Array<{ username: string; publishedCount: number; totalScore: number }>;
  recentActivity: Array<{
    id: string;
    postTitle: string;
    subreddit: string;
    status: string;
    publishedAt: Date | null;
    commentScore: number | null;
  }>;
}

export interface TrendData {
  date: string;
  published: number;
  totalScore: number;
  avgScore: number;
}

export class AnalyticsService {
  async getDashboardStats(): Promise<DashboardStats> {
    const [
      totalEngagements,
      statusCounts,
      publishedStats,
      topSubreddits,
      topAccounts,
      recentActivity,
    ] = await Promise.all([
      // Total count
      prisma.engagementItem.count(),

      // Status breakdown
      prisma.engagementItem.groupBy({
        by: ['status'],
        _count: true,
      }),

      // Published stats with aggregations
      prisma.engagementItem.aggregate({
        where: { status: 'published' },
        _count: true,
        _avg: {
          relevanceScore: true,
          commentScore: true,
        },
        _sum: {
          commentScore: true,
          replyCount: true,
        },
      }),

      // Top subreddits
      prisma.engagementItem.groupBy({
        by: ['subreddit'],
        _count: true,
        orderBy: { _count: { subreddit: 'desc' } },
        take: 5,
      }),

      // Top performing accounts
      prisma.redditAccount.findMany({
        where: {
          engagements: {
            some: { status: 'published' },
          },
        },
        select: {
          username: true,
          _count: {
            select: {
              engagements: {
                where: { status: 'published' },
              },
            },
          },
          engagements: {
            where: { status: 'published' },
            select: { commentScore: true },
          },
        },
        take: 5,
      }),

      // Recent activity
      prisma.engagementItem.findMany({
        select: {
          id: true,
          postTitle: true,
          subreddit: true,
          status: true,
          publishedAt: true,
          commentScore: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
    ]);

    // Process status breakdown
    const statusBreakdown: Record<string, number> = {};
    statusCounts.forEach((item: { status: string; _count: number }) => {
      statusBreakdown[item.status] = item._count;
    });

    // Process top accounts
    const processedAccounts = topAccounts.map((account: typeof topAccounts[number]) => ({
      username: account.username,
      publishedCount: account._count.engagements,
      totalScore: account.engagements.reduce((sum: number, e: { commentScore: number | null }) => sum + (e.commentScore || 0), 0),
    }));

    return {
      totalEngagements,
      statusBreakdown,
      publishedCount: publishedStats._count,
      avgRelevanceScore: publishedStats._avg.relevanceScore,
      avgCommentScore: publishedStats._avg.commentScore,
      totalUpvotes: publishedStats._sum.commentScore || 0,
      totalReplies: publishedStats._sum.replyCount || 0,
      topSubreddits: topSubreddits.map((s: { subreddit: string; _count: number }) => ({
        subreddit: s.subreddit,
        count: s._count,
      })),
      topAccounts: processedAccounts.sort((a: { totalScore: number }, b: { totalScore: number }) => b.totalScore - a.totalScore),
      recentActivity,
    };
  }

  async getTrends(days: number = 30): Promise<TrendData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const published = await prisma.engagementItem.findMany({
      where: {
        status: 'published',
        publishedAt: { gte: startDate },
      },
      select: {
        publishedAt: true,
        commentScore: true,
      },
      orderBy: { publishedAt: 'asc' },
    });

    // Group by date
    const dateMap = new Map<string, { published: number; totalScore: number }>();

    published.forEach((item: { publishedAt: Date | null; commentScore: number | null }) => {
      if (item.publishedAt) {
        const date = item.publishedAt.toISOString().split('T')[0];
        const existing = dateMap.get(date) || { published: 0, totalScore: 0 };
        dateMap.set(date, {
          published: existing.published + 1,
          totalScore: existing.totalScore + (item.commentScore || 0),
        });
      }
    });

    // Convert to array
    const trends: TrendData[] = [];
    dateMap.forEach((value, date) => {
      trends.push({
        date,
        published: value.published,
        totalScore: value.totalScore,
        avgScore: value.published > 0 ? Math.round(value.totalScore / value.published) : 0,
      });
    });

    return trends.sort((a, b) => a.date.localeCompare(b.date));
  }

  async getAccountPerformance(accountId: string) {
    const account = await prisma.redditAccount.findUnique({
      where: { id: accountId },
      include: {
        persona: { select: { name: true } },
        engagements: {
          where: { status: 'published' },
          select: {
            id: true,
            subreddit: true,
            postTitle: true,
            commentScore: true,
            replyCount: true,
            publishedAt: true,
          },
          orderBy: { publishedAt: 'desc' },
        },
      },
    });

    if (!account) return null;

    const totalScore = account.engagements.reduce((sum: number, e: { commentScore: number | null }) => sum + (e.commentScore || 0), 0);
    const totalReplies = account.engagements.reduce((sum: number, e: { replyCount: number | null }) => sum + (e.replyCount || 0), 0);
    const avgScore = account.engagements.length > 0
      ? Math.round(totalScore / account.engagements.length)
      : 0;

    return {
      id: account.id,
      username: account.username,
      persona: account.persona?.name || null,
      status: account.status,
      karma: account.karma,
      publishedCount: account.engagements.length,
      totalScore,
      totalReplies,
      avgScore,
      recentEngagements: account.engagements.slice(0, 10),
    };
  }

  async getSubredditPerformance() {
    const subreddits = await prisma.engagementItem.groupBy({
      by: ['subreddit'],
      where: { status: 'published' },
      _count: true,
      _avg: { commentScore: true },
      _sum: { commentScore: true, replyCount: true },
    });

    return subreddits.map((s: typeof subreddits[number]) => ({
      subreddit: s.subreddit,
      publishedCount: s._count,
      avgScore: Math.round(s._avg.commentScore || 0),
      totalScore: s._sum.commentScore || 0,
      totalReplies: s._sum.replyCount || 0,
    })).sort((a: { totalScore: number }, b: { totalScore: number }) => b.totalScore - a.totalScore);
  }
}
