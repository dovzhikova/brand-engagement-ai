import axios from 'axios';
import { prisma } from '../../utils/prisma';

export interface ShadowbanCheckResult {
  accountId: string;
  username: string;
  isShadowbanned: boolean;
  checkMethod: 'profile' | 'comment_visibility' | 'both';
  lastChecked: Date;
  details?: {
    profileAccessible: boolean;
    recentCommentsVisible: number;
    recentCommentsTotal: number;
  };
}

export class ShadowbanService {
  /**
   * Check if a Reddit account might be shadowbanned
   * Uses multiple methods:
   * 1. Profile accessibility check (logged out view)
   * 2. Comment visibility check (compare visible vs posted)
   */
  async checkShadowban(accountId: string): Promise<ShadowbanCheckResult> {
    const account = await prisma.redditAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    const profileCheck = await this.checkProfileAccessibility(account.username);
    const commentCheck = await this.checkCommentVisibility(accountId, account.username);

    const isShadowbanned = !profileCheck.accessible ||
      (commentCheck.total > 0 && commentCheck.visible / commentCheck.total < 0.5);

    // Update account with shadowban status
    await prisma.redditAccount.update({
      where: { id: accountId },
      data: {
        lastShadowbanCheck: new Date(),
        shadowbanStatus: isShadowbanned ? 'suspected' : 'clear',
      },
    });

    return {
      accountId,
      username: account.username,
      isShadowbanned,
      checkMethod: 'both',
      lastChecked: new Date(),
      details: {
        profileAccessible: profileCheck.accessible,
        recentCommentsVisible: commentCheck.visible,
        recentCommentsTotal: commentCheck.total,
      },
    };
  }

  /**
   * Check if user profile is accessible when logged out
   */
  private async checkProfileAccessibility(username: string): Promise<{ accessible: boolean }> {
    try {
      const response = await axios.get(`https://www.reddit.com/user/${username}/about.json`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ShadowbanChecker/1.0)',
        },
        timeout: 10000,
      });

      // Profile exists and is accessible
      return { accessible: response.status === 200 && response.data?.data?.name };
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 404) {
        // Profile not found - could be shadowbanned or deleted
        return { accessible: false };
      }
      // Other errors - assume accessible to avoid false positives
      return { accessible: true };
    }
  }

  /**
   * Check visibility of recent comments
   * Compares published comments from our system vs what's visible on Reddit
   */
  private async checkCommentVisibility(
    accountId: string,
    username: string
  ): Promise<{ visible: number; total: number }> {
    // Get recent published comments from our system
    const recentEngagements = await prisma.engagementItem.findMany({
      where: {
        assignedAccountId: accountId,
        status: 'published',
        publishedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
        redditCommentId: { not: null },
      },
      select: {
        redditCommentId: true,
        subreddit: true,
      },
      take: 10,
    });

    if (recentEngagements.length === 0) {
      return { visible: 0, total: 0 };
    }

    // Check each comment's visibility
    let visibleCount = 0;
    for (const engagement of recentEngagements) {
      if (engagement.redditCommentId) {
        const isVisible = await this.isCommentVisible(engagement.redditCommentId, engagement.subreddit);
        if (isVisible) {
          visibleCount++;
        }
      }
    }

    return {
      visible: visibleCount,
      total: recentEngagements.length,
    };
  }

  /**
   * Check if a specific comment is visible (not removed/shadowbanned)
   */
  private async isCommentVisible(commentId: string, subreddit: string): Promise<boolean> {
    try {
      const response = await axios.get(
        `https://www.reddit.com/r/${subreddit}/comments/${commentId}.json`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ShadowbanChecker/1.0)',
          },
          timeout: 10000,
        }
      );

      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Batch check all active accounts for shadowbans
   */
  async checkAllAccounts(): Promise<ShadowbanCheckResult[]> {
    const accounts = await prisma.redditAccount.findMany({
      where: {
        status: 'active',
      },
    });

    const results: ShadowbanCheckResult[] = [];
    for (const account of accounts) {
      try {
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        const result = await this.checkShadowban(account.id);
        results.push(result);
      } catch (error) {
        console.error(`Failed to check shadowban for ${account.username}:`, error);
      }
    }

    return results;
  }

  /**
   * Get accounts with suspected shadowban status
   */
  async getSuspectedShadowbans(): Promise<{
    id: string;
    username: string;
    shadowbanStatus: string | null;
    lastShadowbanCheck: Date | null;
  }[]> {
    return prisma.redditAccount.findMany({
      where: {
        shadowbanStatus: 'suspected',
      },
      select: {
        id: true,
        username: true,
        shadowbanStatus: true,
        lastShadowbanCheck: true,
      },
    });
  }
}

export const shadowbanService = new ShadowbanService();
