import { forwardRef, InputHTMLAttributes } from 'react';
import { Clock } from 'lucide-react';

interface TimePickerProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value: string; // HH:MM format
  onChange: (time: string) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  showIcon?: boolean;
}

/**
 * Time picker input component
 * Uses native HTML time input with custom styling
 */
const TimePicker = forwardRef<HTMLInputElement, TimePickerProps>(
  (
    {
      value,
      onChange,
      label,
      error,
      disabled = false,
      showIcon = true,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    return (
      <div className={`relative ${className}`}>
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {showIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Clock className="h-4 w-4 text-gray-400" />
            </div>
          )}
          <input
            ref={ref}
            id={id}
            type="time"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={`
              block w-full rounded-md shadow-sm
              text-sm text-gray-900 dark:text-gray-100
              bg-white dark:bg-gray-800
              border-gray-300 dark:border-gray-600
              focus:ring-carol-500 focus:border-carol-500
              dark:focus:ring-carol-400 dark:focus:border-carol-400
              disabled:opacity-50 disabled:cursor-not-allowed
              ${showIcon ? 'pl-9' : 'pl-3'} pr-3 py-2
              ${error ? 'border-red-500 dark:border-red-400' : 'border'}
            `}
            aria-invalid={!!error}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

TimePicker.displayName = 'TimePicker';

export default TimePicker;

/**
 * Inline time picker for use within toggle rows
 * Compact styling for use alongside toggles
 */
interface InlineTimePickerProps {
  value: string;
  onChange: (time: string) => void;
  disabled?: boolean;
  className?: string;
}

export function InlineTimePicker({
  value,
  onChange,
  disabled = false,
  className = '',
}: InlineTimePickerProps) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`
        px-2 py-1 text-sm rounded-md
        text-gray-700 dark:text-gray-300
        bg-gray-100 dark:bg-gray-700
        border border-gray-200 dark:border-gray-600
        focus:ring-2 focus:ring-carol-500 focus:border-carol-500
        dark:focus:ring-carol-400 dark:focus:border-carol-400
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors
        ${className}
      `}
    />
  );
}

/**
 * Format time string (HH:MM) to 12-hour format with AM/PM
 */
export function formatTime12Hour(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Parse 12-hour format back to HH:MM
 */
export function parseTime12Hour(time: string): string {
  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return '12:00';

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3].toUpperCase();

  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}
