import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
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
        return 'badge-success';
      case 'warning':
        return 'badge-warning';
      case 'danger':
        return 'badge-danger';
      case 'info':
        return 'badge-info';
      default:
        return 'badge-gray';
    }
  };

  return (
    <div className="mb-6">
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-2">
          <Link
            to="/"
            className="hover:text-gray-700 dark:hover:text-gray-300 flex items-center"
          >
            <Home className="h-4 w-4" />
          </Link>
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-1">
              <ChevronRight className="h-4 w-4" />
              {crumb.href ? (
                <Link
                  to={crumb.href}
                  className="hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-gray-700 dark:text-gray-300">{crumb.label}</span>
              )}
            </div>
          ))}
        </nav>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {title}
            </h1>
            {badge && (
              <span className={`badge ${getBadgeClass(badge.variant)}`}>
                {badge.label}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-1 text-gray-600 dark:text-gray-400">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
