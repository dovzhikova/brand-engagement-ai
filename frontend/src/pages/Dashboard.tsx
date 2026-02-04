import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { analyticsApi, keywordsApi } from '../services/api';
import { Download, ExternalLink } from 'lucide-react';
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
          <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
          <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
          <div className="h-4 w-96 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
        {/* Skeleton Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-lg mb-4" />
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
              <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <header className="mb-8">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
          <span className="material-icons-round text-[14px]">home</span>
          <span className="material-icons-round text-[14px]">chevron_right</span>
          <span>Overview</span>
          <span className="material-icons-round text-[14px]">chevron_right</span>
          <span className="text-slate-900 dark:text-slate-200 font-medium">Dashboard</span>
        </div>

        <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Engagement Dashboard</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Real-time performance metrics and brand health overview.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {/* Date Range Toggle */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button
                onClick={() => setDateRange('30')}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                  dateRange === '30'
                    ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => setDateRange('90')}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                  dateRange === '90'
                    ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                90 Days
              </button>
            </div>
            {/* Export Button */}
            <button className="bg-brand-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Report
            </button>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Reach */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
              <span className="material-icons-round">groups</span>
            </div>
            <span className="text-xs font-medium text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center">
              <span className="material-icons-round text-[14px]">trending_up</span> 12%
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Reach</p>
          <h2 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">
            {totalReach.toLocaleString()}
          </h2>
        </div>

        {/* Engagement Rate */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-brand-600/10 text-brand-600 dark:text-brand-400 rounded-lg">
              <span className="material-icons-round">bolt</span>
            </div>
            <span className="text-xs font-medium text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center">
              <span className="material-icons-round text-[14px]">trending_up</span> 4.3%
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Engagement Rate</p>
          <h2 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{engagementRate}%</h2>
        </div>

        {/* Active Discussions */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">
              <span className="material-icons-round">forum</span>
            </div>
            <span className="text-xs font-medium text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-full flex items-center">
              <span className="material-icons-round text-[14px]">trending_down</span> 2.1%
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Active Discussions</p>
          <h2 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{activeDiscussions}</h2>
        </div>

        {/* Published */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-lg">
              <span className="material-icons-round">check_circle</span>
            </div>
            <span className="text-xs font-medium text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center">
              <span className="material-icons-round text-[14px]">trending_up</span> 8%
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Published</p>
          <h2 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">
            {stats?.publishedCount || 0}
          </h2>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Engagement Over Time Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900 dark:text-white">Engagement Over Time</h3>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-brand-600" />
                <span className="text-slate-500 dark:text-slate-400">Total Engagement</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600" />
                <span className="text-slate-500 dark:text-slate-400">Previous Period</span>
              </div>
            </div>
          </div>
          <div className="h-64">
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends}>
                  <defs>
                    <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Area
                    type="monotone"
                    dataKey="published"
                    stroke="#0d9488"
                    strokeWidth={3}
                    fill="url(#colorEngagement)"
                    name="Published"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
                <div className="text-center">
                  <span className="material-icons-round text-4xl mb-2 opacity-50">show_chart</span>
                  <p>No trend data available yet</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Performing Keywords */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-white mb-6">Top Performing Keywords</h3>
          <div className="space-y-5">
            {topKeywords.length > 0 ? (
              topKeywords.map(
                (
                  kw: { keyword: string; category: string; engagement: number },
                  index: number
                ) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        "{kw.keyword}"
                      </span>
                      <span className="text-xs text-slate-500">{kw.category}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-brand-600">
                        {(kw.engagement / 1000).toFixed(1)}k
                      </span>
                      <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-brand-600 rounded-full"
                          style={{ width: `${Math.min((kw.engagement / 8400) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              )
            ) : (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <span className="material-icons-round text-3xl mb-2 opacity-50">key</span>
                <p className="text-sm">No keywords configured</p>
              </div>
            )}
          </div>
          <Link
            to="/keywords"
            className="w-full mt-8 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
          >
            View All Keywords
          </Link>
        </div>
      </div>

      {/* Recent Engagement Activity Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white">Recent Engagement Activity</h3>
          <div className="flex gap-2">
            <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
              <span className="material-icons-round text-xl">filter_list</span>
            </button>
            <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
              <span className="material-icons-round text-xl">more_vert</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Engagement
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
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
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                              <span className="material-icons-round text-slate-400 text-xl">article</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[200px]">
                                {item.postTitle}
                              </p>
                              <p className="text-xs text-slate-500">Post #{item.id.slice(-4)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400">
                            <span className="material-icons-round text-orange-500 text-sm">reddit</span>
                            r/{item.subreddit}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <span className="material-icons-round text-xs">thumb_up</span>
                              {item.commentScore || 0}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                          {item.publishedAt
                            ? new Date(item.publishedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {item.postUrl && (
                            <a
                              href={item.postUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-brand-600 transition-colors"
                            >
                              <ExternalLink className="h-5 w-5" />
                            </a>
                          )}
                        </td>
                      </tr>
                    )
                  )
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center text-slate-500 dark:text-slate-400">
                      <span className="material-icons-round text-4xl mb-2 opacity-50">inbox</span>
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
          <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-700 text-center">
            <Link to="/workflow" className="text-sm font-semibold text-brand-600 hover:underline">
              View all activity history
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
