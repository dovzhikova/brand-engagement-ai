import { prisma } from '../../utils/prisma';

export interface HealthFactors {
  karmaScore: number;        // 0-25: Based on karma level
  accountAge: number;        // 0-25: Based on account age
  engagementRate: number;    // 0-25: Based on comment success rate
  shadowbanRisk: number;     // 0-25: Based on shadowban status
}

export interface AccountHealthResult {
  accountId: string;
  username: string;
  healthScore: number;       // 0-100 overall score
  healthFactors: HealthFactors;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  recommendations: string[];
  lastChecked: Date;
}

export class AccountHealthService {
  /**
   * Calculate health score for a single account
   */
  async calculateHealth(accountId: string): Promise<AccountHealthResult> {
    const account = await prisma.redditAccount.findUnique({
      where: { id: accountId },
      include: {
        engagements: {
          where: {
            status: 'published',
            publishedAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
          select: {
            commentScore: true,
            replyCount: true,
          },
        },
      },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    const healthFactors = this.calculateHealthFactors(account);
    const healthScore = Object.values(healthFactors).reduce((a, b) => a + b, 0);
    const status = this.getHealthStatus(healthScore);
    const recommendations = this.generateRecommendations(account, healthFactors);

    // Update account with health score
    await prisma.redditAccount.update({
      where: { id: accountId },
      data: {
        healthScore,
        healthFactors: JSON.parse(JSON.stringify(healthFactors)),
        lastHealthCheck: new Date(),
      },
    });

    return {
      accountId,
      username: account.username,
      healthScore,
      healthFactors,
      status,
      recommendations,
      lastChecked: new Date(),
    };
  }

  /**
   * Calculate individual health factors
   */
  private calculateHealthFactors(account: {
    karma: number | null;
    accountAgeDays: number | null;
    shadowbanStatus: string | null;
    engagements: { commentScore: number | null; replyCount: number | null }[];
  }): HealthFactors {
    // Karma score (0-25)
    const karmaScore = this.calculateKarmaScore(account.karma || 0);

    // Account age score (0-25)
    const accountAge = this.calculateAgeScore(account.accountAgeDays || 0);

    // Engagement rate (0-25)
    const engagementRate = this.calculateEngagementScore(account.engagements);

    // Shadowban risk (0-25)
    const shadowbanRisk = this.calculateShadowbanScore(account.shadowbanStatus);

    return {
      karmaScore,
      accountAge,
      engagementRate,
      shadowbanRisk,
    };
  }

  private calculateKarmaScore(karma: number): number {
    if (karma >= 10000) return 25;
    if (karma >= 5000) return 22;
    if (karma >= 2000) return 18;
    if (karma >= 1000) return 15;
    if (karma >= 500) return 12;
    if (karma >= 100) return 8;
    if (karma >= 50) return 5;
    return 2;
  }

  private calculateAgeScore(ageDays: number): number {
    if (ageDays >= 365 * 2) return 25;  // 2+ years
    if (ageDays >= 365) return 22;       // 1+ year
    if (ageDays >= 180) return 18;       // 6+ months
    if (ageDays >= 90) return 15;        // 3+ months
    if (ageDays >= 30) return 10;        // 1+ month
    if (ageDays >= 14) return 5;         // 2+ weeks
    return 2;
  }

  private calculateEngagementScore(engagements: { commentScore: number | null; replyCount: number | null }[]): number {
    if (engagements.length === 0) return 15; // Neutral if no data

    const totalScore = engagements.reduce((sum, e) => sum + (e.commentScore || 0), 0);
    const avgScore = totalScore / engagements.length;

    if (avgScore >= 10) return 25;
    if (avgScore >= 5) return 22;
    if (avgScore >= 3) return 18;
    if (avgScore >= 1) return 15;
    if (avgScore >= 0) return 10;
    return 5; // Negative average
  }

  private calculateShadowbanScore(status: string | null): number {
    switch (status) {
      case 'clear':
        return 25;
      case 'suspected':
        return 10;
      case 'confirmed':
        return 0;
      default:
        return 20; // Unknown/not checked
    }
  }

  private getHealthStatus(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    if (score >= 30) return 'poor';
    return 'critical';
  }

  private generateRecommendations(
    account: {
      karma: number | null;
      accountAgeDays: number | null;
      shadowbanStatus: string | null;
    },
    factors: HealthFactors
  ): string[] {
    const recommendations: string[] = [];

    if (factors.karmaScore < 15) {
      recommendations.push('Build karma through organic participation in communities');
    }

    if (factors.accountAge < 15) {
      recommendations.push('Account is relatively new - allow more time for natural aging');
    }

    if (factors.engagementRate < 15) {
      recommendations.push('Improve comment quality to increase average engagement score');
    }

    if (factors.shadowbanRisk < 15) {
      if (account.shadowbanStatus === 'suspected') {
        recommendations.push('Account may be shadowbanned - verify by checking comments logged out');
      } else if (account.shadowbanStatus === 'confirmed') {
        recommendations.push('Account is shadowbanned - consider retiring and using alternate account');
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Account health is optimal - maintain current engagement patterns');
    }

    return recommendations;
  }

  /**
   * Calculate health for all active accounts
   */
  async calculateAllHealthScores(): Promise<AccountHealthResult[]> {
    const accounts = await prisma.redditAccount.findMany({
      where: { status: 'active' },
      select: { id: true },
    });

    const results: AccountHealthResult[] = [];
    for (const account of accounts) {
      try {
        const result = await this.calculateHealth(account.id);
        results.push(result);
      } catch (error) {
        console.error(`Failed to calculate health for account ${account.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Get accounts with low health scores
   */
  async getLowHealthAccounts(threshold: number = 50): Promise<{
    id: string;
    username: string;
    healthScore: number | null;
    healthFactors: unknown;
    status: string;
  }[]> {
    return prisma.redditAccount.findMany({
      where: {
        OR: [
          { healthScore: { lt: threshold } },
          { healthScore: null },
        ],
        status: 'active',
      },
      select: {
        id: true,
        username: true,
        healthScore: true,
        healthFactors: true,
        status: true,
      },
    });
  }
}

export const accountHealthService = new AccountHealthService();
