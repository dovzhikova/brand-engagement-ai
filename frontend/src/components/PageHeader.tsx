import { Link } from 'react-router-dom';
import { ReactNode } from 'react';

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
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'warning':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      case 'danger':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300';
      case 'info':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200';
    }
  };

  return (
    <div className="mb-6">
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
          <Link
            to="/"
            className="hover:text-slate-700 dark:hover:text-slate-300 flex items-center"
          >
            <span className="material-icons-round text-[14px]">home</span>
          </Link>
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="material-icons-round text-[14px]">chevron_right</span>
              {crumb.href ? (
                <Link
                  to={crumb.href}
                  className="hover:text-slate-700 dark:hover:text-slate-300"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-slate-900 dark:text-slate-200 font-medium">{crumb.label}</span>
              )}
            </div>
          ))}
        </nav>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {title}
            </h1>
            {badge && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeClass(badge.variant)}`}>
                {badge.label}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
