import { ReactNode } from 'react';
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  LucideIcon,
} from 'lucide-react';

type AlertVariant = 'success' | 'warning' | 'error' | 'info';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  icon?: LucideIcon | null;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
  actions?: ReactNode;
}

const variantConfig: Record<
  AlertVariant,
  { className: string; icon: LucideIcon }
> = {
  success: {
    className: 'alert-success',
    icon: CheckCircle,
  },
  warning: {
    className: 'alert-warning',
    icon: AlertTriangle,
  },
  error: {
    className: 'alert-error',
    icon: AlertCircle,
  },
  info: {
    className: 'alert-info',
    icon: Info,
  },
};

export default function Alert({
  variant = 'info',
  title,
  children,
  icon,
  dismissible = false,
  onDismiss,
  className = '',
  actions,
}: AlertProps) {
  const config = variantConfig[variant];
  const IconComponent = icon === null ? null : icon || config.icon;

  return (
    <div
      className={`alert ${config.className} ${className}`}
      role="alert"
    >
      {IconComponent && <IconComponent className="alert-icon" aria-hidden="true" />}
      <div className="alert-content flex-1">
        {title && <p className="alert-title">{title}</p>}
        <div className="alert-description">{children}</div>
        {actions && <div className="mt-3 flex gap-2">{actions}</div>}
      </div>
      {dismissible && onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="flex-shrink-0 p-1 -m-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// Inline alert for form errors
export function InlineAlert({
  variant = 'error',
  children,
  className = '',
}: {
  variant?: AlertVariant;
  children: ReactNode;
  className?: string;
}) {
  const config = variantConfig[variant];
  const IconComponent = config.icon;

  return (
    <div
      className={`flex items-center gap-2 text-sm ${
        variant === 'error' ? 'text-red-600 dark:text-red-400' :
        variant === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
        variant === 'success' ? 'text-green-600 dark:text-green-400' :
        'text-blue-600 dark:text-blue-400'
      } ${className}`}
      role="alert"
    >
      <IconComponent className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

// Banner alert for page-level messages
export function BannerAlert({
  variant = 'info',
  title,
  children,
  dismissible = false,
  onDismiss,
  className = '',
  actions,
}: AlertProps) {
  const bgClasses = {
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  };

  const textClasses = {
    success: 'text-green-800 dark:text-green-200',
    warning: 'text-yellow-800 dark:text-yellow-200',
    error: 'text-red-800 dark:text-red-200',
    info: 'text-blue-800 dark:text-blue-200',
  };

  const config = variantConfig[variant];
  const IconComponent = config.icon;

  return (
    <div
      className={`rounded-lg border p-4 ${bgClasses[variant]} ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <IconComponent
          className={`h-5 w-5 flex-shrink-0 ${textClasses[variant]}`}
          aria-hidden="true"
        />
        <div className="flex-1">
          {title && (
            <h3 className={`font-medium ${textClasses[variant]}`}>{title}</h3>
          )}
          <div className={`text-sm ${textClasses[variant]} ${title ? 'mt-1' : ''}`}>
            {children}
          </div>
          {actions && <div className="mt-3 flex gap-2">{actions}</div>}
        </div>
        {dismissible && onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className={`flex-shrink-0 p-1 -m-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${textClasses[variant]}`}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
