import { useState, useRef, useEffect } from 'react';
import { useOrganizationStore } from '../hooks/useOrganizationStore';
import { useNavigate } from 'react-router-dom';

interface OrganizationSwitcherProps {
  collapsed?: boolean;
}

export default function OrganizationSwitcher({ collapsed = false }: OrganizationSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { currentOrganization, organizations, switchOrganization } = useOrganizationStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const handleSwitchOrg = (orgId: string) => {
    switchOrganization(orgId);
    setIsOpen(false);
    // Refresh the page to reload data with new org context
    window.location.reload();
  };

  const handleManageOrgs = () => {
    setIsOpen(false);
    navigate('/settings?tab=organizations');
  };

  if (!currentOrganization) {
    return null;
  }

  if (collapsed) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-2 flex justify-center items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title={currentOrganization.name}
          aria-label={`Current organization: ${currentOrganization.name}. Click to switch.`}
          aria-expanded={isOpen}
        >
          <span className="material-icons-round text-[20px] text-slate-600 dark:text-slate-400">
            apartment
          </span>
        </button>

        {isOpen && (
          <div className="absolute left-full top-0 ml-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50">
            <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Switch Organization
              </p>
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleSwitchOrg(org.id)}
                  className="w-full px-3 py-2 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-left"
                >
                  <span className="material-icons-round text-[18px] text-slate-400 flex-shrink-0">
                    apartment
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {org.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                      {org.role.toLowerCase()}
                    </p>
                  </div>
                  {org.id === currentOrganization.id && (
                    <span className="material-icons-round text-[18px] text-brand-600 dark:text-brand-400 flex-shrink-0">
                      check
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700 py-1">
              <button
                onClick={handleManageOrgs}
                className="w-full px-3 py-2 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-left"
              >
                <span className="material-icons-round text-[18px] text-slate-400">settings</span>
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Manage Organizations
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center gap-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
        aria-label={`Current organization: ${currentOrganization.name}. Click to switch.`}
        aria-expanded={isOpen}
      >
        <span className="material-icons-round text-[20px] text-slate-600 dark:text-slate-400 flex-shrink-0">
          apartment
        </span>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
            {currentOrganization.name}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
            {currentOrganization.role.toLowerCase()}
          </p>
        </div>
        <span
          className={`material-icons-round text-[18px] text-slate-400 flex-shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          expand_more
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50">
          <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Switch Organization
            </p>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSwitchOrg(org.id)}
                className="w-full px-3 py-2 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-left"
              >
                <span className="material-icons-round text-[18px] text-slate-400 flex-shrink-0">
                  apartment
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {org.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                    {org.role.toLowerCase()}
                  </p>
                </div>
                {org.id === currentOrganization.id && (
                  <span className="material-icons-round text-[18px] text-brand-600 dark:text-brand-400 flex-shrink-0">
                    check
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="border-t border-slate-200 dark:border-slate-700 py-1">
            <button
              onClick={handleManageOrgs}
              className="w-full px-3 py-2 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-left"
            >
              <span className="material-icons-round text-[18px] text-slate-400">settings</span>
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Manage Organizations
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
