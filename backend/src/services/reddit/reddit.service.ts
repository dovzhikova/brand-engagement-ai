import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../utils/prisma';
import { encrypt, decrypt } from '../../utils/encryption';
import { logger } from '../../utils/logger';
import { redisHelpers } from '../../utils/redis';

interface RedditTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

interface RedditUserResponse {
  name: string;
  id: string;
  link_karma: number;
  comment_karma: number;
  created_utc: number;
}

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  subreddit: string;
  permalink: string;
  author: string;
  score: number;
  created_utc: number;
  num_comments: number;
}

export class RedditService {
  private clientId = process.env.REDDIT_CLIENT_ID!;
  private clientSecret = process.env.REDDIT_CLIENT_SECRET!;
  private redirectUri = process.env.REDDIT_REDIRECT_URI!;
  private userAgent = process.env.REDDIT_USER_AGENT || 'CAROLBikeEngagement/1.0';

  getAuthorizationUrl(): string {
    const state = uuidv4();

    // Store state in Redis for verification
    redisHelpers.setWithExpiry(`oauth:state:${state}`, 'pending', 600);

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      state,
      redirect_uri: this.redirectUri,
      duration: 'permanent',
      scope: 'identity read submit',
    });

    return `https://www.reddit.com/api/v1/authorize?${params}`;
  }

  async handleCallback(code: string, state: string) {
    // Verify state
    const storedState = await redisHelpers.get(`oauth:state:${state}`);
    if (!storedState) {
      throw new Error('Invalid or expired state');
    }
    await redisHelpers.delete(`oauth:state:${state}`);

    // Exchange code for tokens
    const tokens = await this.exchangeCodeForTokens(code);

    // Get user info
    const userInfo = await this.getUserInfo(tokens.access_token);

    // Calculate account age
    const accountAgeMs = Date.now() - userInfo.created_utc * 1000;
    const accountAgeDays = Math.floor(accountAgeMs / (1000 * 60 * 60 * 24));

    // Check if account already exists
    const existingAccount = await prisma.redditAccount.findFirst({
      where: { redditUserId: userInfo.id },
    });

    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    if (existingAccount) {
      // Update existing account
      return prisma.redditAccount.update({
        where: { id: existingAccount.id },
        data: {
          accessToken: encrypt(tokens.access_token),
          refreshToken: encrypt(tokens.refresh_token),
          tokenExpiresAt,
          karma: userInfo.link_karma + userInfo.comment_karma,
          accountAgeDays,
          status: existingAccount.status === 'disconnected' ? 'warming_up' : existingAccount.status,
        },
      });
    }

    // Create new account
    return prisma.redditAccount.create({
      data: {
        username: userInfo.name,
        redditUserId: userInfo.id,
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token),
        tokenExpiresAt,
        karma: userInfo.link_karma + userInfo.comment_karma,
        accountAgeDays,
        status: 'warming_up',
      },
    });
  }

  private async exchangeCodeForTokens(code: string): Promise<RedditTokenResponse> {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': this.userAgent,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    return response.json() as Promise<RedditTokenResponse>;
  }

  async refreshTokens(accountId: string): Promise<void> {
    const account = await prisma.redditAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    const refreshToken = decrypt(account.refreshToken);
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': this.userAgent,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      await prisma.redditAccount.update({
        where: { id: accountId },
        data: { status: 'disconnected' },
      });
      throw new Error('Failed to refresh tokens');
    }

    const tokens = await response.json() as RedditTokenResponse;
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await prisma.redditAccount.update({
      where: { id: accountId },
      data: {
        accessToken: encrypt(tokens.access_token),
        tokenExpiresAt,
      },
    });
  }

  private async getUserInfo(accessToken: string): Promise<RedditUserResponse> {
    const response = await fetch('https://oauth.reddit.com/api/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': this.userAgent,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    return response.json() as Promise<RedditUserResponse>;
  }

  async revokeTokens(encryptedAccessToken: string, encryptedRefreshToken: string): Promise<void> {
    try {
      const accessToken = decrypt(encryptedAccessToken);
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      await fetch('https://www.reddit.com/api/v1/revoke_token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': this.userAgent,
        },
        body: new URLSearchParams({
          token: accessToken,
          token_type_hint: 'access_token',
        }),
      });
    } catch (error) {
      logger.warn('Failed to revoke tokens:', error);
    }
  }

  async searchPosts(subreddit: string, query: string, limit = 25): Promise<RedditPost[]> {
    // Check if Reddit OAuth is properly configured
    const isOAuthConfigured = this.clientId &&
      !this.clientId.includes('your-reddit') &&
      this.clientSecret &&
      !this.clientSecret.includes('your-reddit');

    // Try using an authenticated account first (only if OAuth is configured)
    const account = isOAuthConfigured
      ? await prisma.redditAccount.findFirst({ where: { status: 'active' } })
      : null;

    if (account) {
      try {
        // Check if token needs refresh
        if (account.tokenExpiresAt < new Date()) {
          await this.refreshTokens(account.id);
        }

        const updatedAccount = await prisma.redditAccount.findUnique({
          where: { id: account.id },
        });

        const accessToken = decrypt(updatedAccount!.accessToken);

        const response = await fetch(
          `https://oauth.reddit.com/r/${subreddit}/search?q=${encodeURIComponent(query)}&restrict_sr=1&sort=new&limit=${limit}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'User-Agent': this.userAgent,
            },
          }
        );

        if (response.ok) {
          const data: any = await response.json();
          return data.data.children.map((child: { data: RedditPost }) => child.data);
        }
        // If OAuth fails, fall through to public API
        logger.warn('OAuth search failed, falling back to public API');
      } catch (error) {
        logger.warn('OAuth search error, falling back to public API:', error);
      }
    }

    // Fallback to public JSON API (no auth required for public data)
    return this.searchPostsPublic(subreddit, query, limit);
  }

  // Search using Reddit's public JSON API (no authentication required)
  async searchPostsPublic(subreddit: string, query: string, limit = 25): Promise<RedditPost[]> {
    const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=new&limit=${limit}`;

    logger.info(`Searching Reddit (public API): r/${subreddit} for "${query}"`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Reddit public API error: ${response.status}`, errorText);
      throw new Error(`Failed to search Reddit: ${response.status}`);
    }

    const data: any = await response.json();

    if (!data.data?.children) {
      logger.warn('No results from Reddit search');
      return [];
    }

    return data.data.children.map((child: { data: RedditPost }) => child.data);
  }

  async postComment(
    account: { id: string; accessToken: string; refreshToken: string; tokenExpiresAt: Date },
    postId: string,
    text: string
  ): Promise<string> {
    // Check if token needs refresh
    if (account.tokenExpiresAt < new Date()) {
      await this.refreshTokens(account.id);
    }

    const updatedAccount = await prisma.redditAccount.findUnique({
      where: { id: account.id },
    });

    const accessToken = decrypt(updatedAccount!.accessToken);

    const response = await fetch('https://oauth.reddit.com/api/comment', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': this.userAgent,
      },
      body: new URLSearchParams({
        thing_id: `t3_${postId}`,
        text,
        api_type: 'json',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to post comment');
    }

    const data: any = await response.json();

    if (data.json?.errors?.length > 0) {
      throw new Error(data.json.errors[0][1]);
    }

    return data.json.data.things[0].data.id;
  }
}
