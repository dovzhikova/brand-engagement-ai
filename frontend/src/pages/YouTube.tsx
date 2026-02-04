import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { youtubeApi, gscApi } from '../services/api';
import {
  Youtube,
  Search,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  Users,
  Eye,
  Star,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Download,
  Database,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react';
import type { YouTubeChannel, YouTubeDiscoveryJob, YouTubeAnalytics, YouTubeChannelStatus } from '../types';
import { exportYouTubeChannels } from '../utils/csvExport';
import PageHeader from '../components/PageHeader';
import SearchInput from '../components/SearchInput';
import EmptyState from '../components/EmptyState';
import InfoTooltip from '../components/InfoTooltip';
import { metricExplanations } from '../constants/metricExplanations';
import {
  SkeletonList,
  StatusBadge,
  Badge,
} from '../components/ui';


const roiTierColors: Record<string, string> = {
  excellent: 'text-green-600 dark:text-green-400',
  good: 'text-blue-600 dark:text-blue-400',
  moderate: 'text-yellow-600 dark:text-yellow-400',
  low: 'text-gray-500 dark:text-gray-400',
};

function formatNumber(num: number | undefined | null): string {
  if (num === null || num === undefined) return '-';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function getRoiTier(score: number | undefined | null): string {
  if (score === null || score === undefined) return 'low';
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'moderate';
  return 'low';
}

interface GSCSuggestion {
  query: string;
  impressions: number;
  position: number;
  clicks: number;
  suggestedCategory: string;
  suggestedPriority: number;
  reason: string;
}

export default function YouTube() {
  const queryClient = useQueryClient();
  const [keywords, setKeywords] = useState('');
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<YouTubeChannel | null>(null);
  const [statusFilter, setStatusFilter] = useState<YouTubeChannelStatus | ''>('');
  const [keywordSource, setKeywordSource] = useState<'manual' | 'gsc'>('manual');
  const [selectedGscKeywords, setSelectedGscKeywords] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'roiScore' | 'relevanceScore' | 'subscriberCount' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch discovery status
  const { data: jobStatus } = useQuery({
    queryKey: ['youtube', 'discovery', 'status'],
    queryFn: () => youtubeApi.getDiscoveryStatus(),
    refetchInterval: (data) => {
      const job = data?.state?.data?.data as YouTubeDiscoveryJob | undefined;
      return job?.status === 'running' ? 2000 : false;
    },
  });

  // Fetch channels
  const { data: channelsData, isLoading: channelsLoading } = useQuery({
    queryKey: ['youtube', 'channels', statusFilter, sortBy, sortOrder],
    queryFn: () =>
      youtubeApi.listChannels({
        status: statusFilter || undefined,
        sortBy,
        sortOrder,
        limit: 50,
      }),
  });

  // Fetch analytics
  const { data: analyticsData } = useQuery({
    queryKey: ['youtube', 'analytics'],
    queryFn: () => youtubeApi.getAnalytics(),
  });

  // Fetch GSC suggestions for discovery
  const { data: gscSuggestionsData, isLoading: gscLoading } = useQuery({
    queryKey: ['gsc', 'suggestions'],
    queryFn: () => gscApi.getSuggestions(),
    enabled: showDiscoveryModal && keywordSource === 'gsc',
  });

  const gscSuggestions = (gscSuggestionsData?.data?.suggestions || []) as GSCSuggestion[];

  // Discovery mutation
  const discoverMutation = useMutation({
    mutationFn: (keywordList: string[]) =>
      youtubeApi.discover({ keywords: keywordList, maxResultsPerKeyword: 25 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['youtube'] });
      setShowDiscoveryModal(false);
      setKeywords('');
    },
  });

  // Analyze mutation
  const analyzeMutation = useMutation({
    mutationFn: (id: string) => youtubeApi.analyzeChannel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['youtube', 'channels'] });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: YouTubeChannelStatus }) =>
      youtubeApi.updateChannel(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['youtube', 'channels'] });
      if (selectedChannel) {
        setSelectedChannel(null);
      }
    },
  });

  const currentJob = jobStatus?.data as YouTubeDiscoveryJob | undefined;
  const isRunning = currentJob?.status === 'running';
  const rawChannels = channelsData?.data?.channels;
  const channels = (Array.isArray(rawChannels) ? rawChannels : []) as YouTubeChannel[];
  const analytics = analyticsData?.data as YouTubeAnalytics | undefined;

  // Filter channels based on search
  const filteredChannels = useMemo(() => {
    const raw = channelsData?.data?.channels;
    const channelsList = (Array.isArray(raw) ? raw : []) as YouTubeChannel[];
    if (!searchTerm.trim()) return channelsList;
    const search = searchTerm.toLowerCase();
    return channelsList.filter(
      (channel) =>
        channel.name.toLowerCase().includes(search) ||
        channel.customUrl?.toLowerCase().includes(search) ||
        channel.description?.toLowerCase().includes(search)
    );
  }, [channelsData?.data?.channels, searchTerm]);

  const handleStartDiscovery = () => {
    let keywordList: string[] = [];

    if (keywordSource === 'manual') {
      keywordList = keywords
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0);
    } else {
      keywordList = Array.from(selectedGscKeywords);
    }

    if (keywordList.length > 0) {
      discoverMutation.mutate(keywordList);
      setShowDiscoveryModal(false);
      setSelectedGscKeywords(new Set());
      setKeywords('');
    }
  };

  const toggleGscKeyword = (query: string) => {
    setSelectedGscKeywords((prev) => {
      const next = new Set(prev);
      if (next.has(query)) {
        next.delete(query);
      } else {
        next.add(query);
      }
      return next;
    });
  };

  const selectAllGscKeywords = () => {
    setSelectedGscKeywords(new Set(gscSuggestions.map((s) => s.query)));
  };

  const clearGscSelection = () => {
    setSelectedGscKeywords(new Set());
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="YouTube Discovery"
        description="Find and analyze YouTube channels for influencer outreach"
        breadcrumbs={[{ label: 'Analytics' }, { label: 'YouTube' }]}
        actions={
          <div className="flex items-center gap-2">
            {channels.length > 0 && (
              <button
                onClick={() => exportYouTubeChannels(channels as unknown as Record<string, unknown>[])}
                className="btn btn-secondary flex items-center"
                title="Export to CSV"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            )}
            <button
              onClick={() => setShowDiscoveryModal(true)}
              disabled={isRunning}
              className="btn btn-primary flex items-center"
            >
              <Search className="h-4 w-4 mr-2" />
              Discover Channels
            </button>
          </div>
        }
      />

      {/* Job Status */}
      {currentJob && (
        <div
          className={`card p-4 ${
            isRunning
              ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
              : currentJob.status === 'completed'
              ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
              : currentJob.status === 'failed'
              ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
              : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {isRunning ? (
                <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin mr-3" />
              ) : currentJob.status === 'completed' ? (
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-3" />
              ) : currentJob.status === 'failed' ? (
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3" />
              ) : null}
              <div>
                <p className="font-medium dark:text-gray-100">
                  {isRunning
                    ? 'Discovery in progress...'
                    : currentJob.status === 'completed'
                    ? 'Discovery completed'
                    : currentJob.status === 'failed'
                    ? 'Discovery failed'
                    : 'Pending'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {currentJob.channelsFound} channels discovered
                </p>
              </div>
            </div>
            {isRunning && (
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {currentJob.progress}%
                </p>
              </div>
            )}
          </div>
          {isRunning && (
            <div className="mt-3 h-2 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 dark:bg-blue-400 transition-all duration-300"
                style={{ width: `${currentJob.progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Youtube className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Channels</p>
                <p className="text-xl font-bold dark:text-gray-100">{analytics.totalChannels}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Star className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-3">
                <div className="flex items-center gap-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Avg ROI Score</p>
                  <InfoTooltip content={metricExplanations.roiScore} iconClassName="h-3 w-3" />
                </div>
                <p className="text-xl font-bold dark:text-gray-100">
                  {analytics.averageScores.roiScore}
                </p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-3">
                <div className="flex items-center gap-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Avg Relevance</p>
                  <InfoTooltip content={metricExplanations.relevanceScore} iconClassName="h-3 w-3" />
                </div>
                <p className="text-xl font-bold dark:text-gray-100">
                  {analytics.averageScores.relevanceScore}/10
                </p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-3">
                <div className="flex items-center gap-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Avg Engagement</p>
                  <InfoTooltip content={metricExplanations.engagementRate} iconClassName="h-3 w-3" />
                </div>
                <p className="text-xl font-bold dark:text-gray-100">
                  {analytics.averageScores.engagementRate}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px] max-w-md">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search
            </label>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search channels..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as YouTubeChannelStatus | '')}
              className="input w-40"
            >
              <option value="">All</option>
              <option value="discovered">Discovered</option>
              <option value="analyzing">Analyzing</option>
              <option value="analyzed">Analyzed</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="contacted">Contacted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as 'roiScore' | 'relevanceScore' | 'subscriberCount' | 'createdAt'
                )
              }
              className="input w-40"
            >
              <option value="createdAt">Discovered</option>
              <option value="roiScore">ROI Score</option>
              <option value="relevanceScore">Relevance</option>
              <option value="subscriberCount">Subscribers</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Order
            </label>
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="btn btn-secondary flex items-center"
            >
              {sortOrder === 'desc' ? (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" /> Desc
                </>
              ) : (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" /> Asc
                </>
              )}
            </button>
          </div>
        </div>
        {searchTerm && (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredChannels.length} of {channels.length} channels
          </p>
        )}
      </div>

      {/* Channels List */}
      <div className="card">
        {channelsLoading ? (
          <div className="p-6">
            <SkeletonList items={6} />
          </div>
        ) : channels.length === 0 ? (
          <EmptyState
            icon={Youtube}
            title="No channels discovered yet"
            description="Search for YouTube channels by keyword to find potential influencer partnerships."
            actions={[
              {
                label: 'Start Discovery',
                onClick: () => setShowDiscoveryModal(true),
                primary: true,
              },
            ]}
          />
        ) : filteredChannels.length === 0 ? (
          <div className="p-8 text-center">
            <Search className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600" />
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              No channels match "{searchTerm}"
            </p>
            <button
              onClick={() => setSearchTerm('')}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="divide-y dark:divide-gray-700">
            {filteredChannels.map((channel) => (
              <div
                key={channel.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                onClick={() => setSelectedChannel(channel)}
              >
                <div className="flex items-start gap-4">
                  {channel.thumbnailUrl ? (
                    <img
                      src={channel.thumbnailUrl}
                      alt={channel.name}
                      className="w-16 h-16 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <Youtube className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {channel.name}
                      </h3>
                      <StatusBadge status={channel.status} />
                    </div>
                    {channel.customUrl && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">{channel.customUrl}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-4 text-sm">
                      <span className="flex items-center text-gray-600 dark:text-gray-400">
                        <Users className="h-4 w-4 mr-1" />
                        {formatNumber(channel.subscriberCount)} subscribers
                      </span>
                      <span className="flex items-center text-gray-600 dark:text-gray-400">
                        <Eye className="h-4 w-4 mr-1" />
                        {formatNumber(channel.avgViewsPerVideo)} avg views
                      </span>
                      {channel.relevanceScore && (
                        <span className="flex items-center text-gray-600 dark:text-gray-400">
                          <TrendingUp className="h-4 w-4 mr-1" />
                          Relevance: {channel.relevanceScore}/10
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {channel.roiScore !== null && channel.roiScore !== undefined ? (
                      <div>
                        <p
                          className={`text-2xl font-bold ${
                            roiTierColors[getRoiTier(channel.roiScore)]
                          }`}
                        >
                          {channel.roiScore}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">ROI Score</p>
                      </div>
                    ) : channel.status === 'discovered' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          analyzeMutation.mutate(channel.id);
                        }}
                        disabled={analyzeMutation.isPending}
                        className="btn btn-secondary btn-sm"
                      >
                        Analyze
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Discovery Modal */}
      {showDiscoveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold dark:text-gray-100">Discover Channels</h2>
              <button
                onClick={() => setShowDiscoveryModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Source Tabs */}
            <div className="flex border-b dark:border-gray-700">
              <button
                onClick={() => setKeywordSource('manual')}
                className={`flex-1 py-3 px-4 text-sm font-medium ${
                  keywordSource === 'manual'
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Search className="h-4 w-4 inline mr-2" />
                Manual Entry
              </button>
              <button
                onClick={() => setKeywordSource('gsc')}
                className={`flex-1 py-3 px-4 text-sm font-medium ${
                  keywordSource === 'gsc'
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Database className="h-4 w-4 inline mr-2" />
                From Search Console
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              {keywordSource === 'manual' ? (
                <>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Search Keywords
                  </label>
                  <textarea
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="Enter keywords separated by commas (e.g., fitness bike, home workout, HIIT training)"
                    className="input w-full h-32"
                  />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Searches YouTube for channels matching these keywords
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Select keywords from your Search Console data
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={selectAllGscKeywords}
                        className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        Select All
                      </button>
                      <button
                        onClick={clearGscSelection}
                        className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  {gscLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : gscSuggestions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No GSC data available</p>
                      <p className="text-sm">Connect and sync your Search Console first</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {gscSuggestions.map((suggestion) => (
                        <label
                          key={suggestion.query}
                          className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedGscKeywords.has(suggestion.query)
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedGscKeywords.has(suggestion.query)}
                            onChange={() => toggleGscKeyword(suggestion.query)}
                            className="h-4 w-4 text-blue-600 rounded"
                          />
                          <div className="ml-3 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {suggestion.query}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {suggestion.impressions.toLocaleString()} impressions · Position {suggestion.position.toFixed(1)}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                  {selectedGscKeywords.size > 0 && (
                    <p className="mt-3 text-sm text-blue-600 dark:text-blue-400">
                      {selectedGscKeywords.size} keyword{selectedGscKeywords.size > 1 ? 's' : ''} selected
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 p-4 border-t dark:border-gray-700">
              <button
                onClick={() => setShowDiscoveryModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleStartDiscovery}
                disabled={
                  discoverMutation.isPending ||
                  (keywordSource === 'manual' && !keywords.trim()) ||
                  (keywordSource === 'gsc' && selectedGscKeywords.size === 0)
                }
                className="btn btn-primary flex items-center"
              >
                {discoverMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Start Discovery
                    {keywordSource === 'gsc' && selectedGscKeywords.size > 0 && (
                      <span className="ml-1">({selectedGscKeywords.size})</span>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Channel Detail Panel */}
      {selectedChannel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setSelectedChannel(null)}
          />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold dark:text-gray-100">Channel Details</h2>
              <button
                onClick={() => setSelectedChannel(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-6">
              {/* Channel Header */}
              <div className="flex items-center gap-4">
                {selectedChannel.thumbnailUrl ? (
                  <img
                    src={selectedChannel.thumbnailUrl}
                    alt={selectedChannel.name}
                    className="w-20 h-20 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <Youtube className="h-10 w-10 text-gray-400" />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold dark:text-gray-100">{selectedChannel.name}</h3>
                  {selectedChannel.customUrl && (
                    <a
                      href={`https://youtube.com/${selectedChannel.customUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 flex items-center hover:underline"
                    >
                      {selectedChannel.customUrl}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  )}
                  <StatusBadge status={selectedChannel.status} className="mt-2" />
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Subscribers</p>
                  <p className="text-lg font-bold dark:text-gray-100">
                    {formatNumber(selectedChannel.subscriberCount)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Videos</p>
                  <p className="text-lg font-bold dark:text-gray-100">
                    {formatNumber(selectedChannel.videoCount)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Avg Views</p>
                  <p className="text-lg font-bold dark:text-gray-100">
                    {formatNumber(selectedChannel.avgViewsPerVideo)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Engagement</p>
                  <p className="text-lg font-bold dark:text-gray-100">
                    {selectedChannel.engagementRate?.toFixed(2) || '-'}%
                  </p>
                </div>
              </div>

              {/* ROI Score */}
              {selectedChannel.roiScore !== null && selectedChannel.roiScore !== undefined && (
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium dark:text-gray-100">ROI Score</h4>
                    <span
                      className={`text-2xl font-bold ${
                        roiTierColors[getRoiTier(selectedChannel.roiScore)]
                      }`}
                    >
                      {selectedChannel.roiScore}/100
                    </span>
                  </div>
                  {selectedChannel.roiFactors && (
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Audience Fit</span>
                          <span className="dark:text-gray-300">
                            {selectedChannel.roiFactors.audienceFit}/35
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full mt-1">
                          <div
                            className="h-full bg-carol-600 rounded-full"
                            style={{
                              width: `${(selectedChannel.roiFactors.audienceFit / 35) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Engagement Quality</span>
                          <span className="dark:text-gray-300">
                            {selectedChannel.roiFactors.engagementQuality}/30
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full mt-1">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{
                              width: `${(selectedChannel.roiFactors.engagementQuality / 30) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Channel Authority</span>
                          <span className="dark:text-gray-300">
                            {selectedChannel.roiFactors.channelAuthority}/20
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full mt-1">
                          <div
                            className="h-full bg-purple-600 rounded-full"
                            style={{
                              width: `${(selectedChannel.roiFactors.channelAuthority / 20) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Growth Potential</span>
                          <span className="dark:text-gray-300">
                            {selectedChannel.roiFactors.growthPotential}/15
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full mt-1">
                          <div
                            className="h-full bg-green-600 rounded-full"
                            style={{
                              width: `${(selectedChannel.roiFactors.growthPotential / 15) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* AI Analysis */}
              {selectedChannel.aiAnalysis && (
                <div className="space-y-3">
                  <h4 className="font-medium dark:text-gray-100">AI Analysis</h4>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Reasoning</p>
                    <p className="text-sm dark:text-gray-300 mt-1">
                      {selectedChannel.aiAnalysis.reasoning}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Audience Alignment</p>
                    <p className="text-sm dark:text-gray-300 mt-1">
                      {selectedChannel.aiAnalysis.audienceAlignment}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Collaboration Potential</p>
                    <p className="text-sm dark:text-gray-300 mt-1">
                      {selectedChannel.aiAnalysis.collaborationPotential}
                    </p>
                  </div>
                  {selectedChannel.aiAnalysis.contentTopics.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Content Topics</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedChannel.aiAnalysis.contentTopics.map((topic) => (
                          <Badge key={topic} variant="gray">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedChannel.aiAnalysis.cautions.length > 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400 mb-1">
                        Cautions
                      </p>
                      <ul className="text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside">
                        {selectedChannel.aiAnalysis.cautions.map((caution, i) => (
                          <li key={i}>{caution}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              {selectedChannel.description && (
                <div>
                  <h4 className="font-medium dark:text-gray-100 mb-2">Description</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
                    {selectedChannel.description}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3 pt-4 border-t dark:border-gray-700">
                <h4 className="font-medium dark:text-gray-100">Actions</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedChannel.status === 'discovered' && (
                    <button
                      onClick={() => analyzeMutation.mutate(selectedChannel.id)}
                      disabled={analyzeMutation.isPending}
                      className="btn btn-primary flex items-center"
                    >
                      {analyzeMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <TrendingUp className="h-4 w-4 mr-2" />
                      )}
                      Analyze
                    </button>
                  )}
                  {selectedChannel.status === 'analyzed' && (
                    <>
                      <button
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: selectedChannel.id,
                            status: 'shortlisted',
                          })
                        }
                        className="btn btn-primary"
                      >
                        Shortlist
                      </button>
                      <button
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: selectedChannel.id,
                            status: 'rejected',
                          })
                        }
                        className="btn btn-secondary"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {selectedChannel.status === 'shortlisted' && (
                    <button
                      onClick={() =>
                        updateStatusMutation.mutate({
                          id: selectedChannel.id,
                          status: 'contacted',
                        })
                      }
                      className="btn btn-primary"
                    >
                      Mark Contacted
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
