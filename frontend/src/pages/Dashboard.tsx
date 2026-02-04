import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { analyticsApi, accountsApi, alertsApi } from '../services/api';
import {
  FileText,
  CheckCircle,
  Clock,
  TrendingUp,
  MessageSquare,
  ThumbsUp,
  Users,
  Target,
  ExternalLink,
  Search,
  BarChart3,
  UserPlus,
  Gift,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { SkeletonStatsGrid, SkeletonChart, SkeletonList, StatusBadge } from '../components/ui';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#dc2626', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

export default function Dashboard() {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => analyticsApi.getDashboard(),
  });

  const { data: trendsData } = useQuery({
    queryKey: ['analytics', 'trends'],
    queryFn: () => analyticsApi.getTrends(30),
  });

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  });

  const { data: competitorSummary } = useQuery({
    queryKey: ['alerts', 'competitors', 'summary'],
    queryFn: () => alertsApi.getCompetitorSummary(),
  });

  const { data: competitorMentions } = useQuery({
    queryKey: ['alerts', 'competitors', 'high-priority'],
    queryFn: () => alertsApi.getCompetitorMentions({ priority: 'high', limit: 5 }),
  });

  const stats = dashboardData?.data;
  const trends = Array.isArray(trendsData?.data) ? trendsData.data : [];

  const accountsList = Array.isArray(accounts?.data) ? accounts.data : [];
  const activeAccounts = accountsList.filter(
    (a: { status: string }) => a.status === 'active'
  ).length;

  // Prepare pie chart data for status breakdown
  const statusData = stats?.statusBreakdown
    ? Object.entries(stats.statusBreakdown).map(([name, value]) => ({
        name: name.replace('_', ' '),
        value: value as number,
      }))
    : [];

  // Ensure array data for charts
  const topSubreddits = Array.isArray(stats?.topSubreddits) ? stats.topSubreddits : [];
  const topAccounts = Array.isArray(stats?.topAccounts) ? stats.topAccounts : [];
  const recentActivity = Array.isArray(stats?.recentActivity) ? stats.recentActivity : [];
  const byCompetitor = Array.isArray(competitorSummary?.data?.byCompetitor) ? competitorSummary.data.byCompetitor : [];
  const mentions = Array.isArray(competitorMentions?.data?.mentions) ? competitorMentions.data.mentions : [];

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Dashboard"
          description="Overview of your Reddit engagement activities"
          breadcrumbs={[{ label: 'Dashboard' }]}
        />
        <SkeletonStatsGrid count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart height={192} />
          <SkeletonList items={4} />
        </div>
      </div>
    );
  }

  // Check if there's any data to show
  const hasData = stats?.totalEngagements > 0 || stats?.publishedCount > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Dashboard"
        description="Overview of your Reddit engagement activities"
        breadcrumbs={[{ label: 'Dashboard' }]}
      />

      {/* Quick Start Banner - show if no data */}
      {!hasData && (
        <div className="card p-6 bg-gradient-to-r from-carol-50 to-red-50 dark:from-carol-900/20 dark:to-red-900/20 border-carol-200 dark:border-carol-800">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Welcome to CAROL Engage!
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Start by discovering Reddit content opportunities for your keywords.
              </p>
            </div>
            <Link to="/discovery" className="btn btn-primary whitespace-nowrap">
              <Search className="h-4 w-4 mr-2" />
              Start Discovery
            </Link>
          </div>
        </div>
      )}

      {/* Invite Team Members Banner */}
      <Link
        to="/settings"
        className="card p-5 hover:shadow-lg transition-all duration-200 group cursor-pointer bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30 group-hover:scale-110 transition-transform">
            <UserPlus className="h-6 w-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              Invite Team Members
              <Gift className="h-4 w-4 text-purple-500" />
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              Share your referral code and both get 1 week premium free
            </p>
          </div>
          <div className="text-purple-500 group-hover:translate-x-1 transition-transform">
            →
          </div>
        </div>
      </Link>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-6 hover:shadow-lg transition-shadow duration-200 animate-slide-up" style={{ animationDelay: '0ms' }}>
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Review</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {(stats?.statusBreakdown?.discovered || 0) +
                  (stats?.statusBreakdown?.analyzing || 0) +
                  (stats?.statusBreakdown?.draft_ready || 0) +
                  (stats?.statusBreakdown?.in_review || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6 hover:shadow-lg transition-shadow duration-200 animate-slide-up" style={{ animationDelay: '50ms' }}>
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Published</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {stats?.publishedCount || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6 hover:shadow-lg transition-shadow duration-200 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <ThumbsUp className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Upvotes</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {stats?.totalUpvotes || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6 hover:shadow-lg transition-shadow duration-200 animate-slide-up" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <MessageSquare className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Replies</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {stats?.totalReplies || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Trend Chart */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              <TrendingUp className="h-5 w-5 inline mr-2" />
              Publishing Trend (30 days)
            </h2>
          </div>
          <div className="h-64">
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" className="dark:opacity-30" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    tick={{ fontSize: 12 }}
                    className="dark:fill-gray-400"
                  />
                  <YAxis tick={{ fontSize: 12 }} className="dark:fill-gray-400" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--tooltip-bg, #fff)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Area
                    type="monotone"
                    dataKey="published"
                    stroke="#dc2626"
                    fill="#dc2626"
                    fillOpacity={0.2}
                    name="Published"
                  />
                  <Area
                    type="monotone"
                    dataKey="avgScore"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.2}
                    name="Avg Score"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                No trend data available yet
              </div>
            )}
          </div>
        </div>

        {/* Status Breakdown Pie Chart */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              <FileText className="h-5 w-5 inline mr-2" />
              Status Breakdown
            </h2>
          </div>
          <div className="h-64">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {statusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                No status data available yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Subreddits & Accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Subreddits */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Top Subreddits
          </h2>
          <div className="h-48">
            {topSubreddits.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSubreddits} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="dark:opacity-30" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="subreddit"
                    tick={{ fontSize: 12 }}
                    width={100}
                    tickFormatter={(value) => `r/${value}`}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#dc2626" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                No subreddit data available yet
              </div>
            )}
          </div>
        </div>

        {/* Account Status */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            <Users className="h-5 w-5 inline mr-2" />
            Account Performance
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{activeAccounts}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Accounts</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {accountsList.length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Connected</p>
              </div>
            </div>
            {topAccounts.slice(0, 3).map((account: { username: string; publishedCount: number; totalScore: number }, index: number) => (
              <div key={account.username} className="flex items-center justify-between py-2">
                <div className="flex items-center">
                  <span className="text-lg font-bold text-carol-600 mr-3">#{index + 1}</span>
                  <span className="text-gray-900 dark:text-gray-100">u/{account.username}</span>
                </div>
                <div className="text-right text-sm">
                  <span className="text-gray-900 dark:text-gray-100 font-medium">{account.publishedCount} posts</span>
                  <span className="text-gray-500 dark:text-gray-400 ml-2">· {account.totalScore} pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Competitor Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Competitor Summary */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            <Target className="h-5 w-5 inline mr-2" />
            Competitor Intelligence
          </h2>
          {competitorSummary?.data ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {competitorSummary.data.totalMentions}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Mentions</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {competitorSummary.data.highPriorityCount}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">High Priority</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Top Competitors</p>
                <div className="space-y-2">
                  {byCompetitor.slice(0, 5).map((comp: { name: string; count: number }) => (
                    <div key={comp.name} className="flex items-center justify-between">
                      <span className="text-sm text-gray-900 dark:text-gray-100">{comp.name}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{comp.count} mentions</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              No competitor data available yet
            </div>
          )}
        </div>

        {/* High Priority Opportunities */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            High Priority Opportunities
          </h2>
          {mentions.length > 0 ? (
            <div className="space-y-3">
              {mentions.map((mention: {
                engagementId: string;
                postTitle: string;
                subreddit: string;
                postUrl: string;
                competitors: string[];
                sentiment: string;
              }) => (
                <div key={mention.engagementId} className="border dark:border-gray-700 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {mention.postTitle}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        r/{mention.subreddit} · {mention.competitors.join(', ')}
                      </p>
                    </div>
                    <a
                      href={mention.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-carol-600 ml-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded ${
                    mention.sentiment === 'negative' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    mention.sentiment === 'comparison' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {mention.sentiment}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              No high priority opportunities found
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="px-6 py-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h2>
        </div>
        <div className="divide-y dark:divide-gray-700">
          {recentActivity.map((item: {
            id: string;
            postTitle: string;
            subreddit: string;
            status: string;
            publishedAt: string | null;
            commentScore: number | null;
          }) => (
            <div key={item.id} className="px-6 py-4 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {item.postTitle}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  r/{item.subreddit}
                  {item.commentScore !== null && (
                    <span className="ml-2">· {item.commentScore} pts</span>
                  )}
                </p>
              </div>
              <StatusBadge status={item.status} />
            </div>
          ))}
          {recentActivity.length === 0 && (
            <EmptyState
              icon={BarChart3}
              title="No recent activity"
              description="Run discovery to find engagement opportunities and start building your activity history."
              actions={[
                { label: 'Go to Discovery', href: '/discovery' },
              ]}
            />
          )}
        </div>
      </div>
    </div>
  );
}
