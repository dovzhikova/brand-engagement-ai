import { ReactNode, CSSProperties } from 'react';

interface SkeletonProps {
  className?: string;
  shimmer?: boolean;
  style?: CSSProperties;
}

// Base skeleton component
export function Skeleton({ className = '', shimmer = true, style }: SkeletonProps) {
  return (
    <div
      className={`${shimmer ? 'skeleton-shimmer' : 'skeleton'} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

// Text line skeleton
export function SkeletonText({
  lines = 1,
  className = '',
  lastLineWidth = '75%',
}: {
  lines?: number;
  className?: string;
  lastLineWidth?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4 rounded"
          style={i === lines - 1 && lines > 1 ? { width: lastLineWidth } : undefined}
        />
      ))}
    </div>
  );
}

// Avatar skeleton
export function SkeletonAvatar({
  size = 'md',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <Skeleton className={`rounded-full ${sizeClasses[size]} ${className}`} />
  );
}

// Card skeleton
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`card p-4 space-y-4 ${className}`} aria-hidden="true">
      <div className="flex items-center gap-3">
        <SkeletonAvatar size="md" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3 rounded" />
          <Skeleton className="h-3 w-1/4 rounded" />
        </div>
      </div>
      <SkeletonText lines={3} />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  );
}

// Table row skeleton
export function SkeletonTableRow({
  columns = 4,
  className = '',
}: {
  columns?: number;
  className?: string;
}) {
  return (
    <tr className={className} aria-hidden="true">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <Skeleton
            className="h-4 rounded"
            style={{ width: i === 0 ? '80%' : i === columns - 1 ? '50%' : '60%' }}
          />
        </td>
      ))}
    </tr>
  );
}

// Full table skeleton
export function SkeletonTable({
  rows = 5,
  columns = 4,
  className = '',
  showHeader = true,
}: {
  rows?: number;
  columns?: number;
  className?: string;
  showHeader?: boolean;
}) {
  return (
    <div className={`overflow-hidden ${className}`} aria-hidden="true">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        {showHeader && (
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-6 py-3">
                  <Skeleton className="h-3 w-20 rounded" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// List item skeleton
export function SkeletonListItem({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 p-4 ${className}`} aria-hidden="true">
      <Skeleton className="w-5 h-5 rounded" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3 rounded" />
        <Skeleton className="h-3 w-1/2 rounded" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}

// List skeleton
export function SkeletonList({
  items = 5,
  className = '',
  divided = true,
}: {
  items?: number;
  className?: string;
  divided?: boolean;
}) {
  return (
    <div
      className={`${divided ? 'divide-y divide-gray-200 dark:divide-gray-700' : 'space-y-2'} ${className}`}
      aria-hidden="true"
    >
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </div>
  );
}

// Stat card skeleton
export function SkeletonStatCard({ className = '' }: { className?: string }) {
  return (
    <div className={`card p-6 ${className}`} aria-hidden="true">
      <div className="flex items-center gap-4">
        <Skeleton className="w-12 h-12 rounded-lg" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-8 w-16 rounded" />
        </div>
      </div>
    </div>
  );
}

// Dashboard stats grid skeleton
export function SkeletonStatsGrid({
  count = 4,
  className = '',
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
}

// Chart skeleton
export function SkeletonChart({
  height = 256,
  className = '',
}: {
  height?: number;
  className?: string;
}) {
  return (
    <div
      className={`card p-6 ${className}`}
      style={{ height: height + 80 }}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-40 rounded" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <Skeleton className="w-full rounded" style={{ height }} />
    </div>
  );
}

// Kanban card skeleton
export function SkeletonKanbanCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 ${className}`}
      aria-hidden="true"
    >
      <div className="flex items-start gap-2">
        <Skeleton className="w-4 h-4 mt-1 rounded" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-full rounded" />
          <div className="flex gap-2">
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 w-12 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Kanban column skeleton
export function SkeletonKanbanColumn({
  cards = 3,
  className = '',
}: {
  cards?: number;
  className?: string;
}) {
  return (
    <div className={`flex-1 min-w-[280px] max-w-[320px] ${className}`} aria-hidden="true">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="w-3 h-3 rounded-full" />
        <Skeleton className="h-5 w-24 rounded" />
        <Skeleton className="h-4 w-6 rounded" />
      </div>
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2 space-y-2 min-h-[400px]">
        {Array.from({ length: cards }).map((_, i) => (
          <SkeletonKanbanCard key={i} />
        ))}
      </div>
    </div>
  );
}

// Full Kanban board skeleton
export function SkeletonKanbanBoard({
  columns = 5,
  cardsPerColumn = 3,
  className = '',
}: {
  columns?: number;
  cardsPerColumn?: number;
  className?: string;
}) {
  return (
    <div className={`flex gap-4 overflow-x-auto pb-4 ${className}`} aria-hidden="true">
      {Array.from({ length: columns }).map((_, i) => (
        <SkeletonKanbanColumn key={i} cards={Math.max(1, cardsPerColumn - i % 2)} />
      ))}
    </div>
  );
}

// Wrapper that shows skeleton or children
interface SkeletonWrapperProps {
  loading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
}

export function SkeletonWrapper({ loading, skeleton, children }: SkeletonWrapperProps) {
  return <>{loading ? skeleton : children}</>;
}
