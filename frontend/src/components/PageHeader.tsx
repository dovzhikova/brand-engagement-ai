import { Link } from 'react-router-dom';
import { ReactNode } from 'react';
import { Home, ChevronRight } from 'lucide-react';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
  badge?: {
    label: string;
    variant?: 'success' | 'warning' | 'danger' | 'info' | 'gray';
  };
}

export default function PageHeader({
  title,
  description,
  breadcrumbs = [],
  actions,
  badge,
}: PageHeaderProps) {
  const getBadgeClass = (variant?: string) => {
    switch (variant) {
      case 'success':
        return 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20';
      case 'warning':
        return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20';
      case 'danger':
        return 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20';
      case 'info':
        return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20';
      default:
        return 'bg-surface-100 text-surface-700 ring-1 ring-inset ring-surface-500/20 dark:bg-surface-700 dark:text-surface-200 dark:ring-surface-500/20';
    }
  };

  return (
    <div className="mb-6">
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-xs text-surface-500 dark:text-surface-400 mb-2">
          <Link
            to="/"
            className="hover:text-surface-700 dark:hover:text-surface-300 flex items-center"
          >
            <Home className="h-3.5 w-3.5" />
          </Link>
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3 text-surface-400" />
              {crumb.href ? (
                <Link
                  to={crumb.href}
                  className="hover:text-surface-700 dark:hover:text-surface-300"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-surface-900 dark:text-surface-200 font-medium">{crumb.label}</span>
              )}
            </div>
          ))}
        </nav>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white tracking-heading">
              {title}
            </h1>
            {badge && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeClass(badge.variant)}`}>
                {badge.label}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
