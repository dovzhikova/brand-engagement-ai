import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../hooks/useAuthStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token refresh queue to prevent race conditions
let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (token: string | null, error: Error | null) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else if (token) {
      resolve(token);
    }
  });
  refreshQueue = [];
};

// Request interceptor to add auth token and organization header
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  // Add organization context header
  const orgId = localStorage.getItem('currentOrganizationId');
  if (orgId) {
    config.headers['X-Organization-Id'] = orgId;
  }

  return config;
});

// Response interceptor to handle token refresh with queue
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const { refreshToken, updateTokens, logout } = useAuthStore.getState();

      if (!refreshToken) {
        logout();
        return Promise.reject(error);
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      isRefreshing = true;

      try {
        const baseURL = import.meta.env.VITE_API_URL || '/api';
        const response = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

        updateTokens({ accessToken: newAccessToken, refreshToken: newRefreshToken });

        processQueue(newAccessToken, null);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(null, refreshError as Error);
        isRefreshing = false;
        logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
  me: () => api.get('/auth/me'),
};

// Accounts API
export const accountsApi = {
  list: () => api.get('/accounts'),
  get: (id: string) => api.get(`/accounts/${id}`),
  initOAuth: () => api.get('/accounts/oauth/init'),
  update: (id: string, data: { personaId?: string | null; status?: string }) =>
    api.patch(`/accounts/${id}`, data),
  delete: (id: string) => api.delete(`/accounts/${id}`),
  // Shadowban detection
  checkShadowban: (id: string) => api.post(`/accounts/${id}/shadowban/check`),
  checkAllShadowbans: () => api.get('/accounts/shadowban/check-all'),
  getSuspectedShadowbans: () => api.get('/accounts/shadowban/suspected'),
  // Health scoring
  getHealth: (id: string) => api.get(`/accounts/${id}/health`),
  getAllHealth: () => api.get('/accounts/health/all'),
  getLowHealthAccounts: (threshold?: number) =>
    api.get('/accounts/health/low', { params: { threshold } }),
};

// Personas API
export const personasApi = {
  list: () => api.get('/personas'),
  get: (id: string) => api.get(`/personas/${id}`),
  create: (data: Partial<import('../types').Persona>) =>
    api.post('/personas', data),
  update: (id: string, data: Partial<import('../types').Persona>) =>
    api.put(`/personas/${id}`, data),
  delete: (id: string) => api.delete(`/personas/${id}`),
};

// Engagements API
export const engagementsApi = {
  list: (params?: { status?: string; subreddit?: string; limit?: number; offset?: number }) =>
    api.get('/engagements', { params }),
  get: (id: string) => api.get(`/engagements/${id}`),
  analyze: (id: string) => api.post(`/engagements/${id}/analyze`),
  generate: (id: string, accountId: string, options?: import('../types').GenerationOptions) =>
    api.post(`/engagements/${id}/generate`, { accountId, options }),
  regenerate: (id: string, options?: import('../types').GenerationOptions) =>
    api.post(`/engagements/${id}/regenerate`, { options }),
  refine: (id: string, options: import('../types').RefinementOptions) =>
    api.post(`/engagements/${id}/refine`, options),
  proofread: (id: string) => api.post(`/engagements/${id}/proofread`),
  update: (id: string, data: { editedResponse?: string; assignedAccountId?: string; reviewerNotes?: string }) =>
    api.patch(`/engagements/${id}`, data),
  approve: (id: string) => api.post(`/engagements/${id}/approve`),
  reject: (id: string, reason?: string) => api.post(`/engagements/${id}/reject`, { reason }),
  publish: (id: string) => api.post(`/engagements/${id}/publish`),
  exportData: (params?: { status?: string; subreddit?: string; format?: 'csv' | 'json' }) =>
    api.get('/engagements/export', { params, responseType: 'blob' }),
};

// Discovery API
export const discoveryApi = {
  fetch: (data: { subreddits?: string[]; keywords?: string[]; limit?: number }) =>
    api.post('/discovery/fetch', data),
  getStatus: (jobId?: string) => api.get('/discovery/status', { params: { jobId } }),
  listJobs: () => api.get('/discovery/jobs'),
  getSchedule: () => api.get('/discovery/schedule'),
};

// Keywords API
export const keywordsApi = {
  list: () => api.get('/keywords'),
  create: (data: Partial<import('../types').Keyword>) =>
    api.post('/keywords', data),
  update: (id: string, data: Partial<import('../types').Keyword>) =>
    api.patch(`/keywords/${id}`, data),
  delete: (id: string) => api.delete(`/keywords/${id}`),
};

// Subreddits API
export const subredditsApi = {
  list: () => api.get('/subreddits'),
  create: (data: Partial<import('../types').Subreddit>) =>
    api.post('/subreddits', data),
  update: (id: string, data: Partial<import('../types').Subreddit>) =>
    api.patch(`/subreddits/${id}`, data),
  delete: (id: string) => api.delete(`/subreddits/${id}`),
};

// Analytics API
export const analyticsApi = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getTrends: (days?: number) => api.get('/analytics/trends', { params: { days } }),
  getSubredditPerformance: () => api.get('/analytics/subreddits'),
  getAccountPerformance: (id: string) => api.get(`/analytics/accounts/${id}`),
};

// Alerts API
export const alertsApi = {
  getCompetitorMentions: (params?: { priority?: string; competitor?: string; limit?: number }) =>
    api.get('/alerts/competitors', { params }),
  getCompetitorSummary: () => api.get('/alerts/competitors/summary'),
  getTrackedCompetitors: () => api.get('/alerts/competitors/tracked'),
  analyzePost: (title: string, content?: string) =>
    api.post('/alerts/analyze', { title, content }),
};

// Google Search Console API
export const gscApi = {
  // OAuth
  initOAuth: () => api.get('/gsc/oauth/init'),

  // Account management
  listAccounts: () => api.get('/gsc/accounts'),
  getAccount: (id: string) => api.get(`/gsc/accounts/${id}`),
  updateAccount: (id: string, data: { siteUrl?: string }) =>
    api.patch(`/gsc/accounts/${id}`, data),
  deleteAccount: (id: string) => api.delete(`/gsc/accounts/${id}`),

  // Sync operations
  triggerSync: (id: string, syncType: 'daily' | 'weekly' | 'manual' = 'manual') =>
    api.post(`/gsc/accounts/${id}/sync`, { syncType }),
  triggerFullSync: (id: string) => api.post(`/gsc/accounts/${id}/sync/full`),
  getSyncStatus: (jobId: string) => api.get(`/gsc/sync/${jobId}/status`),
  listSyncJobs: (id: string) => api.get(`/gsc/accounts/${id}/sync/jobs`),

  // Analytics (account-specific)
  getDashboard: (id: string, days?: number) =>
    api.get(`/gsc/accounts/${id}/dashboard`, { params: { days } }),
  getKeywords: (id: string, params?: { limit?: number; offset?: number; search?: string }) =>
    api.get(`/gsc/accounts/${id}/keywords`, { params }),
  getContentGaps: (id: string, days?: number) =>
    api.get(`/gsc/accounts/${id}/content-gaps`, { params: { days } }),
  getTopPages: (id: string, days?: number) =>
    api.get(`/gsc/accounts/${id}/top-pages`, { params: { days } }),

  // Cross-platform analytics
  getCorrelations: (days?: number) => api.get('/gsc/correlations', { params: { days } }),
  getSuggestions: (accountId?: string) =>
    api.get('/gsc/suggestions', { params: { accountId } }),
  addSuggestedKeyword: (data: { query: string; priority?: number; category?: string }) =>
    api.post('/gsc/suggestions/add', data),
};

// Settings API
export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data: { aiProvider?: string; aiModel?: string }) =>
    api.patch('/settings', data),
};

// Referrals API
export const referralsApi = {
  generateCode: () => api.post('/referrals/generate'),
  getStats: () => api.get('/referrals/stats'),
  validateCode: (code: string) => api.get(`/referrals/validate/${code}`),
  applyCode: (code: string) => api.post('/referrals/apply', { code }),
  getHistory: () => api.get('/referrals/history'),
};

// Organizations API
export const organizationsApi = {
  list: () => api.get('/organizations'),
  create: (data: { name: string; slug: string }) =>
    api.post('/organizations', data),
  get: (id: string) => api.get(`/organizations/${id}`),
  update: (id: string, data: { name?: string; slug?: string }) =>
    api.put(`/organizations/${id}`, data),
  delete: (id: string) => api.delete(`/organizations/${id}`),
  inviteMember: (id: string, data: { email: string; role?: 'ADMIN' | 'MEMBER' }) =>
    api.post(`/organizations/${id}/members`, data),
  removeMember: (id: string, memberId: string) =>
    api.delete(`/organizations/${id}/members/${memberId}`),
  updateMemberRole: (id: string, memberId: string, role: 'OWNER' | 'ADMIN' | 'MEMBER') =>
    api.patch(`/organizations/${id}/members/${memberId}/role`, { role }),
  leave: (id: string) => api.post(`/organizations/${id}/leave`),
};

// YouTube API
export const youtubeApi = {
  // Discovery
  discover: (data: { keywords: string[]; maxResultsPerKeyword?: number }) =>
    api.post('/youtube/discover', data),
  getDiscoveryStatus: (jobId?: string) =>
    api.get('/youtube/discover/status', { params: { jobId } }),
  listDiscoveryJobs: () => api.get('/youtube/discover/jobs'),

  // Channels
  listChannels: (params?: {
    status?: import('../types').YouTubeChannelStatus;
    category?: string;
    minRoiScore?: number;
    sortBy?: 'roiScore' | 'relevanceScore' | 'subscriberCount' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }) => api.get('/youtube/channels', { params }),
  getChannel: (id: string) => api.get(`/youtube/channels/${id}`),
  analyzeChannel: (id: string) => api.post(`/youtube/channels/${id}/analyze`),
  refreshChannel: (id: string) => api.post(`/youtube/channels/${id}/refresh`),
  updateChannel: (id: string, data: {
    status?: import('../types').YouTubeChannelStatus;
    category?: string;
    notes?: string;
  }) => api.patch(`/youtube/channels/${id}`, data),
  deleteChannel: (id: string) => api.delete(`/youtube/channels/${id}`),

  // Analytics
  getAnalytics: () => api.get('/youtube/analytics'),
};
