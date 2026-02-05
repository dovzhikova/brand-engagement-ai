/**
 * Design tokens for consistent styling across JavaScript/TypeScript components.
 * These values mirror the Tailwind configuration for use in JS contexts.
 */

// Color palette
export const COLORS = {
  primary: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },
  accent: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
  },
  surface: {
    50: '#fafaf9',
    100: '#f5f5f4',
    200: '#e7e5e4',
    300: '#d6d3d1',
    400: '#a8a29e',
    500: '#78716c',
    600: '#57534e',
    700: '#44403c',
    800: '#292524',
    900: '#1c1917',
  },
} as const;

// Status colors for workflow states
export const STATUS_COLORS = {
  discovered: {
    bg: 'bg-surface-100 dark:bg-surface-700',
    text: 'text-surface-600 dark:text-surface-300',
    border: 'border-surface-300 dark:border-surface-600',
    badge: 'badge-discovered',
  },
  analyzing: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-700',
    badge: 'badge-info',
  },
  draft_ready: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-800 dark:text-yellow-300',
    border: 'border-yellow-300 dark:border-yellow-700',
    badge: 'badge-draft',
  },
  in_review: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-800 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-700',
    badge: 'badge-review',
  },
  approved: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-800 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-700',
    badge: 'badge-approved',
  },
  published: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-800 dark:text-green-300',
    border: 'border-green-300 dark:border-green-700',
    badge: 'badge-published',
  },
  rejected: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-800 dark:text-red-300',
    border: 'border-red-300 dark:border-red-700',
    badge: 'badge-rejected',
  },
  failed: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-800 dark:text-red-300',
    border: 'border-red-300 dark:border-red-700',
    badge: 'badge-danger',
  },
} as const;

export type StatusKey = keyof typeof STATUS_COLORS;

// Animation durations in milliseconds
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 200,
  slow: 300,
  verySlow: 500,
} as const;

// Animation delay for staggered effects
export const STAGGER_DELAY = 50; // ms between each staggered item

// Z-index scale
export const Z_INDEX = {
  dropdown: 50,
  sticky: 100,
  modalBackdrop: 200,
  modal: 210,
  popover: 300,
  tooltip: 400,
  toast: 500,
} as const;

// Breakpoints (matching Tailwind's default breakpoints)
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// Helper to check if we're on mobile
export const isMobile = () =>
  typeof window !== 'undefined' && window.innerWidth < BREAKPOINTS.lg;

// Helper to check if we're on tablet
export const isTablet = () =>
  typeof window !== 'undefined' &&
  window.innerWidth >= BREAKPOINTS.sm &&
  window.innerWidth < BREAKPOINTS.lg;

// Helper to check if we're on desktop
export const isDesktop = () =>
  typeof window !== 'undefined' && window.innerWidth >= BREAKPOINTS.lg;

// Toast auto-dismiss durations
export const TOAST_DURATION = {
  short: 3000,
  normal: 5000,
  long: 8000,
} as const;

// Score thresholds for relevance/ROI scoring
export const SCORE_THRESHOLDS = {
  excellent: 8,
  good: 6,
  fair: 4,
  poor: 0,
} as const;

export const getScoreClass = (score: number | null | undefined) => {
  if (score === null || score === undefined) return 'text-surface-400';
  if (score >= SCORE_THRESHOLDS.excellent) return 'text-green-600 dark:text-green-400';
  if (score >= SCORE_THRESHOLDS.good) return 'text-blue-600 dark:text-blue-400';
  if (score >= SCORE_THRESHOLDS.fair) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

export const getScoreBadgeClass = (score: number | null | undefined) => {
  if (score === null || score === undefined) return 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400';
  if (score >= SCORE_THRESHOLDS.excellent) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  if (score >= SCORE_THRESHOLDS.good) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
  if (score >= SCORE_THRESHOLDS.fair) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
};

// Health score thresholds
export const HEALTH_THRESHOLDS = {
  excellent: 85,
  good: 70,
  fair: 50,
  poor: 30,
} as const;

export const getHealthColor = (score: number | null | undefined) => {
  if (score === null || score === undefined) return 'text-surface-400';
  if (score >= HEALTH_THRESHOLDS.excellent) return 'text-green-500';
  if (score >= HEALTH_THRESHOLDS.good) return 'text-green-400';
  if (score >= HEALTH_THRESHOLDS.fair) return 'text-yellow-500';
  if (score >= HEALTH_THRESHOLDS.poor) return 'text-orange-500';
  return 'text-red-500';
};

// Category colors for keywords
export const CATEGORY_COLORS = {
  core: 'badge-success',
  competitor: 'badge-danger',
  brand: 'badge-info',
  broad: 'badge-warning',
} as const;

export const getCategoryBadge = (category?: string) => {
  if (!category) return 'badge-gray';
  return CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || 'badge-gray';
};

// Priority labels
export const PRIORITY_LABELS = {
  1: 'High',
  2: 'Medium',
  3: 'Low',
} as const;

export const getPriorityLabel = (priority: number) =>
  PRIORITY_LABELS[priority as keyof typeof PRIORITY_LABELS] || 'Unknown';

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  // Navigation
  nextItem: ['j', 'ArrowDown'],
  prevItem: ['k', 'ArrowUp'],
  closePanel: ['Escape'],

  // Actions
  approve: ['a'],
  reject: ['r'],
  publish: ['p'],
  newItem: ['n'],
  search: ['/'],

  // View toggles
  toggleView: ['v'],
  togglePreview: ['e'],
} as const;

// Focus trap utilities
export const FOCUSABLE_ELEMENTS =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Common transition classes
export const TRANSITIONS = {
  default: 'transition-all duration-200 ease-smooth',
  fast: 'transition-all duration-150 ease-smooth',
  slow: 'transition-all duration-300 ease-smooth',
  colors: 'transition-colors duration-150',
  opacity: 'transition-opacity duration-200',
  transform: 'transition-transform duration-200',
} as const;

// Modal sizes
export const MODAL_SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  full: 'max-w-full mx-4',
} as const;

export type ModalSize = keyof typeof MODAL_SIZES;

// Format helpers
export const formatNumber = (num: number | undefined | null): string => {
  if (num === null || num === undefined) return '-';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

export const formatPercent = (num: number | undefined | null): string => {
  if (num === null || num === undefined) return '-';
  return `${(num * 100).toFixed(1)}%`;
};

export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatRelativeTime = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
};
