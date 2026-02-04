import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { keywordsApi, subredditsApi, gscApi, discoveryApi } from '../services/api';
import { Plus, Trash2, X, Pencil, Download, Database, RefreshCw, CheckCircle, Square, CheckSquare, ToggleLeft, ToggleRight, Key, MessageCircle, AlertCircle, Play } from 'lucide-react';
import type { Keyword, Subreddit, DiscoveryJob } from '../types';
import { exportKeywords, exportSubreddits } from '../utils/csvExport';
import PageHeader from '../components/PageHeader';
import SearchInput from '../components/SearchInput';
import EmptyState from '../components/EmptyState';

interface GSCSuggestion {
  query: string;
  impressions: number;
  position: number;
  clicks: number;
  suggestedCategory: string;
  suggestedPriority: number;
  reason: string;
}

interface KeywordForm {
  keyword: string;
  category: string;
  priority: number;
  searchVariants: string;
  isActive: boolean;
}

interface SubredditForm {
  name: string;
  phase: number;
  selfPromoRules: string;
  minKarma: number;
  isActive: boolean;
}

export default function Keywords() {
  const queryClient = useQueryClient();
  const [showKeywordForm, setShowKeywordForm] = useState(false);
  const [showSubredditForm, setShowSubredditForm] = useState(false);
  const [showGscImport, setShowGscImport] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<Keyword | null>(null);
  const [editingSubreddit, setEditingSubreddit] = useState<Subreddit | null>(null);
  const [selectedGscKeywords, setSelectedGscKeywords] = useState<Set<string>>(new Set());
  const [importingKeywords, setImportingKeywords] = useState(false);

  // Search states
  const [keywordSearch, setKeywordSearch] = useState('');
  const [subredditSearch, setSubredditSearch] = useState('');

  // Batch selection states
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [selectedSubreddits, setSelectedSubreddits] = useState<Set<string>>(new Set());
  const [deletingKeywords, setDeletingKeywords] = useState(false);
  const [deletingSubreddits, setDeletingSubreddits] = useState(false);

  const { data: keywords, isLoading: keywordsLoading } = useQuery({
    queryKey: ['keywords'],
    queryFn: () => keywordsApi.list(),
  });

  const { data: subreddits, isLoading: subredditsLoading } = useQuery({
    queryKey: ['subreddits'],
    queryFn: () => subredditsApi.list(),
  });

  // Discovery status query
  const { data: discoveryStatus } = useQuery({
    queryKey: ['discovery', 'status'],
    queryFn: () => discoveryApi.getStatus(),
    refetchInterval: (data) => {
      const jobStatus = data?.state?.data?.data as DiscoveryJob | undefined;
      return jobStatus?.status === 'running' ? 2000 : false;
    },
  });

  // Auto-discovery schedule query
  const { data: scheduleData } = useQuery({
    queryKey: ['discovery', 'schedule'],
    queryFn: () => discoveryApi.getSchedule(),
  });

  const currentJob = discoveryStatus?.data as DiscoveryJob | undefined;
  const isDiscoveryRunning = currentJob?.status === 'running';
  const scheduleInfo = scheduleData?.data as { intervalHours?: number; autoDiscoveryEnabled?: boolean } | undefined;

  // Discovery mutation
  const discoveryMutation = useMutation({
    mutationFn: () => discoveryApi.fetch({ limit: 25 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discovery'] });
    },
  });

  // Fetch GSC suggestions for import
  const { data: gscSuggestionsData, isLoading: gscLoading } = useQuery({
    queryKey: ['gsc', 'suggestions'],
    queryFn: () => gscApi.getSuggestions(),
    enabled: showGscImport,
  });

  const gscSuggestions = (gscSuggestionsData?.data?.suggestions || []) as GSCSuggestion[];

  // Filter keywords and subreddits based on search
  const filteredKeywords = useMemo(() => {
    const keywordsList = Array.isArray(keywords?.data) ? keywords.data : [];
    if (!keywordSearch.trim()) return keywordsList;
    const search = keywordSearch.toLowerCase();
    return keywordsList.filter((kw: Keyword) =>
      kw.keyword.toLowerCase().includes(search) ||
      kw.category?.toLowerCase().includes(search)
    );
  }, [keywords?.data, keywordSearch]);

  const filteredSubreddits = useMemo(() => {
    const subredditsList = Array.isArray(subreddits?.data) ? subreddits.data : [];
    if (!subredditSearch.trim()) return subredditsList;
    const search = subredditSearch.toLowerCase();
    return subredditsList.filter((sub: Subreddit) =>
      sub.name.toLowerCase().includes(search)
    );
  }, [subreddits?.data, subredditSearch]);

  const keywordForm = useForm<KeywordForm>({
    defaultValues: { priority: 2, isActive: true },
  });

  const subredditForm = useForm<SubredditForm>({
    defaultValues: { phase: 1, minKarma: 0, isActive: true },
  });

  // Reset keyword form when editing keyword changes
  useEffect(() => {
    if (editingKeyword) {
      keywordForm.reset({
        keyword: editingKeyword.keyword,
        category: editingKeyword.category || '',
        priority: editingKeyword.priority,
        searchVariants: Array.isArray(editingKeyword.searchVariants)
          ? editingKeyword.searchVariants.join(', ')
          : '',
        isActive: editingKeyword.isActive,
      });
    } else {
      keywordForm.reset({ priority: 2, isActive: true, keyword: '', category: '', searchVariants: '' });
    }
  }, [editingKeyword, keywordForm]);

  // Reset subreddit form when editing subreddit changes
  useEffect(() => {
    if (editingSubreddit) {
      subredditForm.reset({
        name: editingSubreddit.name,
        phase: editingSubreddit.phase,
        minKarma: editingSubreddit.minKarma,
        selfPromoRules: editingSubreddit.selfPromoRules || '',
        isActive: editingSubreddit.isActive,
      });
    } else {
      subredditForm.reset({ phase: 1, minKarma: 0, isActive: true, name: '', selfPromoRules: '' });
    }
  }, [editingSubreddit, subredditForm]);

  const createKeyword = useMutation({
    mutationFn: (data: Partial<Keyword>) => keywordsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords'] });
      closeKeywordForm();
    },
  });

  const updateKeyword = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Keyword> }) => keywordsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords'] });
      closeKeywordForm();
    },
  });

  const deleteKeyword = useMutation({
    mutationFn: (id: string) => keywordsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['keywords'] }),
  });

  const createSubreddit = useMutation({
    mutationFn: (data: Partial<Subreddit>) => subredditsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subreddits'] });
      closeSubredditForm();
    },
  });

  const updateSubreddit = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Subreddit> }) => subredditsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subreddits'] });
      closeSubredditForm();
    },
  });

  const deleteSubreddit = useMutation({
    mutationFn: (id: string) => subredditsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subreddits'] }),
  });

  const closeKeywordForm = () => {
    setShowKeywordForm(false);
    setEditingKeyword(null);
    keywordForm.reset();
  };

  const closeSubredditForm = () => {
    setShowSubredditForm(false);
    setEditingSubreddit(null);
    subredditForm.reset();
  };

  // Keyword selection handlers
  const toggleKeywordSelection = (id: string) => {
    setSelectedKeywords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllKeywords = () => {
    if (Array.isArray(keywords?.data)) {
      setSelectedKeywords(new Set(keywords.data.map((k: Keyword) => k.id)));
    }
  };

  const clearKeywordSelection = () => {
    setSelectedKeywords(new Set());
  };

  const isAllKeywordsSelected = (keywords?.data?.length ?? 0) > 0 && selectedKeywords.size === (keywords?.data?.length ?? 0);

  // Subreddit selection handlers
  const toggleSubredditSelection = (id: string) => {
    setSelectedSubreddits((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllSubreddits = () => {
    if (Array.isArray(subreddits?.data)) {
      setSelectedSubreddits(new Set(subreddits.data.map((s: Subreddit) => s.id)));
    }
  };

  const clearSubredditSelection = () => {
    setSelectedSubreddits(new Set());
  };

  const isAllSubredditsSelected = (subreddits?.data?.length ?? 0) > 0 && selectedSubreddits.size === (subreddits?.data?.length ?? 0);

  // Batch delete handlers
  const handleBatchDeleteKeywords = async () => {
    if (selectedKeywords.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedKeywords.size} keyword(s)?`)) return;

    setDeletingKeywords(true);
    try {
      for (const id of selectedKeywords) {
        await keywordsApi.delete(id);
      }
      queryClient.invalidateQueries({ queryKey: ['keywords'] });
      setSelectedKeywords(new Set());
    } catch (error) {
      console.error('Failed to delete keywords:', error);
    } finally {
      setDeletingKeywords(false);
    }
  };

  const handleBatchDeleteSubreddits = async () => {
    if (selectedSubreddits.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedSubreddits.size} subreddit(s)?`)) return;

    setDeletingSubreddits(true);
    try {
      for (const id of selectedSubreddits) {
        await subredditsApi.delete(id);
      }
      queryClient.invalidateQueries({ queryKey: ['subreddits'] });
      setSelectedSubreddits(new Set());
    } catch (error) {
      console.error('Failed to delete subreddits:', error);
    } finally {
      setDeletingSubreddits(false);
    }
  };

  // Batch toggle active status
  const handleBatchToggleKeywords = async (active: boolean) => {
    if (selectedKeywords.size === 0) return;

    setDeletingKeywords(true);
    try {
      for (const id of selectedKeywords) {
        await keywordsApi.update(id, { isActive: active });
      }
      queryClient.invalidateQueries({ queryKey: ['keywords'] });
      setSelectedKeywords(new Set());
    } catch (error) {
      console.error('Failed to update keywords:', error);
    } finally {
      setDeletingKeywords(false);
    }
  };

  const handleBatchToggleSubreddits = async (active: boolean) => {
    if (selectedSubreddits.size === 0) return;

    setDeletingSubreddits(true);
    try {
      for (const id of selectedSubreddits) {
        await subredditsApi.update(id, { isActive: active });
      }
      queryClient.invalidateQueries({ queryKey: ['subreddits'] });
      setSelectedSubreddits(new Set());
    } catch (error) {
      console.error('Failed to update subreddits:', error);
    } finally {
      setDeletingSubreddits(false);
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

  const handleImportGscKeywords = async () => {
    if (selectedGscKeywords.size === 0) return;

    setImportingKeywords(true);
    try {
      // Import each selected keyword
      for (const query of selectedGscKeywords) {
        const suggestion = gscSuggestions.find((s) => s.query === query);
        if (suggestion) {
          await gscApi.addSuggestedKeyword({
            query: suggestion.query,
            priority: suggestion.suggestedPriority,
            category: suggestion.suggestedCategory,
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['keywords'] });
      queryClient.invalidateQueries({ queryKey: ['gsc', 'suggestions'] });
      setShowGscImport(false);
      setSelectedGscKeywords(new Set());
    } catch (error) {
      console.error('Failed to import keywords:', error);
    } finally {
      setImportingKeywords(false);
    }
  };

  const openEditKeyword = (keyword: Keyword) => {
    setEditingKeyword(keyword);
    setShowKeywordForm(true);
  };

  const openEditSubreddit = (subreddit: Subreddit) => {
    setEditingSubreddit(subreddit);
    setShowSubredditForm(true);
  };

  const onSubmitKeyword = (data: KeywordForm) => {
    const payload = {
      keyword: data.keyword,
      category: data.category as Keyword['category'],
      priority: data.priority,
      searchVariants: data.searchVariants.split(',').map((v) => v.trim()).filter(Boolean),
      isActive: data.isActive,
    };

    if (editingKeyword) {
      updateKeyword.mutate({ id: editingKeyword.id, data: payload });
    } else {
      createKeyword.mutate(payload);
    }
  };

  const onSubmitSubreddit = (data: SubredditForm) => {
    if (editingSubreddit) {
      updateSubreddit.mutate({ id: editingSubreddit.id, data });
    } else {
      createSubreddit.mutate(data);
    }
  };

  const getCategoryBadge = (category?: string) => {
    switch (category) {
      case 'core':
        return 'badge-success';
      case 'competitor':
        return 'badge-danger';
      case 'brand':
        return 'badge-info';
      case 'broad':
        return 'badge-warning';
      default:
        return 'badge-gray';
    }
  };

  const hasConfiguredTargets = (keywords?.data?.length ?? 0) > 0 || (subreddits?.data?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Keywords & Subreddits"
        description={
          <span className="flex items-center gap-3">
            Configure content discovery targets
            {scheduleInfo?.autoDiscoveryEnabled && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse" />
                Auto-discovery every {scheduleInfo.intervalHours}h
              </span>
            )}
          </span>
        }
        breadcrumbs={[{ label: 'Content' }, { label: 'Keywords' }]}
        actions={
          <button
            onClick={() => discoveryMutation.mutate()}
            disabled={isDiscoveryRunning || discoveryMutation.isPending || !hasConfiguredTargets}
            className="btn btn-primary flex items-center"
            title={scheduleInfo?.autoDiscoveryEnabled ? 'Manual discovery - auto runs every ' + scheduleInfo.intervalHours + ' hours' : undefined}
          >
            {isDiscoveryRunning || discoveryMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Discovery
              </>
            )}
          </button>
        }
      />

      {/* Discovery Status */}
      {currentJob && (
        <div className={`card p-4 ${
          isDiscoveryRunning ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20' :
          currentJob.status === 'completed' ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' :
          currentJob.status === 'failed' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' :
          ''
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {isDiscoveryRunning ? (
                <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin mr-3" />
              ) : currentJob.status === 'completed' ? (
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-3" />
              ) : currentJob.status === 'failed' ? (
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3" />
              ) : null}
              <div>
                <p className="font-medium dark:text-gray-100">
                  {isDiscoveryRunning ? 'Discovery in progress...' :
                   currentJob.status === 'completed' ? 'Discovery completed' :
                   currentJob.status === 'failed' ? 'Discovery failed' :
                   'Pending'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {currentJob.discoveredCount} posts discovered
                </p>
              </div>
            </div>
            {isDiscoveryRunning && (
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{currentJob.progress}%</p>
              </div>
            )}
          </div>
          {isDiscoveryRunning && (
            <div className="mt-3 h-2 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 dark:bg-blue-400 transition-all duration-300"
                style={{ width: `${currentJob.progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Keywords Section */}
        <div className="card">
          <div className="px-6 py-4 border-b dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Keywords</h2>
                {keywords?.data && keywords.data.length > 0 && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ({filteredKeywords.length}{keywordSearch ? ` / ${keywords.data.length}` : ''})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {keywords?.data && keywords.data.length > 0 && (
                  <button
                    onClick={() => exportKeywords(keywords.data)}
                    className="btn btn-secondary text-sm flex items-center"
                    title="Export to CSV"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setShowGscImport(true)}
                  className="btn btn-secondary text-sm flex items-center"
                  title="Import from Google Search Console"
                >
                  <Database className="h-4 w-4 mr-1" />
                  Import GSC
                </button>
                <button
                  onClick={() => {
                    setEditingKeyword(null);
                    setShowKeywordForm(true);
                  }}
                  className="btn btn-primary text-sm flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </button>
              </div>
            </div>

            {/* Search Input */}
            {keywords?.data && keywords.data.length > 0 && (
              <div className="mt-3">
                <SearchInput
                  value={keywordSearch}
                  onChange={setKeywordSearch}
                  placeholder="Search keywords..."
                  className="w-full"
                />
              </div>
            )}

            {/* Selection Bar */}
            {filteredKeywords.length > 0 && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <button
                    onClick={isAllKeywordsSelected ? clearKeywordSelection : selectAllKeywords}
                    className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  >
                    {isAllKeywordsSelected ? (
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                    ) : selectedKeywords.size > 0 ? (
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    {isAllKeywordsSelected ? 'Deselect All' : 'Select All'}
                  </button>
                  {selectedKeywords.size > 0 && (
                    <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                      {selectedKeywords.size} selected
                    </span>
                  )}
                </div>

                {/* Batch Actions */}
                {selectedKeywords.size > 0 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleBatchToggleKeywords(true)}
                      disabled={deletingKeywords}
                      className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                      title="Activate selected"
                    >
                      <ToggleRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleBatchToggleKeywords(false)}
                      disabled={deletingKeywords}
                      className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      title="Deactivate selected"
                    >
                      <ToggleLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleBatchDeleteKeywords}
                      disabled={deletingKeywords}
                      className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      title="Delete selected"
                    >
                      {deletingKeywords ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="divide-y dark:divide-gray-700 max-h-96 overflow-y-auto">
            {keywordsLoading ? (
              <div className="p-6 text-center text-gray-500">Loading...</div>
            ) : !Array.isArray(keywords?.data) || keywords.data.length === 0 ? (
              <EmptyState
                icon={Key}
                title="No keywords configured"
                description="Add keywords to discover relevant Reddit discussions for engagement."
                actions={[
                  {
                    label: 'Add Keyword',
                    onClick: () => { setEditingKeyword(null); setShowKeywordForm(true); },
                    primary: true,
                  },
                  {
                    label: 'Import from GSC',
                    onClick: () => setShowGscImport(true),
                  },
                ]}
              />
            ) : filteredKeywords.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No keywords match "{keywordSearch}"
              </div>
            ) : (
              filteredKeywords.map((kw: Keyword) => (
                <div
                  key={kw.id}
                  className={`px-6 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors ${
                    selectedKeywords.has(kw.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onClick={() => toggleKeywordSelection(kw.id)}
                >
                  {/* Checkbox */}
                  <div className="flex-shrink-0">
                    {selectedKeywords.has(kw.id) ? (
                      <CheckSquare className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Square className="h-5 w-5 text-gray-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{kw.keyword}</p>
                      {!kw.isActive && (
                        <span className="badge badge-gray text-xs">Inactive</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {kw.category && (
                        <span className={`badge ${getCategoryBadge(kw.category)}`}>
                          {kw.category}
                        </span>
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Priority: {kw.priority === 1 ? 'High' : kw.priority === 2 ? 'Medium' : 'Low'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openEditKeyword(kw)}
                      className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-1"
                      title="Edit keyword"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this keyword?')) {
                          deleteKeyword.mutate(kw.id);
                        }
                      }}
                      className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1"
                      title="Delete keyword"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Subreddits Section */}
        <div className="card">
          <div className="px-6 py-4 border-b dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Subreddits</h2>
                {subreddits?.data && subreddits.data.length > 0 && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ({filteredSubreddits.length}{subredditSearch ? ` / ${subreddits.data.length}` : ''})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {subreddits?.data && subreddits.data.length > 0 && (
                  <button
                    onClick={() => exportSubreddits(subreddits.data)}
                    className="btn btn-secondary text-sm flex items-center"
                    title="Export to CSV"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditingSubreddit(null);
                    setShowSubredditForm(true);
                  }}
                  className="btn btn-primary text-sm flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </button>
              </div>
            </div>

            {/* Search Input */}
            {subreddits?.data && subreddits.data.length > 0 && (
              <div className="mt-3">
                <SearchInput
                  value={subredditSearch}
                  onChange={setSubredditSearch}
                  placeholder="Search subreddits..."
                  className="w-full"
                />
              </div>
            )}

            {/* Selection Bar */}
            {filteredSubreddits.length > 0 && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <button
                    onClick={isAllSubredditsSelected ? clearSubredditSelection : selectAllSubreddits}
                    className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  >
                    {isAllSubredditsSelected ? (
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                    ) : selectedSubreddits.size > 0 ? (
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    {isAllSubredditsSelected ? 'Deselect All' : 'Select All'}
                  </button>
                  {selectedSubreddits.size > 0 && (
                    <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                      {selectedSubreddits.size} selected
                    </span>
                  )}
                </div>

                {/* Batch Actions */}
                {selectedSubreddits.size > 0 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleBatchToggleSubreddits(true)}
                      disabled={deletingSubreddits}
                      className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                      title="Activate selected"
                    >
                      <ToggleRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleBatchToggleSubreddits(false)}
                      disabled={deletingSubreddits}
                      className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      title="Deactivate selected"
                    >
                      <ToggleLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleBatchDeleteSubreddits}
                      disabled={deletingSubreddits}
                      className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      title="Delete selected"
                    >
                      {deletingSubreddits ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="divide-y dark:divide-gray-700 max-h-96 overflow-y-auto">
            {subredditsLoading ? (
              <div className="p-6 text-center text-gray-500">Loading...</div>
            ) : !Array.isArray(subreddits?.data) || subreddits.data.length === 0 ? (
              <EmptyState
                icon={MessageCircle}
                title="No subreddits configured"
                description="Add subreddits where you want to engage with your target audience."
                actions={[
                  {
                    label: 'Add Subreddit',
                    onClick: () => { setEditingSubreddit(null); setShowSubredditForm(true); },
                    primary: true,
                  },
                ]}
              />
            ) : filteredSubreddits.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No subreddits match "{subredditSearch}"
              </div>
            ) : (
              filteredSubreddits.map((sub: Subreddit) => (
                <div
                  key={sub.id}
                  className={`px-6 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors ${
                    selectedSubreddits.has(sub.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onClick={() => toggleSubredditSelection(sub.id)}
                >
                  {/* Checkbox */}
                  <div className="flex-shrink-0">
                    {selectedSubreddits.has(sub.id) ? (
                      <CheckSquare className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Square className="h-5 w-5 text-gray-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">r/{sub.name}</p>
                      <span className={`badge ${sub.isActive ? 'badge-success' : 'badge-gray'}`}>
                        {sub.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Phase {sub.phase} · Min karma: {sub.minKarma}
                    </p>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openEditSubreddit(sub)}
                      className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-1"
                      title="Edit subreddit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this subreddit?')) {
                          deleteSubreddit.mutate(sub.id);
                        }
                      }}
                      className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1"
                      title="Delete subreddit"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Keyword Form Modal */}
      {showKeywordForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={closeKeywordForm} />
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold dark:text-gray-100">
                  {editingKeyword ? 'Edit Keyword' : 'Add Keyword'}
                </h2>
                <button onClick={closeKeywordForm} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={keywordForm.handleSubmit(onSubmitKeyword)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Keyword</label>
                  <input {...keywordForm.register('keyword', { required: true })} className="input mt-1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                  <select {...keywordForm.register('category')} className="input mt-1">
                    <option value="">Select category</option>
                    <option value="core">Core</option>
                    <option value="competitor">Competitor</option>
                    <option value="brand">Brand</option>
                    <option value="broad">Broad</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
                  <select {...keywordForm.register('priority', { valueAsNumber: true })} className="input mt-1">
                    <option value={1}>High</option>
                    <option value={2}>Medium</option>
                    <option value={3}>Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Search Variants (comma-separated)</label>
                  <input {...keywordForm.register('searchVariants')} className="input mt-1" placeholder="variant1, variant2" />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...keywordForm.register('isActive')}
                    id="keyword-active"
                    className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <label htmlFor="keyword-active" className="text-sm text-gray-700 dark:text-gray-300">Active</label>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={closeKeywordForm} className="btn btn-secondary">Cancel</button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={createKeyword.isPending || updateKeyword.isPending}
                  >
                    {createKeyword.isPending || updateKeyword.isPending ? 'Saving...' : editingKeyword ? 'Save Changes' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Subreddit Form Modal */}
      {showSubredditForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={closeSubredditForm} />
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold dark:text-gray-100">
                  {editingSubreddit ? 'Edit Subreddit' : 'Add Subreddit'}
                </h2>
                <button onClick={closeSubredditForm} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={subredditForm.handleSubmit(onSubmitSubreddit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subreddit Name</label>
                  <input
                    {...subredditForm.register('name', { required: true })}
                    className="input mt-1"
                    placeholder="fitness"
                    disabled={!!editingSubreddit}
                  />
                  {editingSubreddit && (
                    <p className="text-xs text-gray-500 mt-1">Subreddit name cannot be changed</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phase</label>
                  <select {...subredditForm.register('phase', { valueAsNumber: true })} className="input mt-1">
                    <option value={1}>Phase 1</option>
                    <option value={2}>Phase 2</option>
                    <option value={3}>Phase 3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Minimum Karma</label>
                  <input {...subredditForm.register('minKarma', { valueAsNumber: true })} type="number" className="input mt-1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Self-Promo Rules</label>
                  <textarea {...subredditForm.register('selfPromoRules')} className="input mt-1" rows={2} />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...subredditForm.register('isActive')}
                    id="subreddit-active"
                    className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <label htmlFor="subreddit-active" className="text-sm text-gray-700 dark:text-gray-300">Active</label>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={closeSubredditForm} className="btn btn-secondary">Cancel</button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={createSubreddit.isPending || updateSubreddit.isPending}
                  >
                    {createSubreddit.isPending || updateSubreddit.isPending ? 'Saving...' : editingSubreddit ? 'Save Changes' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* GSC Import Modal */}
      {showGscImport && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-25"
              onClick={() => {
                setShowGscImport(false);
                setSelectedGscKeywords(new Set());
              }}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold dark:text-gray-100">Import from Google Search Console</h2>
                <button
                  onClick={() => {
                    setShowGscImport(false);
                    setSelectedGscKeywords(new Set());
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Select keywords from Search Console to add as tracking keywords. These are high-potential queries based on impressions and position.
              </p>

              {gscLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Loading suggestions...</span>
                </div>
              ) : gscSuggestions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No keyword suggestions available.</p>
                  <p className="text-sm mt-1">Connect Search Console and sync data first.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedGscKeywords.size} of {gscSuggestions.length} selected
                    </span>
                    <div className="flex gap-2">
                      <button onClick={selectAllGscKeywords} className="text-sm text-blue-600 hover:text-blue-800">
                        Select All
                      </button>
                      <button onClick={clearGscSelection} className="text-sm text-gray-600 hover:text-gray-800">
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto border dark:border-gray-700 rounded-lg divide-y dark:divide-gray-700">
                    {gscSuggestions.map((suggestion) => (
                      <div
                        key={suggestion.query}
                        className={`p-3 flex items-start gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                          selectedGscKeywords.has(suggestion.query) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                        onClick={() => toggleGscKeyword(suggestion.query)}
                      >
                        <div className="pt-0.5">
                          {selectedGscKeywords.has(suggestion.query) ? (
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                          ) : (
                            <div className="h-5 w-5 border-2 border-gray-300 dark:border-gray-600 rounded-full" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-gray-100">{suggestion.query}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                            <span>{suggestion.impressions.toLocaleString()} impressions</span>
                            <span>Pos: {suggestion.position.toFixed(1)}</span>
                            <span>{suggestion.clicks} clicks</span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{suggestion.reason}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`badge ${getCategoryBadge(suggestion.suggestedCategory)}`}>
                            {suggestion.suggestedCategory}
                          </span>
                          <span className="text-xs text-gray-500">
                            Priority: {suggestion.suggestedPriority === 1 ? 'High' : suggestion.suggestedPriority === 2 ? 'Medium' : 'Low'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowGscImport(false);
                    setSelectedGscKeywords(new Set());
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportGscKeywords}
                  disabled={selectedGscKeywords.size === 0 || importingKeywords}
                  className="btn btn-primary"
                >
                  {importingKeywords ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>Import {selectedGscKeywords.size} Keywords</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
