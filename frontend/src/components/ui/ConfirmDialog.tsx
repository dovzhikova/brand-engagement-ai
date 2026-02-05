import { ReactNode, useRef } from 'react';
import { AlertTriangle, Info, AlertCircle, HelpCircle } from 'lucide-react';
import Modal, { ModalActions } from './Modal';
import { ButtonSpinner } from './LoadingSpinner';

type ConfirmVariant = 'danger' | 'warning' | 'info' | 'default';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: ReactNode;
  message?: ReactNode; // Alias for description
  confirmText?: string;
  confirmLabel?: string; // Alias for confirmText
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
  children?: ReactNode;
}

const variantConfig: Record<
  ConfirmVariant,
  {
    icon: typeof AlertTriangle;
    iconBg: string;
    iconColor: string;
    confirmClass: string;
  }
> = {
  danger: {
    icon: AlertTriangle,
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    confirmClass: 'btn-danger',
  },
  warning: {
    icon: AlertCircle,
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    confirmClass: 'btn-primary',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    confirmClass: 'btn-primary',
  },
  default: {
    icon: HelpCircle,
    iconBg: 'bg-surface-100 dark:bg-surface-700',
    iconColor: 'text-surface-600 dark:text-surface-400',
    confirmClass: 'btn-primary',
  },
};

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  message,
  confirmText,
  confirmLabel,
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false,
  children,
}: ConfirmDialogProps) {
  const displayDescription = description || message;
  const displayConfirmText = confirmText || confirmLabel || 'Confirm';
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const config = variantConfig[variant];
  const IconComponent = config.icon;

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
      initialFocus={cancelButtonRef}
    >
      <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-4">
        <div
          className={`flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full ${config.iconBg}`}
        >
          <IconComponent
            className={`h-6 w-6 ${config.iconColor}`}
            aria-hidden="true"
          />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
            {title}
          </h3>
          {displayDescription && (
            <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">
              {displayDescription}
            </p>
          )}
          {children && <div className="mt-4">{children}</div>}
        </div>
      </div>
      <ModalActions className="mt-6 sm:mt-4 flex-col-reverse sm:flex-row">
        <button
          ref={cancelButtonRef}
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="btn btn-secondary w-full sm:w-auto"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isLoading}
          className={`btn ${config.confirmClass} w-full sm:w-auto flex items-center justify-center gap-2`}
        >
          {isLoading && <ButtonSpinner />}
          {displayConfirmText}
        </button>
      </ModalActions>
    </Modal>
  );
}

// Hook for easy confirm dialog usage
import { useState, useCallback } from 'react';

interface UseConfirmDialogOptions {
  title: string;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<{
    options: UseConfirmDialogOptions | null;
    onConfirm: (() => void | Promise<void>) | null;
  }>({
    options: null,
    onConfirm: null,
  });

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const confirm = useCallback(
    (options: UseConfirmDialogOptions, onConfirm: () => void | Promise<void>) => {
      setState({
        options,
        onConfirm,
      });
      setIsOpen(true);
    },
    []
  );

  const handleConfirm = useCallback(async () => {
    if (state.onConfirm) {
      await state.onConfirm();
    }
    close();
  }, [state.onConfirm, close]);

  const ConfirmDialogComponent = state.options ? (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={close}
      onConfirm={handleConfirm}
      title={state.options.title}
      description={state.options.description}
      confirmText={state.options.confirmText}
      cancelText={state.options.cancelText}
      variant={state.options.variant}
    />
  ) : null;

  return {
    isOpen,
    open,
    close,
    confirm,
    ConfirmDialog: ConfirmDialogComponent,
  };
}

// Simple confirmation function that returns a promise
export function createConfirm(
  showDialog: (
    options: UseConfirmDialogOptions,
    onConfirm: () => void
  ) => void
) {
  return (options: UseConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      showDialog(options, () => resolve(true));
    });
  };
}
