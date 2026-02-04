/**
 * CSV Export Utility
 * Converts data arrays to CSV format and triggers download
 */

type DataRow = Record<string, unknown>;

interface ExportOptions {
  filename: string;
  headers?: Record<string, string>; // Map of field names to display headers
  fields?: string[]; // Specific fields to include (in order)
}

/**
 * Escapes a value for CSV format
 */
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  let stringValue: string;

  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      stringValue = value.join('; ');
    } else {
      stringValue = JSON.stringify(value);
    }
  } else {
    stringValue = String(value);
  }

  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Converts an array of objects to CSV string
 */
function arrayToCSV(data: DataRow[], options: ExportOptions): string {
  if (data.length === 0) {
    return '';
  }

  // Determine fields to export
  const fields = options.fields || Object.keys(data[0]);

  // Create header row
  const headerRow = fields.map(field => {
    const header = options.headers?.[field] || field;
    return escapeCSVValue(header);
  }).join(',');

  // Create data rows
  const dataRows = data.map(row => {
    return fields.map(field => escapeCSVValue(row[field])).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Triggers a CSV file download
 */
function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data to CSV file
 */
export function exportToCSV<T extends DataRow>(
  data: T[],
  options: ExportOptions
): void {
  const csvContent = arrayToCSV(data, options);
  downloadCSV(csvContent, options.filename);
}

// Pre-configured export functions for common data types

export function exportKeywords(keywords: DataRow[]): void {
  exportToCSV(keywords, {
    filename: `keywords-${new Date().toISOString().split('T')[0]}`,
    fields: ['keyword', 'category', 'priority', 'searchVariants', 'isActive', 'createdAt'],
    headers: {
      keyword: 'Keyword',
      category: 'Category',
      priority: 'Priority',
      searchVariants: 'Search Variants',
      isActive: 'Active',
      createdAt: 'Created At',
    },
  });
}

export function exportSubreddits(subreddits: DataRow[]): void {
  exportToCSV(subreddits, {
    filename: `subreddits-${new Date().toISOString().split('T')[0]}`,
    fields: ['name', 'phase', 'minKarma', 'selfPromoRules', 'isActive', 'createdAt'],
    headers: {
      name: 'Subreddit',
      phase: 'Phase',
      minKarma: 'Min Karma',
      selfPromoRules: 'Self-Promo Rules',
      isActive: 'Active',
      createdAt: 'Created At',
    },
  });
}

export function exportYouTubeChannels(channels: DataRow[]): void {
  // Flatten the data for export
  const flattenedData = channels.map(channel => ({
    name: channel.name,
    channelId: channel.channelId,
    customUrl: channel.customUrl,
    subscriberCount: channel.subscriberCount,
    videoCount: channel.videoCount,
    avgViewsPerVideo: channel.avgViewsPerVideo,
    engagementRate: channel.engagementRate,
    relevanceScore: channel.relevanceScore,
    roiScore: channel.roiScore,
    category: channel.category,
    status: channel.status,
    discoveredKeyword: channel.discoveredKeyword,
    audienceAlignment: (channel.aiAnalysis as Record<string, unknown>)?.audienceAlignment || '',
    collaborationPotential: (channel.aiAnalysis as Record<string, unknown>)?.collaborationPotential || '',
    notes: channel.notes,
    createdAt: channel.createdAt,
  }));

  exportToCSV(flattenedData, {
    filename: `youtube-channels-${new Date().toISOString().split('T')[0]}`,
    fields: [
      'name', 'channelId', 'customUrl', 'subscriberCount', 'videoCount',
      'avgViewsPerVideo', 'engagementRate', 'relevanceScore', 'roiScore',
      'category', 'status', 'discoveredKeyword', 'audienceAlignment',
      'collaborationPotential', 'notes', 'createdAt'
    ],
    headers: {
      name: 'Channel Name',
      channelId: 'Channel ID',
      customUrl: 'Custom URL',
      subscriberCount: 'Subscribers',
      videoCount: 'Videos',
      avgViewsPerVideo: 'Avg Views/Video',
      engagementRate: 'Engagement Rate',
      relevanceScore: 'Relevance Score',
      roiScore: 'ROI Score',
      category: 'Category',
      status: 'Status',
      discoveredKeyword: 'Discovered Via',
      audienceAlignment: 'Audience Alignment',
      collaborationPotential: 'Collaboration Potential',
      notes: 'Notes',
      createdAt: 'Discovered At',
    },
  });
}

export function exportEngagementItems(items: DataRow[]): void {
  // Flatten the data for export
  const flattenedData = items.map(item => ({
    postTitle: item.postTitle,
    subreddit: item.subreddit,
    postUrl: item.postUrl,
    postAuthor: item.postAuthor,
    postScore: item.postScore,
    matchedKeyword: item.matchedKeyword,
    relevanceScore: item.relevanceScore,
    status: item.status,
    assignedAccount: (item.assignedAccount as Record<string, unknown>)?.username || '',
    draftResponse: item.draftResponse,
    editedResponse: item.editedResponse,
    commentScore: item.commentScore,
    replyCount: item.replyCount,
    publishedAt: item.publishedAt,
    createdAt: item.createdAt,
  }));

  exportToCSV(flattenedData, {
    filename: `engagement-items-${new Date().toISOString().split('T')[0]}`,
    fields: [
      'postTitle', 'subreddit', 'postUrl', 'postAuthor', 'postScore',
      'matchedKeyword', 'relevanceScore', 'status', 'assignedAccount',
      'draftResponse', 'editedResponse', 'commentScore', 'replyCount',
      'publishedAt', 'createdAt'
    ],
    headers: {
      postTitle: 'Post Title',
      subreddit: 'Subreddit',
      postUrl: 'Post URL',
      postAuthor: 'Author',
      postScore: 'Post Score',
      matchedKeyword: 'Matched Keyword',
      relevanceScore: 'Relevance Score',
      status: 'Status',
      assignedAccount: 'Assigned Account',
      draftResponse: 'Draft Response',
      editedResponse: 'Edited Response',
      commentScore: 'Comment Score',
      replyCount: 'Reply Count',
      publishedAt: 'Published At',
      createdAt: 'Discovered At',
    },
  });
}

export function exportRedditAccounts(accounts: DataRow[]): void {
  const flattenedData = accounts.map(account => ({
    username: account.username,
    karma: account.karma,
    accountAgeDays: account.accountAgeDays,
    status: account.status,
    persona: (account.persona as Record<string, unknown>)?.name || '',
    createdAt: account.createdAt,
  }));

  exportToCSV(flattenedData, {
    filename: `reddit-accounts-${new Date().toISOString().split('T')[0]}`,
    fields: ['username', 'karma', 'accountAgeDays', 'status', 'persona', 'createdAt'],
    headers: {
      username: 'Username',
      karma: 'Karma',
      accountAgeDays: 'Account Age (days)',
      status: 'Status',
      persona: 'Persona',
      createdAt: 'Added At',
    },
  });
}
