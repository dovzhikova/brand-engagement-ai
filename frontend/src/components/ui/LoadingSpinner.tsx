import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
  center?: boolean;
  fullPage?: boolean;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

export default function LoadingSpinner({
  size = 'md',
  className = '',
  label,
  center = false,
  fullPage = false,
}: LoadingSpinnerProps) {
  const spinner = (
    <div
      className={`flex items-center justify-center gap-3 ${className}`}
      role="status"
      aria-label={label || 'Loading'}
    >
      <Loader2
        className={`${sizeClasses[size]} animate-spin text-brand-600 dark:text-brand-400`}
      />
      {label && (
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      )}
      <span className="sr-only">{label || 'Loading...'}</span>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 z-50">
        {spinner}
      </div>
    );
  }

  if (center) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        {spinner}
      </div>
    );
  }

  return spinner;
}

// Inline spinner for buttons
export function ButtonSpinner({ className = '' }: { className?: string }) {
  return (
    <Loader2
      className={`h-4 w-4 animate-spin ${className}`}
      aria-hidden="true"
    />
  );
}

// Page loading state
export function PageLoading({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-brand-600 dark:text-brand-400" />
      <p className="text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}

// Card loading state
export function CardLoading({ className = '' }: { className?: string }) {
  return (
    <div className={`card p-8 flex items-center justify-center ${className}`}>
      <LoadingSpinner size="lg" />
    </div>
  );
}
