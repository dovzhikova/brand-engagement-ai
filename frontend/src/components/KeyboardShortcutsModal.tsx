import { useEffect, useState } from 'react';
import { X, Keyboard } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface Shortcut {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: Shortcut[];
}

const globalShortcuts: ShortcutGroup = {
  title: 'Global',
  shortcuts: [
    { keys: ['?'], description: 'Show keyboard shortcuts' },
    { keys: ['g', 'h'], description: 'Go to Dashboard' },
    { keys: ['g', 'd'], description: 'Go to Discovery' },
    { keys: ['g', 'w'], description: 'Go to Workflow' },
    { keys: ['g', 'k'], description: 'Go to Keywords' },
  ],
};

const workflowShortcuts: ShortcutGroup = {
  title: 'Workflow',
  shortcuts: [
    { keys: ['j'], description: 'Next item' },
    { keys: ['k'], description: 'Previous item' },
    { keys: ['a'], description: 'Approve selected' },
    { keys: ['r'], description: 'Reject selected' },
    { keys: ['p'], description: 'Publish selected' },
    { keys: ['e'], description: 'Edit draft' },
    { keys: ['Esc'], description: 'Close panel' },
  ],
};

const discoveryShortcuts: ShortcutGroup = {
  title: 'Discovery',
  shortcuts: [
    { keys: ['Enter'], description: 'Start discovery' },
    { keys: ['Esc'], description: 'Clear selection' },
  ],
};

export default function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }

      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const getPageShortcuts = (): ShortcutGroup | null => {
    if (location.pathname === '/workflow') {
      return workflowShortcuts;
    }
    if (location.pathname === '/discovery') {
      return discoveryShortcuts;
    }
    return null;
  };

  const pageShortcuts = getPageShortcuts();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-25"
          onClick={() => setIsOpen(false)}
        />
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Keyboard className="h-5 w-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Keyboard Shortcuts
              </h2>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Global Shortcuts */}
            <ShortcutSection group={globalShortcuts} />

            {/* Page-specific shortcuts */}
            {pageShortcuts && <ShortcutSection group={pageShortcuts} />}
          </div>

          <div className="mt-6 pt-4 border-t dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Press <kbd className="kbd">?</kbd> anywhere to toggle this dialog
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShortcutSection({ group }: { group: ShortcutGroup }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        {group.title}
      </h3>
      <div className="space-y-2">
        {group.shortcuts.map((shortcut, index) => (
          <div
            key={index}
            className="flex items-center justify-between py-1.5"
          >
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {shortcut.description}
            </span>
            <div className="flex items-center gap-1">
              {shortcut.keys.map((key, keyIndex) => (
                <span key={keyIndex}>
                  <kbd className="kbd">{key}</kbd>
                  {keyIndex < shortcut.keys.length - 1 && (
                    <span className="text-gray-400 mx-1">+</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
