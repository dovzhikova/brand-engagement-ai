import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

interface Action {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  primary?: boolean; // Shorthand for variant: 'primary'
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: Action[];
  children?: ReactNode;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actions = [],
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 p-5 mb-4">
        <Icon className="h-8 w-8 text-primary-500 dark:text-primary-400" />
      </div>
      <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100 mb-1 tracking-tight">
        {title}
      </h3>
      <p className="text-sm text-surface-500 dark:text-surface-400 text-center max-w-sm mb-6">
        {description}
      </p>
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-3 justify-center">
          {actions.map((action, index) => {
            const isPrimary = action.primary || action.variant === 'primary';
            const className = isPrimary ? 'btn btn-primary' : 'btn btn-secondary';

            if (action.href) {
              return (
                <Link key={index} to={action.href} className={className}>
                  {action.label}
                </Link>
              );
            }

            return (
              <button key={index} onClick={action.onClick} className={className}>
                {action.label}
              </button>
            );
          })}
        </div>
      )}
      {children}
    </div>
  );
}
