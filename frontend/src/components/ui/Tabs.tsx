import { ReactNode, useState, useRef, useEffect, KeyboardEvent } from 'react';

interface Tab {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fullWidth?: boolean;
}

export default function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  size = 'md',
  className = '',
  fullWidth = false,
}: TabsProps) {
  const tabsRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const sizeClasses = {
    sm: 'text-sm px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-5 py-2.5',
  };

  const variantClasses = {
    default: {
      container: 'flex gap-1 bg-surface-100 dark:bg-surface-800 p-1 rounded-lg',
      tab: 'rounded-md',
      active: 'bg-white dark:bg-surface-700 shadow-sm',
      inactive: 'hover:bg-surface-200 dark:hover:bg-surface-700',
    },
    pills: {
      container: 'flex gap-2',
      tab: 'rounded-full',
      active: 'bg-primary-600 text-white',
      inactive: 'bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700',
    },
    underline: {
      container: 'flex gap-1 border-b border-surface-200 dark:border-surface-700',
      tab: 'border-b-2 -mb-px',
      active: 'border-primary-500 text-primary-600 dark:text-primary-400',
      inactive: 'border-transparent text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300 hover:border-surface-300',
    },
  };

  const styles = variantClasses[variant];

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const enabledTabs = tabs.filter((t) => !t.disabled);
    const currentEnabledIndex = enabledTabs.findIndex(
      (t) => t.id === tabs[index].id
    );

    let newIndex = -1;

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        newIndex =
          currentEnabledIndex > 0
            ? currentEnabledIndex - 1
            : enabledTabs.length - 1;
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        newIndex =
          currentEnabledIndex < enabledTabs.length - 1
            ? currentEnabledIndex + 1
            : 0;
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = enabledTabs.length - 1;
        break;
      default:
        return;
    }

    if (newIndex >= 0) {
      const newTab = enabledTabs[newIndex];
      const tabIndex = tabs.findIndex((t) => t.id === newTab.id);
      setFocusedIndex(tabIndex);
      onChange(newTab.id);
    }
  };

  useEffect(() => {
    if (focusedIndex >= 0 && tabsRef.current) {
      const buttons = tabsRef.current.querySelectorAll('button');
      (buttons[focusedIndex] as HTMLButtonElement)?.focus();
    }
  }, [focusedIndex]);

  return (
    <div
      ref={tabsRef}
      role="tablist"
      aria-orientation="horizontal"
      className={`${styles.container} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`tabpanel-${tab.id}`}
          tabIndex={activeTab === tab.id ? 0 : -1}
          disabled={tab.disabled}
          onClick={() => onChange(tab.id)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          className={`
            ${sizeClasses[size]}
            ${styles.tab}
            ${activeTab === tab.id ? styles.active : styles.inactive}
            ${fullWidth ? 'flex-1' : ''}
            ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            font-medium transition-all duration-150
            focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
            flex items-center justify-center gap-2
          `}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={`
                text-xs px-1.5 py-0.5 rounded-full
                ${
                  activeTab === tab.id
                    ? variant === 'pills'
                      ? 'bg-white/20'
                      : 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'bg-surface-200 dark:bg-surface-700'
                }
              `}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// Tab Panel component
interface TabPanelProps {
  id: string;
  activeTab: string;
  children: ReactNode;
  className?: string;
}

export function TabPanel({ id, activeTab, children, className = '' }: TabPanelProps) {
  if (activeTab !== id) return null;

  return (
    <div
      id={`tabpanel-${id}`}
      role="tabpanel"
      aria-labelledby={id}
      tabIndex={0}
      className={`animate-fade-in ${className}`}
    >
      {children}
    </div>
  );
}

// Controlled tabs hook
export function useTabs(defaultTab: string) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return {
    activeTab,
    setActiveTab,
    tabProps: {
      activeTab,
      onChange: setActiveTab,
    },
  };
}
