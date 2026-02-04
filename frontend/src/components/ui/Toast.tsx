import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { Z_INDEX, TOAST_DURATION } from '../../constants/designTokens';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  variant: ToastVariant;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function ToastProvider({
  children,
  position = 'bottom-right',
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };

    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after duration
    const duration = toast.duration ?? TOAST_DURATION.normal;
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback(
    (message: string, title?: string) => {
      addToast({ variant: 'success', message, title });
    },
    [addToast]
  );

  const error = useCallback(
    (message: string, title?: string) => {
      addToast({ variant: 'error', message, title, duration: TOAST_DURATION.long });
    },
    [addToast]
  );

  const warning = useCallback(
    (message: string, title?: string) => {
      addToast({ variant: 'warning', message, title });
    },
    [addToast]
  );

  const info = useCallback(
    (message: string, title?: string) => {
      addToast({ variant: 'info', message, title });
    },
    [addToast]
  );

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, success, error, warning, info }}
    >
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            className={`fixed ${positionClasses[position]} flex flex-col gap-2 max-w-sm w-full pointer-events-none`}
            style={{ zIndex: Z_INDEX.toast }}
            aria-live="polite"
          >
            {toasts.map((toast) => (
              <ToastItem
                key={toast.id}
                toast={toast}
                onDismiss={() => removeToast(toast.id)}
              />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: () => void;
}

const variantConfig = {
  success: {
    icon: CheckCircle,
    className: 'toast-success',
  },
  error: {
    icon: AlertCircle,
    className: 'toast-error',
  },
  warning: {
    icon: AlertTriangle,
    className: 'toast-warning',
  },
  info: {
    icon: Info,
    className: 'toast-info',
  },
};

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const config = variantConfig[toast.variant];
  const IconComponent = config.icon;

  return (
    <div
      className={`
        toast pointer-events-auto
        ${config.className}
      `}
      role="alert"
    >
      <IconComponent className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="font-medium">{toast.title}</p>
        )}
        <p className={`text-sm ${toast.title ? 'opacity-90' : ''}`}>
          {toast.message}
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="flex-shrink-0 p-1 -m-1 rounded hover:bg-white/20 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// Standalone toast function for non-React contexts
let globalAddToast: ((toast: Omit<Toast, 'id'>) => void) | null = null;

export function setGlobalToast(addToast: typeof globalAddToast) {
  globalAddToast = addToast;
}

export const toast = {
  success: (message: string, title?: string) => {
    globalAddToast?.({ variant: 'success', message, title });
  },
  error: (message: string, title?: string) => {
    globalAddToast?.({ variant: 'error', message, title, duration: TOAST_DURATION.long });
  },
  warning: (message: string, title?: string) => {
    globalAddToast?.({ variant: 'warning', message, title });
  },
  info: (message: string, title?: string) => {
    globalAddToast?.({ variant: 'info', message, title });
  },
};
