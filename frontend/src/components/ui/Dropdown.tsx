import {
  useState,
  useRef,
  useEffect,
  ReactNode,
  KeyboardEvent,
} from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Z_INDEX } from '../../constants/designTokens';

interface DropdownItem {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  destructive?: boolean;
  description?: string;
}

interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  onSelect: (id: string) => void;
  selectedId?: string;
  align?: 'left' | 'right';
  width?: 'auto' | 'trigger' | number;
  className?: string;
  disabled?: boolean;
}

export default function Dropdown({
  trigger,
  items,
  onSelect,
  selectedId,
  align = 'left',
  width = 'auto',
  className = '',
  disabled = false,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus management
  useEffect(() => {
    if (isOpen && menuRef.current && focusedIndex >= 0) {
      const buttons = menuRef.current.querySelectorAll('[role="menuitem"]');
      (buttons[focusedIndex] as HTMLElement)?.focus();
    }
  }, [isOpen, focusedIndex]);

  const handleKeyDown = (e: KeyboardEvent) => {
    const enabledItems = items.filter((item) => !item.disabled);

    switch (e.key) {
      case 'Enter':
      case ' ':
        if (!isOpen) {
          e.preventDefault();
          setIsOpen(true);
          setFocusedIndex(0);
        } else if (focusedIndex >= 0) {
          e.preventDefault();
          const focusedItem = enabledItems[focusedIndex];
          if (focusedItem) {
            onSelect(focusedItem.id);
            setIsOpen(false);
            setFocusedIndex(-1);
          }
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
        } else {
          setFocusedIndex((prev) =>
            prev < enabledItems.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setFocusedIndex((prev) =>
            prev > 0 ? prev - 1 : enabledItems.length - 1
          );
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
      case 'Tab':
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
    }
  };

  const handleItemClick = (item: DropdownItem) => {
    if (item.disabled) return;
    onSelect(item.id);
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  const widthStyle =
    typeof width === 'number'
      ? { width: `${width}px` }
      : width === 'trigger'
      ? { minWidth: containerRef.current?.offsetWidth }
      : {};

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className}`}
      onKeyDown={handleKeyDown}
    >
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className={disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      >
        {trigger}
      </div>

      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-orientation="vertical"
          className={`
            absolute mt-1 py-1
            bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700
            rounded-lg shadow-elevated
            animate-scale-in origin-top
            ${align === 'right' ? 'right-0' : 'left-0'}
          `}
          style={{ zIndex: Z_INDEX.dropdown, ...widthStyle }}
        >
          {items.map((item) => (
            <button
              key={item.id}
              role="menuitem"
              disabled={item.disabled}
              onClick={() => handleItemClick(item)}
              className={`
                w-full text-left px-3 py-2 text-sm
                flex items-center gap-2
                transition-colors duration-100
                focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700
                ${
                  item.disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : item.destructive
                    ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
                ${selectedId === item.id ? 'bg-brand-50 dark:bg-brand-900/20' : ''}
              `}
            >
              {item.icon && (
                <span className="flex-shrink-0 w-4 h-4">{item.icon}</span>
              )}
              <div className="flex-1 min-w-0">
                <span className="block truncate">{item.label}</span>
                {item.description && (
                  <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                    {item.description}
                  </span>
                )}
              </div>
              {selectedId === item.id && (
                <Check className="h-4 w-4 text-brand-600 dark:text-brand-400 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Button with dropdown
interface DropdownButtonProps {
  children: ReactNode;
  items: DropdownItem[];
  onSelect: (id: string) => void;
  selectedId?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'right';
  className?: string;
  disabled?: boolean;
}

export function DropdownButton({
  children,
  items,
  onSelect,
  selectedId,
  variant = 'secondary',
  size = 'md',
  align = 'left',
  className = '',
  disabled = false,
}: DropdownButtonProps) {
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
  };

  const sizeClasses = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
  };

  return (
    <Dropdown
      trigger={
        <button
          type="button"
          disabled={disabled}
          className={`btn ${variantClasses[variant]} ${sizeClasses[size]} flex items-center gap-2 ${className}`}
        >
          {children}
          <ChevronDown className="h-4 w-4" />
        </button>
      }
      items={items}
      onSelect={onSelect}
      selectedId={selectedId}
      align={align}
      disabled={disabled}
    />
  );
}

// Split button with dropdown
interface SplitButtonProps {
  children: ReactNode;
  onClick: () => void;
  items: DropdownItem[];
  onSelect: (id: string) => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function SplitButton({
  children,
  onClick,
  items,
  onSelect,
  variant = 'primary',
  disabled = false,
  loading = false,
  className = '',
}: SplitButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const buttonClasses =
    variant === 'primary'
      ? 'bg-brand-600 text-white hover:bg-brand-700'
      : 'bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600';

  return (
    <div ref={containerRef} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || loading}
        className={`btn ${buttonClasses} rounded-r-none flex items-center gap-2`}
      >
        {children}
      </button>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`btn ${buttonClasses} rounded-l-none border-l border-white/20 px-2`}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <ChevronDown className="h-4 w-4" />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-1 top-full py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-elevated animate-scale-in origin-top-right"
          style={{ zIndex: Z_INDEX.dropdown }}
        >
          {items.map((item) => (
            <button
              key={item.id}
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                onSelect(item.id);
                setIsOpen(false);
              }}
              className={`
                w-full text-left px-3 py-2 text-sm flex items-center gap-2
                ${
                  item.disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }
                ${item.destructive ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}
              `}
            >
              {item.icon && <span className="w-4 h-4">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
