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
      <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4 mb-4">
        <Icon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
        {title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm mb-6">
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
