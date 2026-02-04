import { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

interface InfoTooltipProps {
  content: string;
  className?: string;
  iconClassName?: string;
}

export default function InfoTooltip({
  content,
  className = '',
  iconClassName = 'h-4 w-4',
}: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('top');
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      setPosition(spaceAbove > spaceBelow ? 'top' : 'bottom');
    }
  }, [isVisible]);

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        aria-label="More information"
      >
        <HelpCircle className={iconClassName} />
      </button>
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 w-64 p-3 text-sm bg-gray-900 dark:bg-gray-700 text-white rounded-lg shadow-lg ${
            position === 'top'
              ? 'bottom-full mb-2 left-1/2 -translate-x-1/2'
              : 'top-full mt-2 left-1/2 -translate-x-1/2'
          }`}
          role="tooltip"
        >
          {content}
          <div
            className={`absolute left-1/2 -translate-x-1/2 border-8 border-transparent ${
              position === 'top'
                ? 'top-full border-t-gray-900 dark:border-t-gray-700'
                : 'bottom-full border-b-gray-900 dark:border-b-gray-700'
            }`}
          />
        </div>
      )}
    </div>
  );
}
