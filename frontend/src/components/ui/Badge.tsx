import { ReactNode } from 'react';
import { STATUS_COLORS, type StatusKey } from '../../constants/designTokens';

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'gray'
  | 'purple';

type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: ReactNode;
  icon?: ReactNode;
  dot?: boolean;
  dotColor?: string;
  className?: string;
  removable?: boolean;
  onRemove?: () => void;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-surface-100 text-surface-700 ring-surface-500/20 dark:bg-surface-700 dark:text-surface-200 dark:ring-surface-500/20',
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  info: 'badge-info',
  gray: 'badge-gray',
  purple: 'badge-purple',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-xs px-2.5 py-0.5',
  lg: 'text-sm px-3 py-1',
};

export default function Badge({
  variant = 'default',
  size = 'md',
  children,
  icon,
  dot = false,
  dotColor,
  className = '',
  removable = false,
  onRemove,
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotColor || 'bg-current opacity-70'}`}
          aria-hidden="true"
        />
      )}
      {icon && <span className="flex-shrink-0" aria-hidden="true">{icon}</span>}
      {children}
      {removable && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 -mr-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors"
          aria-label="Remove"
        >
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </span>
  );
}

// Status Badge component that maps status to colors
interface StatusBadgeProps {
  status: StatusKey | string;
  size?: BadgeSize;
  className?: string;
}

export function StatusBadge({ status, size = 'md', className = '' }: StatusBadgeProps) {
  const statusKey = status as StatusKey;
  const colors = STATUS_COLORS[statusKey] || STATUS_COLORS.discovered;

  // Format status text
  const formatStatus = (s: string) =>
    s.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset
        ${colors.bg} ${colors.text}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {formatStatus(status)}
    </span>
  );
}

// Counter Badge (for notifications)
interface CounterBadgeProps {
  count: number;
  max?: number;
  variant?: 'default' | 'danger';
  className?: string;
}

export function CounterBadge({
  count,
  max = 99,
  variant = 'default',
  className = '',
}: CounterBadgeProps) {
  const displayCount = count > max ? `${max}+` : count.toString();

  const variantStyles = {
    default: 'bg-surface-500 text-white',
    danger: 'bg-red-500 text-white',
  };

  return (
    <span
      className={`
        inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5
        text-xs font-medium rounded-full
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {displayCount}
    </span>
  );
}

// Priority Badge
interface PriorityBadgeProps {
  priority: 1 | 2 | 3;
  size?: BadgeSize;
  showLabel?: boolean;
  className?: string;
}

export function PriorityBadge({
  priority,
  size = 'sm',
  showLabel = true,
  className = '',
}: PriorityBadgeProps) {
  const config = {
    1: { label: 'High', variant: 'danger' as BadgeVariant },
    2: { label: 'Medium', variant: 'warning' as BadgeVariant },
    3: { label: 'Low', variant: 'gray' as BadgeVariant },
  };

  const { label, variant } = config[priority];

  return (
    <Badge variant={variant} size={size} className={className}>
      {showLabel ? label : `P${priority}`}
    </Badge>
  );
}

// Score Badge
interface ScoreBadgeProps {
  score: number | null | undefined;
  max?: number;
  size?: BadgeSize;
  className?: string;
}

export function ScoreBadge({
  score,
  max = 10,
  size = 'sm',
  className = '',
}: ScoreBadgeProps) {
  if (score === null || score === undefined) {
    return (
      <Badge variant="gray" size={size} className={className}>
        —
      </Badge>
    );
  }

  const percentage = score / max;
  let variant: BadgeVariant = 'gray';
  if (percentage >= 0.8) variant = 'success';
  else if (percentage >= 0.6) variant = 'info';
  else if (percentage >= 0.4) variant = 'warning';
  else if (percentage > 0) variant = 'danger';

  return (
    <Badge variant={variant} size={size} className={className}>
      {score}/{max}
    </Badge>
  );
}

// Badge Group
interface BadgeGroupProps {
  children: ReactNode;
  className?: string;
}

export function BadgeGroup({ children, className = '' }: BadgeGroupProps) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {children}
    </div>
  );
}
