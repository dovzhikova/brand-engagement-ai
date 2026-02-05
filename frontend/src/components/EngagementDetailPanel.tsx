import { useState, useEffect } from 'react';
import {
  ExternalLink,
  RefreshCw,
  Check,
  X,
  Send,
  Eye,
  EyeOff,
  Columns,
  PanelRightClose,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Bold,
  Italic,
  Link,
  List,
  Star,
  Minimize2,
  Maximize2,
  Palette,
  Settings2,
} from 'lucide-react';
import type { EngagementItem, RedditAccount, GenerationOptions, CommentLength, CommentStyle } from '../types';

const LAST_ACCOUNT_KEY = 'engage_last_account_id';

const REDDIT_CHAR_LIMIT = 10000;

interface EngagementDetailPanelProps {
  item: EngagementItem;
  editedResponse: string;
  onEditedResponseChange: (value: string) => void;
  onClose: () => void;
  onAnalyze: () => void;
  onGenerate: (accountId: string, options?: GenerationOptions) => void;
  onRefine: (options: { action: 'shorten' | 'expand' | 'restyle'; targetStyle?: CommentStyle }) => void;
  onApprove: () => void;
  onReject: () => void;
  onPublish: () => void;
  activeAccounts: RedditAccount[];
  isAnalyzing: boolean;
  isGenerating: boolean;
  isRefining: boolean;
  isApproving: boolean;
  isRejecting: boolean;
  isPublishing: boolean;
  inline?: boolean;
}

export default function EngagementDetailPanel({
  item,
  editedResponse,
  onEditedResponseChange,
  onClose,
  onAnalyze,
  onGenerate,
  onRefine,
  onApprove,
  onReject,
  onPublish,
  activeAccounts,
  isAnalyzing,
  isGenerating,
  isRefining,
  isApproving,
  isRejecting,
  isPublishing,
  inline = false,
}: EngagementDetailPanelProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [splitView, setSplitView] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showGenOptions, setShowGenOptions] = useState(false);
  const [genLength, setGenLength] = useState<CommentLength>('standard');
  const [genStyle, setGenStyle] = useState<CommentStyle>('friendly');
  const [brandVoice, setBrandVoice] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [showStyleDropdown, setShowStyleDropdown] = useState(false);

  const charCount = editedResponse.length;
  const isOverLimit = charCount > REDDIT_CHAR_LIMIT;

  // Load last used account from localStorage
  useEffect(() => {
    const lastAccountId = localStorage.getItem(LAST_ACCOUNT_KEY);
    if (lastAccountId && activeAccounts.some((a: RedditAccount) => a.id === lastAccountId)) {
      setSelectedAccountId(lastAccountId);
    } else if (activeAccounts.length > 0) {
      setSelectedAccountId(activeAccounts[0].id);
    }
  }, [activeAccounts]);

  const selectedAccount = activeAccounts.find((a: RedditAccount) => a.id === selectedAccountId);

  const handleGenerate = () => {
    if (selectedAccountId) {
      localStorage.setItem(LAST_ACCOUNT_KEY, selectedAccountId);
      const options: GenerationOptions = {
        length: genLength,
        style: genStyle,
        ...(brandVoice && { brandVoice }),
        ...(customInstructions && { customInstructions }),
      };
      onGenerate(selectedAccountId, options);
      setShowAccountDropdown(false);
      setShowGenOptions(false);
    }
  };

  const handleSelectAccount = (accountId: string) => {
    setSelectedAccountId(accountId);
    setShowAccountDropdown(false);
  };

  // Insert formatting at cursor position
  const insertFormatting = (prefix: string, suffix: string = prefix) => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = editedResponse.substring(start, end);
    const newText = editedResponse.substring(0, start) + prefix + selectedText + suffix + editedResponse.substring(end);
    onEditedResponseChange(newText);

    // Restore cursor position after formatting
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const renderMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-surface-200 dark:bg-surface-700 px-1 rounded">$1</code>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-primary-600 underline">$1</a>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className={`card p-4 lg:p-6 space-y-4 overflow-y-auto transition-all ${
      inline
        ? 'h-full min-h-[400px] lg:min-h-0'
        : `fixed right-4 lg:right-6 top-20 lg:top-24 max-h-[calc(100vh-100px)] lg:max-h-[calc(100vh-120px)] z-30 shadow-xl w-[calc(100vw-2rem)] sm:w-96 ${splitView ? 'lg:w-[700px]' : ''}`
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Back button on mobile for inline mode */}
          {inline && (
            <button
              onClick={onClose}
              className="lg:hidden p-1 -ml-1 mr-1 text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
              title="Back to list"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <h3 className="font-medium text-surface-900 dark:text-surface-100">Post Details</h3>
          {item.isRecommended && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
              <Star className="h-3 w-3 fill-current" />
              Recommended
            </span>
          )}
          {item.relevanceScore && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              item.relevanceScore >= 7
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : item.relevanceScore >= 4
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                : 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400'
            }`}>
              {item.relevanceScore}/10
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(item.draftResponse || item.editedResponse) && (
            <button
              onClick={() => setSplitView(!splitView)}
              className="p-1 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
              title={splitView ? 'Collapse view' : 'Split view'}
            >
              {splitView ? <PanelRightClose className="h-4 w-4" /> : <Columns className="h-4 w-4" />}
            </button>
          )}
          <a
            href={item.postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-700"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <button
            onClick={onClose}
            className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Split View Layout */}
      <div className={splitView ? 'grid grid-cols-2 gap-4' : ''}>
        {/* Left Side - Original Post */}
        <div className={splitView ? 'space-y-4 border-r dark:border-surface-700 pr-4' : 'space-y-4'}>
          <div>
            <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
              {item.postTitle}
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
              r/{item.subreddit} · by u/{item.postAuthor}
            </p>
          </div>

          {item.postContent && (
            <div className="bg-surface-50 dark:bg-surface-900 rounded-lg p-3 text-sm text-surface-700 dark:text-surface-300 max-h-48 overflow-y-auto">
              {item.postContent}
            </div>
          )}

          {item.aiAnalysis && (
            <div className="text-sm">
              <p className="font-medium text-surface-700 dark:text-surface-300">AI Analysis</p>
              <p className="text-surface-600 dark:text-surface-400 mt-1">
                {item.aiAnalysis.reasoning}
              </p>
              {item.aiAnalysis.cautions && item.aiAnalysis.cautions.length > 0 && (
                <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                  <span className="font-medium">Cautions:</span> {item.aiAnalysis.cautions.join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Generate Draft - available even without accounts */}
          {!splitView && (item.status === 'discovered' || item.status === 'analyzing') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-surface-700 dark:text-surface-300">Generate Draft</p>
                <button
                  onClick={() => setShowGenOptions(!showGenOptions)}
                  className="text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 p-1 flex items-center gap-1 text-xs"
                  title="Generation options"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  Options
                  {showGenOptions ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </div>

              {/* Generation Options */}
              {showGenOptions && (
                <div className="bg-surface-50 dark:bg-surface-900 rounded-lg p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-surface-600 dark:text-surface-400">Length</label>
                      <select
                        value={genLength}
                        onChange={(e) => setGenLength(e.target.value as CommentLength)}
                        className="input text-xs py-1 mt-1"
                      >
                        <option value="concise">Concise (~80 words)</option>
                        <option value="standard">Standard (~150 words)</option>
                        <option value="detailed">Detailed (~250 words)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-surface-600 dark:text-surface-400">Style</label>
                      <select
                        value={genStyle}
                        onChange={(e) => setGenStyle(e.target.value as CommentStyle)}
                        className="input text-xs py-1 mt-1"
                      >
                        <option value="friendly">Friendly</option>
                        <option value="casual">Casual</option>
                        <option value="professional">Professional</option>
                        <option value="technical">Technical</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-surface-600 dark:text-surface-400">Brand Voice (optional)</label>
                    <textarea
                      value={brandVoice}
                      onChange={(e) => setBrandVoice(e.target.value)}
                      className="input text-xs py-1 mt-1 min-h-[60px]"
                      placeholder="Custom brand context or voice instructions..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-surface-600 dark:text-surface-400">Custom Instructions (optional)</label>
                    <textarea
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      className="input text-xs py-1 mt-1 min-h-[40px]"
                      placeholder="Any additional instructions for this comment..."
                    />
                  </div>
                </div>
              )}

              {activeAccounts.length > 0 ? (
                <div className="relative">
                  <div className="flex">
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating || !selectedAccountId}
                      className="btn btn-primary text-sm flex-1 flex items-center justify-center gap-2 rounded-r-none"
                    >
                      {isGenerating ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Generate with {selectedAccount?.username || 'Select account'}
                    </button>
                    <button
                      onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                      disabled={isGenerating}
                      className="btn btn-primary text-sm px-2 rounded-l-none border-l border-primary-500"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  {showAccountDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg shadow-lg">
                      {activeAccounts.map((acc: RedditAccount) => (
                        <button
                          key={acc.id}
                          onClick={() => handleSelectAccount(acc.id)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-50 dark:hover:bg-surface-700 first:rounded-t-lg last:rounded-b-lg ${
                            selectedAccountId === acc.id ? 'bg-primary-50 dark:bg-primary-900/30' : ''
                          }`}
                        >
                          <span className="font-medium">u/{acc.username}</span>
                          <span className="text-surface-500 dark:text-surface-400 ml-1">({acc.persona?.name})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => onGenerate('', { length: genLength, style: genStyle, brandVoice, customInstructions })}
                  disabled={isGenerating}
                  className="btn btn-primary w-full text-sm flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Generate Draft
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Side - Draft Editor (only in split view or when there's a draft) */}
        {(splitView || (!splitView && (item.draftResponse || item.editedResponse))) && (
          <div className="space-y-4">
            {/* Draft Editor */}
            {(item.draftResponse || item.editedResponse) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-surface-700 dark:text-surface-300">
                    {splitView ? 'Your Response' : 'Response'}
                  </p>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 p-1"
                    title={showPreview ? 'Edit' : 'Preview'}
                  >
                    {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {showPreview ? (
                  <div
                    className="bg-surface-50 dark:bg-surface-900 rounded-lg p-3 text-sm text-surface-700 dark:text-surface-300 min-h-[200px] max-h-64 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(editedResponse) }}
                  />
                ) : (
                  <div className="space-y-1">
                    {/* Formatting toolbar */}
                    <div className="flex items-center justify-between pb-1">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => insertFormatting('**')}
                          className="p-1.5 text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 rounded"
                          title="Bold (Ctrl+B)"
                        >
                          <Bold className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => insertFormatting('*')}
                          className="p-1.5 text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 rounded"
                          title="Italic (Ctrl+I)"
                        >
                          <Italic className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => insertFormatting('[', '](url)')}
                          className="p-1.5 text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 rounded"
                          title="Insert link"
                        >
                          <Link className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => insertFormatting('\n- ', '')}
                          className="p-1.5 text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 rounded"
                          title="Bullet list"
                        >
                          <List className="h-4 w-4" />
                        </button>
                      </div>

                      {/* AI Refinement buttons */}
                      {item.status !== 'published' && (
                        <div className="flex items-center gap-1 border-l dark:border-surface-600 pl-2 ml-2">
                          <button
                            type="button"
                            onClick={() => onRefine({ action: 'shorten' })}
                            disabled={isRefining}
                            className="p-1.5 text-surface-500 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded flex items-center gap-1 text-xs"
                            title="Make shorter"
                          >
                            {isRefining ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Minimize2 className="h-3.5 w-3.5" />
                            )}
                            <span className="hidden sm:inline">Shorten</span>
                          </button>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setShowStyleDropdown(!showStyleDropdown)}
                              disabled={isRefining}
                              className="p-1.5 text-surface-500 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded flex items-center gap-1 text-xs"
                              title="Change style"
                            >
                              <Palette className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Restyle</span>
                              <ChevronDown className="h-3 w-3" />
                            </button>
                            {showStyleDropdown && (
                              <div className="absolute right-0 z-10 mt-1 w-32 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg shadow-lg">
                                {(['casual', 'friendly', 'professional', 'technical'] as CommentStyle[]).map((style) => (
                                  <button
                                    key={style}
                                    onClick={() => {
                                      onRefine({ action: 'restyle', targetStyle: style });
                                      setShowStyleDropdown(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-surface-50 dark:hover:bg-surface-700 first:rounded-t-lg last:rounded-b-lg capitalize"
                                  >
                                    {style}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => onRefine({ action: 'expand' })}
                            disabled={isRefining}
                            className="p-1.5 text-surface-500 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded flex items-center gap-1 text-xs"
                            title="Expand with more detail"
                          >
                            <Maximize2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Expand</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <textarea
                      value={editedResponse}
                      onChange={(e) => onEditedResponseChange(e.target.value)}
                      className="input text-sm min-h-[200px]"
                      disabled={item.status === 'published'}
                      placeholder="Write your response..."
                    />
                  </div>
                )}
                <div className={`text-xs text-right ${isOverLimit ? 'text-red-500' : 'text-surface-500 dark:text-surface-400'}`}>
                  {charCount.toLocaleString()} / {REDDIT_CHAR_LIMIT.toLocaleString()}
                  {isOverLimit && ' (over limit!)'}
                </div>
              </div>
            )}

            {/* Generate Draft in split view */}
            {splitView && (item.status === 'discovered' || item.status === 'analyzing') && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-surface-700 dark:text-surface-300">Generate Draft</p>
                {activeAccounts.length > 0 ? (
                  <>
                    <div className="relative">
                      <div className="flex">
                        <button
                          onClick={handleGenerate}
                          disabled={isGenerating || !selectedAccountId}
                          className="btn btn-primary text-sm flex-1 flex items-center justify-center gap-2 rounded-r-none"
                        >
                          {isGenerating ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                          Generate
                        </button>
                        <button
                          onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                          disabled={isGenerating}
                          className="btn btn-primary text-sm px-2 rounded-l-none border-l border-primary-500"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                      {showAccountDropdown && (
                        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg shadow-lg">
                          {activeAccounts.map((acc: RedditAccount) => (
                            <button
                              key={acc.id}
                              onClick={() => handleSelectAccount(acc.id)}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-50 dark:hover:bg-surface-700 first:rounded-t-lg last:rounded-b-lg ${
                                selectedAccountId === acc.id ? 'bg-primary-50 dark:bg-primary-900/30' : ''
                              }`}
                            >
                              <span className="font-medium">u/{acc.username}</span>
                              <span className="text-surface-500 dark:text-surface-400 ml-1">({acc.persona?.name})</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-surface-500 dark:text-surface-400">
                      Using: {selectedAccount?.username || 'None selected'}
                    </p>
                  </>
                ) : (
                  <button
                    onClick={() => onGenerate('', { length: genLength, style: genStyle, brandVoice, customInstructions })}
                    disabled={isGenerating}
                    className="btn btn-primary w-full text-sm flex items-center justify-center gap-2"
                  >
                    {isGenerating ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Generate Draft
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-3 border-t dark:border-surface-700">
        {(item.status === 'discovered' || item.status === 'analyzing') && (
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="btn btn-secondary py-2.5 flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isAnalyzing ? 'Analyzing...' : 'Analyze Post'}
          </button>
        )}

        {/* Prompt to generate draft when status suggests it but none exists */}
        {['draft_ready', 'in_review'].includes(item.status) && !item.draftResponse && !item.editedResponse && (
          <div className="space-y-2">
            <div className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <p className="font-medium">Ready to generate draft</p>
              <p className="text-xs mt-1">Create a response draft to engage with this post.</p>
            </div>
            <button
              onClick={() => onGenerate(selectedAccountId || '', { length: genLength, style: genStyle, brandVoice, customInstructions })}
              disabled={isGenerating}
              className="btn btn-primary w-full py-2.5 flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate Draft
            </button>
          </div>
        )}

        {['draft_ready', 'in_review'].includes(item.status) && (item.draftResponse || item.editedResponse) && (
          <div className="space-y-2">
            {/* Regenerate option */}
            <button
              onClick={() => onGenerate(selectedAccountId || '', { length: genLength, style: genStyle, brandVoice, customInstructions })}
              disabled={isGenerating}
              className="btn btn-secondary w-full py-2 flex items-center justify-center gap-2 text-sm"
            >
                {isGenerating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Regenerate Draft
              </button>
            {/* Approve/Reject buttons */}
            <div className="flex gap-2">
              <button
                onClick={onReject}
                disabled={isRejecting}
                className="btn btn-danger py-2.5 flex-1 flex items-center justify-center gap-1"
              >
                {isRejecting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                Reject
              </button>
              <button
                onClick={onApprove}
                disabled={isApproving}
                className="btn btn-success py-2.5 flex-1 flex items-center justify-center gap-1"
              >
                {isApproving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Approve
              </button>
            </div>
          </div>
        )}

        {item.status === 'approved' && (
          <div className="space-y-2">
            {activeAccounts.length === 0 && (
              <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                <p className="font-medium">Account required to publish</p>
                <p className="text-xs mt-1">Connect a Reddit account and assign a persona to publish this comment.</p>
              </div>
            )}
            <button
              onClick={onPublish}
              disabled={isPublishing || activeAccounts.length === 0}
              className="btn btn-primary py-3 w-full flex items-center justify-center gap-2 font-medium"
            >
              {isPublishing ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              {isPublishing ? 'Publishing...' : 'Publish to Reddit'}
            </button>
          </div>
        )}

        {item.status === 'published' && (
          <div className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
            <Check className="h-5 w-5 mx-auto mb-1" />
            <p className="font-medium">Published successfully</p>
            {item.commentScore !== null && item.commentScore !== undefined && (
              <p className="text-xs mt-1">Score: {item.commentScore} points</p>
            )}
          </div>
        )}

        {item.status === 'rejected' && (
          <div className="text-sm text-surface-500 dark:text-surface-400 bg-surface-50 dark:bg-surface-900 rounded-lg p-3 text-center">
            <X className="h-5 w-5 mx-auto mb-1" />
            <p>This item was rejected</p>
          </div>
        )}

        {item.status === 'failed' && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
            <X className="h-5 w-5 mx-auto mb-1" />
            <p className="font-medium">Publishing failed</p>
            <p className="text-xs mt-1">Check your account connection and try again</p>
          </div>
        )}
      </div>
    </div>
  );
}
