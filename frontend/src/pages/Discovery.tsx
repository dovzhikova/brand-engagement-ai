import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { discoveryApi, subredditsApi, keywordsApi } from '../services/api';
import { Search, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import type { DiscoveryJob, Subreddit, Keyword } from '../types';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';

export default function Discovery() {
  const queryClient = useQueryClient();
  const [selectedSubreddits, setSelectedSubreddits] = useState<string[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);

  const { data: status } = useQuery({
    queryKey: ['discovery', 'status'],
    queryFn: () => discoveryApi.getStatus(),
    refetchInterval: (data) => {
      const jobStatus = data?.state?.data?.data as DiscoveryJob | undefined;
      return jobStatus?.status === 'running' ? 2000 : false;
    },
  });

  const { data: subreddits } = useQuery({
    queryKey: ['subreddits'],
    queryFn: () => subredditsApi.list(),
  });

  const { data: keywords } = useQuery({
    queryKey: ['keywords'],
    queryFn: () => keywordsApi.list(),
  });

  const fetchMutation = useMutation({
    mutationFn: () =>
      discoveryApi.fetch({
        subreddits: selectedSubreddits.length > 0 ? selectedSubreddits : undefined,
        keywords: selectedKeywords.length > 0 ? selectedKeywords : undefined,
        limit: 25,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discovery'] });
    },
  });

  const currentJob = status?.data as DiscoveryJob | undefined;
  const isRunning = currentJob?.status === 'running';

  const subredditsList = Array.isArray(subreddits?.data) ? subreddits.data : [];
  const keywordsList = Array.isArray(keywords?.data) ? keywords.data : [];
  const hasConfiguredFilters = subredditsList.length > 0 || keywordsList.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Discovery"
        description="Search Reddit for engagement opportunities"
        breadcrumbs={[{ label: 'Content' }, { label: 'Discovery' }]}
        actions={
          <button
            onClick={() => fetchMutation.mutate()}
            disabled={isRunning || fetchMutation.isPending || !hasConfiguredFilters}
            className="btn btn-primary flex items-center"
          >
            {isRunning || fetchMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Start Discovery
              </>
            )}
          </button>
        }
      />

      {/* Job Status */}
      {currentJob && (
        <div className={`card p-4 ${
          isRunning ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20' :
          currentJob.status === 'completed' ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' :
          currentJob.status === 'failed' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' :
          ''
        }`}>
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
                  {isRunning ? 'Discovery in progress...' :
                   currentJob.status === 'completed' ? 'Discovery completed' :
                   currentJob.status === 'failed' ? 'Discovery failed' :
                   'Pending'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {currentJob.discoveredCount} posts discovered
                </p>
              </div>
            </div>
            {isRunning && (
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{currentJob.progress}%</p>
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

      {/* No filters configured */}
      {!hasConfiguredFilters && (
        <EmptyState
          icon={Search}
          title="No filters configured"
          description="Configure keywords and subreddits first to start discovering content."
          actions={[
            { label: 'Configure Keywords', href: '/keywords', primary: true },
          ]}
        />
      )}

      {/* Filters */}
      {hasConfiguredFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Subreddits</h3>
              {selectedSubreddits.length > 0 && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedSubreddits.length} selected
                </span>
              )}
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {subredditsList.map((sub: Subreddit) => (
                <label key={sub.id} className="flex items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSubreddits.includes(sub.name)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSubreddits([...selectedSubreddits, sub.name]);
                      } else {
                        setSelectedSubreddits(selectedSubreddits.filter((s) => s !== sub.name));
                      }
                    }}
                    className="rounded border-gray-300 dark:border-gray-600 text-carol-600 focus:ring-carol-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">r/{sub.name}</span>
                </label>
              ))}
              {subredditsList.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">No subreddits configured</p>
              )}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Keywords</h3>
              {selectedKeywords.length > 0 && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedKeywords.length} selected
                </span>
              )}
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {keywordsList.map((kw: Keyword) => (
                <label key={kw.id} className="flex items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedKeywords.includes(kw.keyword)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedKeywords([...selectedKeywords, kw.keyword]);
                      } else {
                        setSelectedKeywords(selectedKeywords.filter((k) => k !== kw.keyword));
                      }
                    }}
                    className="rounded border-gray-300 dark:border-gray-600 text-carol-600 focus:ring-carol-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{kw.keyword}</span>
                  {kw.category && (
                    <span className="ml-2 badge badge-gray">{kw.category}</span>
                  )}
                </label>
              ))}
              {keywordsList.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">No keywords configured</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selection Summary */}
      {hasConfiguredFilters && (selectedSubreddits.length > 0 || selectedKeywords.length > 0) && (
        <div className="card p-4 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Will search {selectedSubreddits.length === 0 ? 'all subreddits' : `${selectedSubreddits.length} subreddit(s)`} for{' '}
              {selectedKeywords.length === 0 ? 'all keywords' : `${selectedKeywords.length} keyword(s)`}
            </p>
            {(selectedSubreddits.length > 0 || selectedKeywords.length > 0) && (
              <button
                onClick={() => {
                  setSelectedSubreddits([]);
                  setSelectedKeywords([]);
                }}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                Clear selection
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
