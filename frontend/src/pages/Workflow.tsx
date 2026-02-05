import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { engagementsApi, accountsApi } from '../services/api';
import { RefreshCw, Download, LayoutGrid, List, CheckSquare, Square, Star, ChevronRight, ListTodo } from 'lucide-react';
import type { EngagementItem, EngagementStatus, RedditAccount, GenerationOptions, CommentStyle } from '../types';
import { exportEngagementItems } from '../utils/csvExport';
import KanbanBoard from '../components/KanbanBoard';
import EngagementDetailPanel from '../components/EngagementDetailPanel';
import PageHeader from '../components/PageHeader';
import SearchInput from '../components/SearchInput';
import EmptyState from '../components/EmptyState';

const statusTabs: { key: EngagementStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'discovered', label: 'Discovered' },
  { key: 'draft_ready', label: 'Draft Ready' },
  { key: 'in_review', label: 'In Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'published', label: 'Published' },
  { key: 'rejected', label: 'Rejected' },
];

export default function Workflow() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<EngagementStatus | 'all'>('all');
  const [selectedItem, setSelectedItem] = useState<EngagementItem | null>(null);
  const [editedResponse, setEditedResponse] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const { data: engagements, isLoading } = useQuery({
    queryKey: ['engagements', activeTab],
    queryFn: () =>
      engagementsApi.list({
        status: activeTab === 'all' ? undefined : activeTab,
        limit: 50,
      }),
  });

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  });

  const analyzeMutation = useMutation({
    mutationFn: (id: string) => engagementsApi.analyze(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
      setSelectedItem(data.data);
    },
  });

  const generateMutation = useMutation({
    mutationFn: ({ id, accountId, options }: { id: string; accountId: string; options?: GenerationOptions }) =>
      engagementsApi.generate(id, accountId, options),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
      setSelectedItem(data.data);
      setEditedResponse(data.data.draftResponse || '');
    },
  });

  const refineMutation = useMutation({
    mutationFn: ({ id, options }: { id: string; options: { action: 'shorten' | 'expand' | 'restyle'; targetStyle?: CommentStyle } }) =>
      engagementsApi.refine(id, options),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
      setSelectedItem(data.data);
      setEditedResponse(data.data.editedResponse || data.data.draftResponse || '');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => engagementsApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
      setSelectedItem(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => engagementsApi.reject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
      setSelectedItem(null);
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => engagementsApi.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
      setSelectedItem(null);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: EngagementStatus }) => {
      // Map status to the appropriate action
      if (status === 'approved') {
        return engagementsApi.approve(id);
      } else if (status === 'in_review') {
        return engagementsApi.update(id, {});
      }
      // For other statuses, return the current item (no-op)
      return engagementsApi.get(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
    },
  });

  // Batch mutations for bulk actions
  const batchApproveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(
        ids.map(id => engagementsApi.approve(id))
      );
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
      setSelectedItems(new Set());
    },
  });

  const batchRejectMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(
        ids.map(id => engagementsApi.reject(id))
      );
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
      setSelectedItems(new Set());
    },
  });

  const handleStatusChange = (itemId: string, newStatus: EngagementStatus) => {
    updateStatusMutation.mutate({ id: itemId, status: newStatus });
  };

  // Bulk selection helpers
  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const selectAllItems = () => {
    const items = engagements?.data?.items || [];
    const eligibleItems = items.filter((item: EngagementItem) =>
      ['draft_ready', 'in_review'].includes(item.status)
    );
    setSelectedItems(new Set(eligibleItems.map((item: EngagementItem) => item.id)));
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const getSelectedEligibleItems = () => {
    const items = engagements?.data?.items || [];
    return items.filter((item: EngagementItem) =>
      selectedItems.has(item.id) && ['draft_ready', 'in_review'].includes(item.status)
    );
  };

  const accountsList = Array.isArray(accounts?.data) ? accounts.data : [];
  const activeAccounts = accountsList.filter(
    (a: RedditAccount) => a.status === 'active' && a.personaId
  );

  // Helper for score badge colors
  const getScoreBadgeClass = (score: number) => {
    if (score >= 7) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    if (score >= 4) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
  };

  // Calculate progress stats
  const rawItems = engagements?.data?.items;
  const items = Array.isArray(rawItems) ? rawItems : [];
  const reviewedCount = items.filter((item: EngagementItem) =>
    ['approved', 'rejected', 'published'].includes(item.status)
  ).length;
  const recommendedItems = items.filter((item: EngagementItem) => item.isRecommended);

  // Filter items based on search
  const filteredItems = useMemo(() => {
    const raw = engagements?.data?.items;
    const itemsList = Array.isArray(raw) ? raw : [];
    if (!searchTerm.trim()) return itemsList;
    const search = searchTerm.toLowerCase();
    return itemsList.filter((item: EngagementItem) =>
      item.postTitle.toLowerCase().includes(search) ||
      item.subreddit.toLowerCase().includes(search) ||
      item.matchedKeyword?.toLowerCase().includes(search)
    );
  }, [engagements?.data?.items, searchTerm]);

  // Navigate to next recommended post
  const goToNextRecommended = () => {
    const currentIndex = selectedItem
      ? items.findIndex((item: EngagementItem) => item.id === selectedItem.id)
      : -1;

    // Find next recommended item after current
    for (let i = currentIndex + 1; i < items.length; i++) {
      if (items[i].isRecommended && !['approved', 'rejected', 'published'].includes(items[i].status)) {
        setSelectedItem(items[i]);
        setEditedResponse(items[i].editedResponse || items[i].draftResponse || '');
        return;
      }
    }
    // Wrap around to beginning
    for (let i = 0; i <= currentIndex; i++) {
      if (items[i].isRecommended && !['approved', 'rejected', 'published'].includes(items[i].status)) {
        setSelectedItem(items[i]);
        setEditedResponse(items[i].editedResponse || items[i].draftResponse || '');
        return;
      }
    }
  };

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    const items = engagements?.data?.items || [];
    const currentIndex = selectedItem ? items.findIndex((item: EngagementItem) => item.id === selectedItem.id) : -1;

    switch (e.key.toLowerCase()) {
      case 'a':
        if (selectedItem && ['draft_ready', 'in_review'].includes(selectedItem.status)) {
          approveMutation.mutate(selectedItem.id);
        }
        break;
      case 'r':
        if (selectedItem && ['draft_ready', 'in_review'].includes(selectedItem.status)) {
          rejectMutation.mutate(selectedItem.id);
        }
        break;
      case 'p':
        if (selectedItem && selectedItem.status === 'approved') {
          publishMutation.mutate(selectedItem.id);
        }
        break;
      case 'j':
      case 'arrowdown':
        if (currentIndex < items.length - 1) {
          const nextItem = items[currentIndex + 1];
          setSelectedItem(nextItem);
          setEditedResponse(nextItem.editedResponse || nextItem.draftResponse || '');
        }
        break;
      case 'k':
      case 'arrowup':
        if (currentIndex > 0) {
          const prevItem = items[currentIndex - 1];
          setSelectedItem(prevItem);
          setEditedResponse(prevItem.editedResponse || prevItem.draftResponse || '');
        }
        break;
      case 'escape':
        setSelectedItem(null);
        break;
    }
  }, [selectedItem, engagements, approveMutation, rejectMutation, publishMutation]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleExport = () => {
    const itemsToExport = engagements?.data?.items || [];
    if (itemsToExport.length === 0) {
      return;
    }
    exportEngagementItems(itemsToExport);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflow Queue"
        description={`Review and manage engagement items${items.length > 0 ? ` · ${reviewedCount} of ${items.length} reviewed` : ''}`}
        breadcrumbs={[{ label: 'Content' }, { label: 'Workflow' }]}
        badge={recommendedItems.filter((i: EngagementItem) => !['approved', 'rejected', 'published'].includes(i.status)).length > 0 ? {
          label: `${recommendedItems.filter((i: EngagementItem) => !['approved', 'rejected', 'published'].includes(i.status)).length} recommended`,
          variant: 'warning',
        } : undefined}
        actions={
          <div className="flex items-center gap-4">
            {/* Next Recommended Button */}
            {recommendedItems.length > 0 && (
              <button
                onClick={goToNextRecommended}
                className="btn btn-primary text-sm flex items-center gap-1"
                title="Jump to next recommended post (unreviewed)"
              >
                <Star className="h-4 w-4" />
                Next Recommended
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            {/* View Toggle */}
            <div className="flex items-center border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 flex items-center gap-1 text-sm ${
                  viewMode === 'list'
                    ? 'bg-brand-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <List className="h-4 w-4" />
                List
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-2 flex items-center gap-1 text-sm ${
                  viewMode === 'kanban'
                    ? 'bg-brand-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                Kanban
              </button>
            </div>
            {items.length > 0 && (
              <button
                onClick={handleExport}
                className="btn btn-secondary text-sm flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            )}
            <div className="hidden lg:block text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg">
              <span className="font-medium">Keys:</span> J/K · A · R · P
            </div>
          </div>
        }
      />

      {/* Search Input */}
      {items.length > 0 && viewMode === 'list' && (
        <div className="max-w-md">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search posts, subreddits, keywords..."
          />
          {searchTerm && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Showing {filteredItems.length} of {items.length} items
            </p>
          )}
        </div>
      )}

      {/* Status Tabs - only show in list view */}
      {viewMode === 'list' && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-6 overflow-x-auto">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium ${
                  activeTab === tab.key
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedItems.size > 0 && viewMode === 'list' && (
        <div className="bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-brand-700 dark:text-brand-300">
              {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={selectAllItems}
              className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              Select all eligible
            </button>
            <button
              onClick={clearSelection}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              Clear selection
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const eligibleIds = getSelectedEligibleItems().map((item: EngagementItem) => item.id);
                if (eligibleIds.length > 0) {
                  batchRejectMutation.mutate(eligibleIds);
                }
              }}
              disabled={batchRejectMutation.isPending || getSelectedEligibleItems().length === 0}
              className="btn btn-danger text-sm flex items-center gap-1"
            >
              {batchRejectMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>Reject ({getSelectedEligibleItems().length})</>
              )}
            </button>
            <button
              onClick={() => {
                const eligibleIds = getSelectedEligibleItems().map((item: EngagementItem) => item.id);
                if (eligibleIds.length > 0) {
                  batchApproveMutation.mutate(eligibleIds);
                }
              }}
              disabled={batchApproveMutation.isPending || getSelectedEligibleItems().length === 0}
              className="btn btn-success text-sm flex items-center gap-1"
            >
              {batchApproveMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>Approve ({getSelectedEligibleItems().length})</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="flex gap-6">
          <div className="flex-1">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
            ) : (
              <KanbanBoard
                items={engagements?.data?.items || []}
                onItemClick={(item) => {
                  setSelectedItem(item);
                  setEditedResponse(item.editedResponse || item.draftResponse || '');
                }}
                onStatusChange={handleStatusChange}
                selectedItemId={selectedItem?.id}
              />
            )}
          </div>
          {/* Detail Panel - rendered separately below */}
        </div>
      )}

      {/* List View with Split Screen */}
      {viewMode === 'list' && (
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6" style={{ minHeight: '400px' }}>
          {/* Item List - Hidden on mobile when item selected */}
          <div className={`
            ${selectedItem ? 'hidden lg:flex lg:w-2/5 xl:w-1/3' : 'w-full'}
            transition-all overflow-hidden flex flex-col
            lg:h-[calc(100vh-320px)] lg:min-h-[500px]
          `}>
            <div className="card divide-y divide-gray-200 dark:divide-gray-700 overflow-y-auto flex-1">
              {isLoading ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
              ) : items.length === 0 ? (
                <EmptyState
                  icon={ListTodo}
                  title="No items in workflow"
                  description="Run discovery to find Reddit posts that match your keywords and start engaging."
                  actions={[
                    { label: 'Go to Discovery', href: '/discovery', primary: true },
                  ]}
                />
              ) : filteredItems.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  No items match "{searchTerm}"
                </div>
              ) : (
                filteredItems.map((item: EngagementItem) => (
                  <div
                    key={item.id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      selectedItem?.id === item.id ? 'bg-brand-50 dark:bg-brand-900/30' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox for bulk selection */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleItemSelection(item.id);
                        }}
                        className={`mt-0.5 p-0.5 rounded ${
                          ['draft_ready', 'in_review'].includes(item.status)
                            ? 'text-gray-400 hover:text-brand-600 dark:hover:text-brand-400'
                            : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                        }`}
                        disabled={!['draft_ready', 'in_review'].includes(item.status)}
                        title={
                          ['draft_ready', 'in_review'].includes(item.status)
                            ? 'Select for bulk actions'
                            : 'Only draft/review items can be bulk selected'
                        }
                      >
                        {selectedItems.has(item.id) ? (
                          <CheckSquare className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </button>
                      <div
                        className="flex-1 min-w-0"
                        onClick={() => {
                          setSelectedItem(item);
                          setEditedResponse(item.editedResponse || item.draftResponse || '');
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {item.isRecommended && (
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                              )}
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {item.postTitle}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                r/{item.subreddit}
                                {item.matchedKeyword && ` · ${item.matchedKeyword}`}
                              </p>
                              {item.relevanceScore && (
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${getScoreBadgeClass(item.relevanceScore)}`}>
                                  {item.relevanceScore}/10
                                </span>
                              )}
                            </div>
                          </div>
                          <span
                            className={`badge ml-2 flex-shrink-0 ${
                              item.status === 'published'
                                ? 'badge-success'
                                : item.status === 'approved'
                                ? 'badge-info'
                                : item.status === 'rejected' || item.status === 'failed'
                                ? 'badge-danger'
                                : 'badge-warning'
                            }`}
                          >
                            {item.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Detail Panel - Full width on mobile, split on desktop */}
          {selectedItem && (
            <div className="w-full lg:w-3/5 xl:w-2/3 flex-shrink-0 lg:h-[calc(100vh-320px)] lg:min-h-[500px]">
              <EngagementDetailPanel
                item={selectedItem}
                editedResponse={editedResponse}
                onEditedResponseChange={setEditedResponse}
                onClose={() => setSelectedItem(null)}
                onAnalyze={() => analyzeMutation.mutate(selectedItem.id)}
                onGenerate={(accountId, options) => generateMutation.mutate({ id: selectedItem.id, accountId, options })}
                onRefine={(options) => refineMutation.mutate({ id: selectedItem.id, options })}
                onApprove={() => approveMutation.mutate(selectedItem.id)}
                onReject={() => rejectMutation.mutate(selectedItem.id)}
                onPublish={() => publishMutation.mutate(selectedItem.id)}
                activeAccounts={activeAccounts}
                isAnalyzing={analyzeMutation.isPending}
                isGenerating={generateMutation.isPending}
                isRefining={refineMutation.isPending}
                isApproving={approveMutation.isPending}
                isRejecting={rejectMutation.isPending}
                isPublishing={publishMutation.isPending}
                inline
              />
            </div>
          )}
        </div>
      )}

      {/* Detail Panel for Kanban view - Floating */}
      {viewMode === 'kanban' && selectedItem && (
        <EngagementDetailPanel
          item={selectedItem}
          editedResponse={editedResponse}
          onEditedResponseChange={setEditedResponse}
          onClose={() => setSelectedItem(null)}
          onAnalyze={() => analyzeMutation.mutate(selectedItem.id)}
          onGenerate={(accountId, options) => generateMutation.mutate({ id: selectedItem.id, accountId, options })}
          onRefine={(options) => refineMutation.mutate({ id: selectedItem.id, options })}
          onApprove={() => approveMutation.mutate(selectedItem.id)}
          onReject={() => rejectMutation.mutate(selectedItem.id)}
          onPublish={() => publishMutation.mutate(selectedItem.id)}
          activeAccounts={activeAccounts}
          isAnalyzing={analyzeMutation.isPending}
          isGenerating={generateMutation.isPending}
          isRefining={refineMutation.isPending}
          isApproving={approveMutation.isPending}
          isRejecting={rejectMutation.isPending}
          isPublishing={publishMutation.isPending}
        />
      )}
    </div>
  );
}
