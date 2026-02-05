import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  RefreshCw,
  Plus,
  TrendingUp,
  MousePointer,
  Eye,
  Target,
} from 'lucide-react';
import { gscApi } from '../services/api';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import {
  Alert,
  SkeletonStatsGrid,
  SkeletonList,
  Badge,
  PriorityBadge,
  ButtonSpinner,
  Select,
} from '../components/ui';

interface GoogleAccount {
  id: string;
  email: string;
  siteUrl: string;
  status: 'active' | 'disconnected' | 'token_expired';
  createdAt: string;
  _count: {
    gscKeywords: number;
    syncJobs: number;
  };
}

interface DashboardStats {
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
  trends: Array<{
    date: string;
    clicks: number;
    impressions: number;
  }>;
}

interface SyncJobStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  keywordsImported: number;
  error?: string;
}

interface KeywordSuggestion {
  query: string;
  impressions: number;
  clicks: number;
  position: number;
  ctr: number;
  suggestedPriority: number;
  suggestedCategory: string;
  reason: string;
}

export default function GSCAnalytics() {
  const queryClient = useQueryClient();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [syncJobId, setSyncJobId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState(30);

  // Fetch Google accounts
  const { data: accounts = [], isLoading: accountsLoading } = useQuery<GoogleAccount[]>({
    queryKey: ['gsc-accounts'],
    queryFn: async () => {
      const res = await gscApi.listAccounts();
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  // Auto-select first active account
  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      const activeAccount = accounts.find((a) => a.status === 'active');
      if (activeAccount) {
        setSelectedAccountId(activeAccount.id);
      }
    }
  }, [accounts, selectedAccountId]);

  // Fetch dashboard stats for selected account
  const { data: dashboardStats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['gsc-dashboard', selectedAccountId, dateRange],
    queryFn: async () => {
      if (!selectedAccountId) return null;
      const res = await gscApi.getDashboard(selectedAccountId, dateRange);
      return res.data;
    },
    enabled: !!selectedAccountId,
  });

  // Fetch keyword suggestions
  const { data: suggestions = [] } = useQuery<KeywordSuggestion[]>({
    queryKey: ['gsc-suggestions', selectedAccountId],
    queryFn: async () => {
      const res = await gscApi.getSuggestions(selectedAccountId || undefined);
      // Backend returns { suggestions: [...] }
      return Array.isArray(res.data?.suggestions) ? res.data.suggestions : [];
    },
    enabled: !!selectedAccountId,
  });

  // Poll sync status when a job is running
  const { data: syncStatus } = useQuery<SyncJobStatus>({
    queryKey: ['gsc-sync-status', syncJobId],
    queryFn: async () => {
      if (!syncJobId) return null;
      const res = await gscApi.getSyncStatus(syncJobId);
      return res.data;
    },
    enabled: !!syncJobId,
    refetchInterval: syncJobId ? 2000 : false,
  });

  // Clear sync job when completed
  useEffect(() => {
    if (syncStatus?.status === 'completed' || syncStatus?.status === 'failed') {
      setTimeout(() => {
        setSyncJobId(null);
        queryClient.invalidateQueries({ queryKey: ['gsc-dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['gsc-accounts'] });
      }, 3000);
    }
  }, [syncStatus, queryClient]);

  // Connect Google Account
  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await gscApi.initOAuth();
      return res.data;
    },
    onSuccess: (data) => {
      window.location.href = data.authUrl;
    },
  });

  // Trigger sync
  const syncMutation = useMutation({
    mutationFn: async ({ id, full }: { id: string; full?: boolean }) => {
      const res = full ? await gscApi.triggerFullSync(id) : await gscApi.triggerSync(id);
      return res.data;
    },
    onSuccess: (data) => {
      setSyncJobId(data.jobId);
    },
  });

  // Add suggested keyword
  const addKeywordMutation = useMutation({
    mutationFn: async (suggestion: KeywordSuggestion) => {
      return gscApi.addSuggestedKeyword({
        query: suggestion.query,
        priority: suggestion.suggestedPriority,
        category: suggestion.suggestedCategory,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gsc-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['keywords'] });
    },
  });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPercent = (num: number) => `${(num * 100).toFixed(2)}%`;

  if (accountsLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Search Console Analytics"
          description="Track keyword performance and discover content opportunities"
          breadcrumbs={[{ label: 'Analytics' }, { label: 'Search Console' }]}
        />
        <SkeletonStatsGrid count={5} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonList items={6} />
          <SkeletonList items={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title="Search Console Analytics"
        description="Track keyword performance and discover content opportunities"
        breadcrumbs={[{ label: 'Analytics' }, { label: 'Search Console' }]}
        actions={
          <div className="flex items-center gap-3">
            {/* Date Range Selector */}
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(Number(e.target.value))}
              className="w-auto"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </Select>

            {/* Account Selector */}
            {accounts.length > 0 && (
              <Select
                value={selectedAccountId || ''}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-auto"
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.email}
                  </option>
                ))}
              </Select>
            )}

            {/* Sync Button */}
            {selectedAccountId && (
              <button
                onClick={() => syncMutation.mutate({ id: selectedAccountId })}
                disabled={syncMutation.isPending || !!syncJobId}
                className="btn btn-primary"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${syncJobId ? 'animate-spin' : ''}`} />
                Sync Data
              </button>
            )}

            {/* Connect Button */}
            <button
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
              className="btn btn-secondary"
            >
              {connectMutation.isPending ? (
                <ButtonSpinner className="mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Connect Account
            </button>
          </div>
        }
      />

      {/* Sync Progress */}
      {syncStatus && syncStatus.status === 'running' && (
        <Alert variant="info">
          <div className="flex-1">
            <p className="font-medium">Syncing Search Console data...</p>
            <div className="mt-2 h-2 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${syncStatus.progress}%` }}
              />
            </div>
            <p className="text-xs mt-1">
              {syncStatus.keywordsImported} keywords imported ({syncStatus.progress}%)
            </p>
          </div>
        </Alert>
      )}

      {syncStatus && syncStatus.status === 'completed' && (
        <Alert variant="success">
          Sync completed! Imported {syncStatus.keywordsImported} keywords.
        </Alert>
      )}

      {syncStatus && syncStatus.status === 'failed' && (
        <Alert variant="error">
          Sync failed: {syncStatus.error}
        </Alert>
      )}

      {/* No Account State */}
      {accounts.length === 0 && (
        <EmptyState
          icon={Search}
          title="Connect Google Search Console"
          description="Connect your Google Search Console account to import keyword data, track rankings, and discover content opportunities."
          actions={[
            {
              label: connectMutation.isPending ? 'Connecting...' : 'Connect Google Account',
              onClick: () => connectMutation.mutate(),
              primary: true,
            },
          ]}
        />
      )}

      {/* Dashboard Stats */}
      {selectedAccountId && dashboardStats && (
        <>
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="card p-6 hover:shadow-lg transition-shadow duration-200 animate-slide-up" style={{ animationDelay: '0ms' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Search className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Keywords</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {formatNumber(dashboardStats.totalKeywords)}
                  </p>
                </div>
              </div>
            </div>

            <div className="card p-6 hover:shadow-lg transition-shadow duration-200 animate-slide-up" style={{ animationDelay: '50ms' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <MousePointer className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Clicks</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {formatNumber(dashboardStats.totalClicks)}
                  </p>
                </div>
              </div>
            </div>

            <div className="card p-6 hover:shadow-lg transition-shadow duration-200 animate-slide-up" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Eye className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Impressions</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {formatNumber(dashboardStats.totalImpressions)}
                  </p>
                </div>
              </div>
            </div>

            <div className="card p-6 hover:shadow-lg transition-shadow duration-200 animate-slide-up" style={{ animationDelay: '150ms' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg CTR</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {formatPercent(dashboardStats.avgCTR)}
                  </p>
                </div>
              </div>
            </div>

            <div className="card p-6 hover:shadow-lg transition-shadow duration-200 animate-slide-up" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <Target className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg Position</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {dashboardStats.avgPosition.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Keywords */}
            <div className="card">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Top Keywords</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {dashboardStats.topKeywords.slice(0, 10).map((keyword, index) => (
                    <div key={keyword.query} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-6">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {keyword.query}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Pos: {keyword.position.toFixed(1)} | CTR:{' '}
                            {formatPercent(keyword.ctr)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {formatNumber(keyword.clicks)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">clicks</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Content Gaps */}
            <div className="card">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Content Gap Opportunities</h2>
              </div>
              <div className="p-6">
                {dashboardStats.contentGaps.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                    No content gaps identified. Great job!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {dashboardStats.contentGaps.slice(0, 8).map((gap) => (
                      <div
                        key={gap.query}
                        className="flex items-start justify-between gap-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {gap.query}
                            </p>
                            <Badge
                              variant={
                                gap.opportunity === 'high'
                                  ? 'danger'
                                  : gap.opportunity === 'medium'
                                  ? 'warning'
                                  : 'gray'
                              }
                              size="sm"
                            >
                              {gap.opportunity}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{gap.reason}</p>
                        </div>
                        <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                          <p>{formatNumber(gap.impressions)} imp</p>
                          <p>Pos: {gap.position.toFixed(1)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Keyword Suggestions */}
          {suggestions.length > 0 && (
            <div className="card">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Suggested Keywords for Reddit Discovery
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Keywords from GSC that could drive Reddit engagement
                </p>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Keyword
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Impressions
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Position
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Category
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Priority
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Reason
                        </th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {suggestions.slice(0, 15).map((suggestion) => (
                        <tr key={suggestion.query} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                            {suggestion.query}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {formatNumber(suggestion.impressions)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {suggestion.position.toFixed(1)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="gray" size="sm">
                              {suggestion.suggestedCategory}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <PriorityBadge
                              priority={suggestion.suggestedPriority as 1 | 2 | 3}
                              showLabel={false}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                            {suggestion.reason}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => addKeywordMutation.mutate(suggestion)}
                              disabled={addKeywordMutation.isPending}
                              className="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 text-sm font-medium"
                            >
                              Add
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Loading State */}
      {selectedAccountId && statsLoading && (
        <div className="space-y-6">
          <SkeletonStatsGrid count={5} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonList items={6} />
            <SkeletonList items={6} />
          </div>
        </div>
      )}
    </div>
  );
}
