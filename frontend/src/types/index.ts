export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'reviewer';
  createdAt: string;
}

export interface Persona {
  id: string;
  name: string;
  description?: string;
  toneOfVoice: string;
  goals: string[];
  characterTraits: string[];
  backgroundStory?: string;
  expertiseAreas: string[];
  writingGuidelines?: string;
  exampleResponses: string[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    redditAccounts: number;
  };
}

export interface RedditAccount {
  id: string;
  username: string;
  redditUserId?: string;
  karma?: number;
  accountAgeDays?: number;
  status: 'active' | 'warming_up' | 'suspended' | 'disconnected';
  personaId?: string;
  persona?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Keyword {
  id: string;
  keyword: string;
  category?: 'core' | 'competitor' | 'broad' | 'brand';
  priority: number;
  searchVariants: string[];
  isActive: boolean;
  createdAt: string;
}

export interface Subreddit {
  id: string;
  name: string;
  phase: number;
  selfPromoRules?: string;
  minKarma: number;
  isActive: boolean;
  createdAt: string;
}

export type EngagementStatus =
  | 'discovered'
  | 'analyzing'
  | 'draft_ready'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'failed';

export interface EngagementItem {
  id: string;
  redditPostId: string;
  subreddit: string;
  postTitle: string;
  postContent?: string;
  postUrl: string;
  postAuthor?: string;
  postScore?: number;
  postCreatedAt?: string;
  matchedKeyword?: string;
  relevanceScore?: number;
  isRecommended?: boolean;
  aiAnalysis?: {
    relevance_score: number;
    opportunity_type: string;
    reasoning: string;
    recommended_approach: string;
    should_engage: boolean;
    cautions: string[];
  };
  draftResponse?: string;
  editedResponse?: string;
  assignedAccountId?: string;
  assignedAccount?: {
    id: string;
    username: string;
  };
  status: EngagementStatus;
  reviewerId?: string;
  reviewer?: {
    id: string;
    name: string;
  };
  reviewerNotes?: string;
  reviewedAt?: string;
  publishedAt?: string;
  redditCommentId?: string;
  commentScore?: number;
  replyCount?: number;
  lastMetricCheck?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiscoveryJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  discoveredCount: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// Comment generation customization types
export type CommentLength = 'concise' | 'standard' | 'detailed';
export type CommentStyle = 'casual' | 'professional' | 'technical' | 'friendly';

export interface GenerationOptions {
  length?: CommentLength;
  style?: CommentStyle;
  brandVoice?: string;
  customInstructions?: string;
}

export interface RefinementOptions {
  action: 'shorten' | 'expand' | 'restyle';
  targetLength?: CommentLength;
  targetStyle?: CommentStyle;
  customInstructions?: string;
}

// YouTube types
export type YouTubeChannelStatus =
  | 'discovered'
  | 'analyzing'
  | 'analyzed'
  | 'shortlisted'
  | 'contacted'
  | 'rejected';

export interface YouTubeChannel {
  id: string;
  channelId: string;
  name: string;
  description?: string;
  customUrl?: string;
  thumbnailUrl?: string;
  subscriberCount?: number;
  videoCount?: number;
  viewCount?: string; // BigInt as string
  avgViewsPerVideo?: number;
  engagementRate?: number;
  relevanceScore?: number;
  aiAnalysis?: {
    relevanceScore: number;
    category: string;
    reasoning: string;
    contentTopics: string[];
    audienceAlignment: string;
    collaborationPotential: string;
    cautions: string[];
  };
  roiScore?: number;
  roiFactors?: {
    audienceFit: number;
    engagementQuality: number;
    channelAuthority: number;
    growthPotential: number;
  };
  discoveredKeyword?: string;
  category?: string;
  notes?: string;
  status: YouTubeChannelStatus;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
  videos?: YouTubeVideo[];
  _count?: {
    videos: number;
  };
}

export interface YouTubeVideo {
  id: string;
  videoId: string;
  channelId: string;
  title: string;
  description?: string;
  publishedAt?: string;
  thumbnailUrl?: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  relevanceScore?: number;
  createdAt: string;
}

export interface YouTubeDiscoveryJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  keywords: string[];
  progress: number;
  channelsFound: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface YouTubeAnalytics {
  totalChannels: number;
  statusBreakdown: Record<string, number>;
  categoryBreakdown: Record<string, number>;
  averageScores: {
    roiScore: number;
    relevanceScore: number;
    engagementRate: number;
  };
  topByRoi: YouTubeChannel[];
  topByRelevance: YouTubeChannel[];
  recentlyDiscovered: YouTubeChannel[];
}
