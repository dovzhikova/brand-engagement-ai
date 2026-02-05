import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { analyticsApi, keywordsApi } from '../services/api';
import { Download, ExternalLink, Users, Zap, MessageSquare, CheckCircle, TrendingUp, TrendingDown, Home, ChevronRight, BarChart3, Inbox, Key } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { StatusBadge } from '../components/ui';
import { COLORS } from '../constants/designTokens';

type DateRange = '30' | '90';

export default function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange>('30');

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => analyticsApi.getDashboard(),
  });

  const { data: trendsData } = useQuery({
    queryKey: ['analytics', 'trends', dateRange],
    queryFn: () => analyticsApi.getTrends(parseInt(dateRange)),
  });

  const { data: keywordsData } = useQuery({
    queryKey: ['keywords'],
    queryFn: () => keywordsApi.list(),
  });

  const stats = dashboardData?.data;
  const trends = Array.isArray(trendsData?.data) ? trendsData.data : [];
  const keywords = Array.isArray(keywordsData?.data) ? keywordsData.data : [];
  const recentActivity = Array.isArray(stats?.recentActivity) ? stats.recentActivity : [];

  // Calculate stats for the cards
  const totalReach =
    (stats?.totalUpvotes || 0) * 10 + (stats?.totalReplies || 0) * 50 + (stats?.publishedCount || 0) * 100;
  const engagementRate = stats?.publishedCount
    ? (((stats?.totalUpvotes || 0) + (stats?.totalReplies || 0)) / stats.publishedCount / 10).toFixed(2)
    : '0.00';
  const activeDiscussions =
    (stats?.statusBreakdown?.discovered || 0) +
    (stats?.statusBreakdown?.analyzing || 0) +
    (stats?.statusBreakdown?.draft_ready || 0) +
    (stats?.statusBreakdown?.in_review || 0);

  // Get top keywords by match count (simulated engagement)
  const topKeywords = keywords
    .filter((k: { isActive: boolean }) => k.isActive)
    .slice(0, 4)
    .map((k: { keyword: string; category?: string }, index: number) => ({
      keyword: k.keyword,
      category: k.category || 'General',
      engagement: Math.floor(8400 - index * 1500 + Math.random() * 500),
    }));

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Skeleton Header */}
        <div className="mb-8">
          <div className="h-4 w-48 bg-surface-200 dark:bg-surface-700 rounded mb-4" />
          <div className="h-8 w-64 bg-surface-200 dark:bg-surface-700 rounded mb-2" />
          <div className="h-4 w-96 bg-surface-200 dark:bg-surface-700 rounded" />
        </div>
        {/* Skeleton Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-surface-800 p-6 rounded-xl border border-surface-200 dark:border-surface-700">
              <div className="h-10 w-10 bg-surface-200 dark:bg-surface-700 rounded-lg mb-4" />
              <div className="h-4 w-24 bg-surface-200 dark:bg-surface-700 rounded mb-2" />
              <div className="h-8 w-20 bg-surface-200 dark:bg-surface-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Reach',
      value: totalReach.toLocaleString(),
      icon: Users,
      trend: '+12%',
      trendUp: true,
      gradient: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Engagement Rate',
      value: `${engagementRate}%`,
      icon: Zap,
      trend: '+4.3%',
      trendUp: true,
      gradient: 'from-primary-500 to-primary-600',
      iconBg: 'bg-primary-50 dark:bg-primary-900/20',
      iconColor: 'text-primary-600 dark:text-primary-400',
    },
    {
      label: 'Active Discussions',
      value: activeDiscussions.toString(),
      icon: MessageSquare,
      trend: '-2.1%',
      trendUp: false,
      gradient: 'from-purple-500 to-purple-600',
      iconBg: 'bg-purple-50 dark:bg-purple-900/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      label: 'Published',
      value: (stats?.publishedCount || 0).toString(),
      icon: CheckCircle,
      trend: '+8%',
      trendUp: true,
      gradient: 'from-amber-500 to-amber-600',
      iconBg: 'bg-amber-50 dark:bg-amber-900/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <header className="mb-8">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-xs text-surface-500 mb-2">
          <Home className="h-3.5 w-3.5" />
          <ChevronRight className="h-3 w-3 text-surface-400" />
          <span>Overview</span>
          <ChevronRight className="h-3 w-3 text-surface-400" />
          <span className="text-surface-900 dark:text-surface-200 font-medium">Dashboard</span>
        </div>

        <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white tracking-heading">Engagement Dashboard</h1>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
              Real-time performance metrics and brand health overview.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {/* Date Range Toggle - Pill segmented control */}
            <div className="flex bg-surface-100 dark:bg-surface-800 p-1 rounded-lg">
              <button
                onClick={() => setDateRange('30')}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                  dateRange === '30'
                    ? 'bg-white dark:bg-surface-700 shadow-sm text-surface-900 dark:text-white'
                    : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300'
                }`}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => setDateRange('90')}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                  dateRange === '90'
                    ? 'bg-white dark:bg-surface-700 shadow-sm text-surface-900 dark:text-white'
                    : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300'
                }`}
              >
                90 Days
              </button>
            </div>
            {/* Export Button */}
            <button className="btn btn-primary text-sm flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Report
            </button>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          const TrendIcon = card.trendUp ? TrendingUp : TrendingDown;
          return (
            <div key={card.label} className="relative bg-white dark:bg-surface-800 p-6 rounded-xl border border-surface-200 dark:border-surface-700 shadow-card overflow-hidden">
              {/* Top gradient bar */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient}`} />
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 ${card.iconBg} rounded-lg`}>
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                  card.trendUp
                    ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400'
                    : 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400'
                }`}>
                  <TrendIcon className="h-3 w-3" />
                  {card.trend}
                </span>
              </div>
              <p className="text-sm text-surface-500 dark:text-surface-400 font-medium">{card.label}</p>
              <h2 className="text-2xl font-bold mt-1 text-surface-900 dark:text-white tracking-tight">
                {card.value}
              </h2>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Engagement Over Time Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-surface-800 p-6 rounded-xl border border-surface-200 dark:border-surface-700 shadow-card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-surface-900 dark:text-white tracking-tight">Engagement Over Time</h3>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-primary-500" />
                <span className="text-surface-500 dark:text-surface-400">Total Engagement</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-surface-300 dark:bg-surface-600" />
                <span className="text-surface-500 dark:text-surface-400">Previous Period</span>
              </div>
            </div>
          </div>
          <div className="h-64">
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends}>
                  <defs>
                    <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary[500]} stopOpacity={0.1} />
                      <stop offset="95%" stopColor={COLORS.primary[500]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }
                    tick={{ fontSize: 11, fill: '#a8a29e' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e7e5e4',
                      borderRadius: '12px',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      padding: '8px 12px',
                    }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Area
                    type="monotone"
                    dataKey="published"
                    stroke={COLORS.primary[500]}
                    strokeWidth={2.5}
                    fill="url(#colorEngagement)"
                    name="Published"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-surface-500 dark:text-surface-400">
                <div className="text-center">
                  <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No trend data available yet</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Performing Keywords */}
        <div className="bg-white dark:bg-surface-800 p-6 rounded-xl border border-surface-200 dark:border-surface-700 shadow-card">
          <h3 className="font-bold text-surface-900 dark:text-white mb-6 tracking-tight">Top Performing Keywords</h3>
          <div className="space-y-5">
            {topKeywords.length > 0 ? (
              topKeywords.map(
                (
                  kw: { keyword: string; category: string; engagement: number },
                  index: number
                ) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                        "{kw.keyword}"
                      </span>
                      <span className="text-xs text-surface-500">{kw.category}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                        {(kw.engagement / 1000).toFixed(1)}k
                      </span>
                      <div className="w-24 h-1.5 bg-surface-100 dark:bg-surface-700 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full"
                          style={{ width: `${Math.min((kw.engagement / 8400) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              )
            ) : (
              <div className="text-center py-8 text-surface-500 dark:text-surface-400">
                <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No keywords configured</p>
              </div>
            )}
          </div>
          <Link
            to="/keywords"
            className="w-full mt-8 py-2 text-sm font-medium text-surface-500 dark:text-surface-400 border border-surface-200 dark:border-surface-700 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors flex items-center justify-center"
          >
            View All Keywords
          </Link>
        </div>
      </div>

      {/* Recent Engagement Activity Table */}
      <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 shadow-card overflow-hidden">
        <div className="p-6 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between">
          <h3 className="font-bold text-surface-900 dark:text-white tracking-tight">Recent Engagement Activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="table-modern">
            <thead>
              <tr>
                <th>Item</th>
                <th>Source</th>
                <th>Status</th>
                <th>Engagement</th>
                <th>Date</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {recentActivity.length > 0 ? (
                recentActivity
                  .slice(0, 5)
                  .map(
                    (item: {
                      id: string;
                      postTitle: string;
                      subreddit: string;
                      status: string;
                      publishedAt: string | null;
                      commentScore: number | null;
                      postUrl?: string;
                    }) => (
                      <tr key={item.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-surface-100 dark:bg-surface-700 flex items-center justify-center">
                              <MessageSquare className="h-5 w-5 text-surface-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-surface-900 dark:text-white truncate max-w-[200px]">
                                {item.postTitle}
                              </p>
                              <p className="text-xs text-surface-500">Post #{item.id.slice(-4)}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="flex items-center gap-1.5 text-sm font-medium text-surface-600 dark:text-surface-400">
                            r/{item.subreddit}
                          </span>
                        </td>
                        <td>
                          <StatusBadge status={item.status} />
                        </td>
                        <td>
                          <div className="flex items-center gap-1 text-sm text-surface-600 dark:text-surface-400">
                            <TrendingUp className="h-3.5 w-3.5" />
                            {item.commentScore || 0}
                          </div>
                        </td>
                        <td className="text-sm text-surface-500 dark:text-surface-400">
                          {item.publishedAt
                            ? new Date(item.publishedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : '-'}
                        </td>
                        <td className="text-right">
                          {item.postUrl && (
                            <a
                              href={item.postUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-surface-400 hover:text-primary-600 transition-colors"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </td>
                      </tr>
                    )
                  )
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center text-surface-500 dark:text-surface-400">
                      <Inbox className="h-10 w-10 mb-2 opacity-50" />
                      <p className="font-medium">No recent activity</p>
                      <p className="text-sm mt-1">
                        Run discovery to find engagement opportunities
                      </p>
                      <Link
                        to="/workflow"
                        className="mt-4 btn btn-primary text-sm"
                      >
                        Go to Workflow
                      </Link>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {recentActivity.length > 0 && (
          <div className="p-4 bg-surface-50 dark:bg-surface-800/30 border-t border-surface-200 dark:border-surface-700 text-center">
            <Link to="/workflow" className="text-sm font-semibold text-primary-600 dark:text-primary-400 link-hover">
              View all activity history
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
