import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../utils/prisma';
import { encrypt, decrypt } from '../../utils/encryption';
import { logger } from '../../utils/logger';
import { redisHelpers } from '../../utils/redis';

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface GoogleUserInfo {
  email: string;
  name?: string;
  picture?: string;
}

interface GSCSite {
  siteUrl: string;
  permissionLevel: string;
}

export interface GSCSearchAnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCSearchAnalyticsResponse {
  rows?: GSCSearchAnalyticsRow[];
  responseAggregationType?: string;
}

export class GoogleService {
  private clientId = process.env.GOOGLE_CLIENT_ID || '';
  private clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  private redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/gsc/oauth/callback';

  // OAuth Scope for Search Console read access
  private readonly SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/userinfo.email';

  getAuthorizationUrl(): string {
    if (!this.clientId) {
      throw new Error('GOOGLE_CLIENT_ID not configured');
    }

    const state = uuidv4();

    // Store state in Redis for verification (10 min TTL, same as Reddit)
    redisHelpers.setWithExpiry(`oauth:google:state:${state}`, 'pending', 600);

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: this.SCOPE,
      access_type: 'offline', // Get refresh token
      prompt: 'consent', // Force consent to ensure refresh token
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async handleCallback(code: string, state: string) {
    // Verify state
    const storedState = await redisHelpers.get(`oauth:google:state:${state}`);
    if (!storedState) {
      throw new Error('Invalid or expired OAuth state');
    }
    await redisHelpers.delete(`oauth:google:state:${state}`);

    // Exchange code for tokens
    const tokens = await this.exchangeCodeForTokens(code);

    // Get user info and verified sites
    const userInfo = await this.getUserInfo(tokens.access_token);
    const sites = await this.getSiteList(tokens.access_token);

    if (sites.length === 0) {
      throw new Error('No verified Search Console properties found for this Google account');
    }

    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Check if account exists
    const existingAccount = await prisma.googleAccount.findFirst({
      where: { email: userInfo.email },
    });

    if (existingAccount) {
      // Update existing account
      const updated = await prisma.googleAccount.update({
        where: { id: existingAccount.id },
        data: {
          accessToken: encrypt(tokens.access_token),
          refreshToken: tokens.refresh_token
            ? encrypt(tokens.refresh_token)
            : existingAccount.refreshToken,
          tokenExpiresAt,
          status: 'active',
        },
        select: {
          id: true,
          email: true,
          siteUrl: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      logger.info(`Updated Google account: ${userInfo.email}`);
      return { account: updated, sites };
    }

    // Create new account (use first site as default)
    const newAccount = await prisma.googleAccount.create({
      data: {
        email: userInfo.email,
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token!),
        tokenExpiresAt,
        siteUrl: sites[0].siteUrl,
        status: 'active',
      },
      select: {
        id: true,
        email: true,
        siteUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info(`Created new Google account: ${userInfo.email}`);
    return { account: newAccount, sites };
  }

  private async exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('Failed to exchange code for tokens:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }

    return response.json() as Promise<GoogleTokenResponse>;
  }

  async refreshTokens(accountId: string): Promise<void> {
    const account = await prisma.googleAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error('Google account not found');
    }

    const refreshToken = decrypt(account.refreshToken);

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      logger.error('Failed to refresh Google tokens for account:', accountId);
      await prisma.googleAccount.update({
        where: { id: accountId },
        data: { status: 'token_expired' },
      });
      throw new Error('Failed to refresh Google tokens - re-authentication required');
    }

    const tokens = (await response.json()) as GoogleTokenResponse;
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await prisma.googleAccount.update({
      where: { id: accountId },
      data: {
        accessToken: encrypt(tokens.access_token),
        tokenExpiresAt,
        status: 'active',
      },
    });

    logger.info(`Refreshed tokens for Google account: ${accountId}`);
  }

  private async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error('Failed to get Google user info');
    }

    return response.json() as Promise<GoogleUserInfo>;
  }

  async getSiteList(accessToken: string): Promise<GSCSite[]> {
    const response = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('GSC API error getting site list:', { status: response.status, error: errorText });
      throw new Error(`Failed to get Search Console site list: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as { siteEntry?: GSCSite[] };
    return data.siteEntry || [];
  }

  async getAccessToken(accountId: string): Promise<string> {
    const account = await prisma.googleAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error('Google account not found');
    }

    // Check if token needs refresh (with 5 min buffer)
    const bufferMs = 5 * 60 * 1000;
    if (account.tokenExpiresAt.getTime() - bufferMs < Date.now()) {
      await this.refreshTokens(accountId);
      // Re-fetch account to get updated token
      const updatedAccount = await prisma.googleAccount.findUnique({
        where: { id: accountId },
      });
      return decrypt(updatedAccount!.accessToken);
    }

    return decrypt(account.accessToken);
  }

  async querySearchAnalytics(
    accountId: string,
    startDate: string,
    endDate: string,
    options: {
      dimensions?: ('query' | 'page' | 'country' | 'device' | 'date')[];
      rowLimit?: number;
      startRow?: number;
    } = {}
  ): Promise<GSCSearchAnalyticsResponse> {
    const account = await prisma.googleAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error('Google account not found');
    }

    const accessToken = await this.getAccessToken(accountId);
    const siteUrl = encodeURIComponent(account.siteUrl);

    const response = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${siteUrl}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: options.dimensions || ['query'],
          rowLimit: options.rowLimit || 25000,
          startRow: options.startRow || 0,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      logger.error('GSC API error:', error);
      throw new Error(`Search Console API error: ${response.status}`);
    }

    return response.json() as Promise<GSCSearchAnalyticsResponse>;
  }

  async revokeTokens(accountId: string): Promise<void> {
    try {
      const account = await prisma.googleAccount.findUnique({
        where: { id: accountId },
      });

      if (!account) return;

      const accessToken = decrypt(account.accessToken);

      // Revoke token at Google
      await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      logger.info(`Revoked tokens for Google account: ${accountId}`);
    } catch (error) {
      logger.warn('Failed to revoke Google tokens:', error);
      // Fail gracefully - token may already be invalid
    }
  }
}
