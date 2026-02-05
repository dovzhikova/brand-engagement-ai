import { forwardRef } from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  id?: string;
  name?: string;
}

const sizeConfig = {
  sm: {
    track: 'h-5 w-9',
    thumb: 'h-4 w-4',
    translate: 'translate-x-4',
  },
  md: {
    track: 'h-6 w-11',
    thumb: 'h-5 w-5',
    translate: 'translate-x-5',
  },
  lg: {
    track: 'h-7 w-14',
    thumb: 'h-6 w-6',
    translate: 'translate-x-7',
  },
};

const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  (
    {
      checked,
      onChange,
      label,
      description,
      disabled = false,
      size = 'md',
      className = '',
      id,
      name,
    },
    ref
  ) => {
    const sizes = sizeConfig[size];

    const toggle = (
      <button
        ref={ref}
        type="button"
        role="switch"
        id={id}
        name={name}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex flex-shrink-0 cursor-pointer rounded-full
          border-2 border-transparent transition-colors duration-200 ease-in-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2
          dark:focus-visible:ring-offset-gray-900
          ${sizes.track}
          ${checked ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-700'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
      >
        <span className="sr-only">{label || 'Toggle'}</span>
        <span
          aria-hidden="true"
          className={`
            pointer-events-none inline-block rounded-full bg-white shadow ring-0
            transition duration-200 ease-in-out
            ${sizes.thumb}
            ${checked ? sizes.translate : 'translate-x-0'}
          `}
        />
      </button>
    );

    if (!label && !description) {
      return toggle;
    }

    return (
      <div className="flex items-start gap-3">
        {toggle}
        <div className="flex-1">
          {label && (
            <label
              htmlFor={id}
              className={`text-sm font-medium text-gray-700 dark:text-gray-300 ${
                disabled ? '' : 'cursor-pointer'
              }`}
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Toggle.displayName = 'Toggle';

export default Toggle;

// Toggle Group for multiple toggles
interface ToggleOption {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface ToggleGroupProps {
  options: ToggleOption[];
  values: Record<string, boolean>;
  onChange: (id: string, checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function ToggleGroup({
  options,
  values,
  onChange,
  disabled = false,
  className = '',
}: ToggleGroupProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {options.map((option) => (
        <Toggle
          key={option.id}
          id={option.id}
          checked={values[option.id] ?? false}
          onChange={(checked) => onChange(option.id, checked)}
          label={option.label}
          description={option.description}
          disabled={disabled || option.disabled}
        />
      ))}
    </div>
  );
}

// Simple on/off switch with labels
interface SwitchWithLabelsProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  offLabel: string;
  onLabel: string;
  disabled?: boolean;
  className?: string;
}

export function SwitchWithLabels({
  checked,
  onChange,
  offLabel,
  onLabel,
  disabled = false,
  className = '',
}: SwitchWithLabelsProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span
        className={`text-sm ${
          !checked
            ? 'font-medium text-gray-900 dark:text-gray-100'
            : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        {offLabel}
      </span>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} size="sm" />
      <span
        className={`text-sm ${
          checked
            ? 'font-medium text-gray-900 dark:text-gray-100'
            : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        {onLabel}
      </span>
    </div>
  );
}
