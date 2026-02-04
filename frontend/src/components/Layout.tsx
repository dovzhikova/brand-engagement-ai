import { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ListTodo,
  Users,
  UserCircle,
  Key,
  Settings,
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
  Monitor,
  TrendingUp,
  Youtube,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { useAuthStore } from '../hooks/useAuthStore';
import { useThemeStore } from '../hooks/useThemeStore';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  collapsible?: boolean;
  defaultOpen?: boolean;
}

const navigationGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Content',
    items: [
      { name: 'Keywords', href: '/keywords', icon: Key },
      { name: 'Workflow', href: '/workflow', icon: ListTodo },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { name: 'Search Console', href: '/gsc', icon: TrendingUp },
      { name: 'YouTube', href: '/youtube', icon: Youtube },
    ],
  },
  {
    label: 'Settings',
    collapsible: true,
    defaultOpen: true,
    items: [
      { name: 'Accounts', href: '/accounts', icon: Users },
      { name: 'Personas', href: '/personas', icon: UserCircle },
      { name: 'Configuration', href: '/settings', icon: Settings },
    ],
  },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Handle escape key to close mobile sidebar
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [sidebarOpen]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const isGroupOpen = (group: NavGroup) => {
    if (!group.collapsible) return true;
    if (collapsedGroups.has(group.label)) return false;
    return group.defaultOpen !== false;
  };

  const isGroupActive = (group: NavGroup) => {
    return group.items.some((item) => location.pathname === item.href);
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'system' ? Monitor : Sun;

  const renderNavGroup = (group: NavGroup, onItemClick?: () => void, collapsed = false) => {
    const isOpen = isGroupOpen(group);
    const isActive = isGroupActive(group);

    return (
      <div key={group.label} className="mb-1" role="group" aria-labelledby={`nav-group-${group.label.toLowerCase().replace(/\s+/g, '-')}`}>
        {group.collapsible ? (
          <button
            id={`nav-group-${group.label.toLowerCase().replace(/\s+/g, '-')}`}
            onClick={() => toggleGroup(group.label)}
            aria-expanded={isOpen}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors ${
              isActive
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {!collapsed && <span>{group.label}</span>}
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <div
            id={`nav-group-${group.label.toLowerCase().replace(/\s+/g, '-')}`}
            className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ${collapsed ? 'text-center' : ''}`}
          >
            {collapsed ? group.label.charAt(0) : group.label}
          </div>
        )}
        {isOpen && (
          <nav className="space-y-0.5" aria-label={group.label}>
            {group.items.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                aria-current={location.pathname === item.href ? 'page' : undefined}
                className={({ isActive }) =>
                  `flex items-center ${collapsed ? 'justify-center' : ''} px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`
                }
                onClick={onItemClick}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className={`h-5 w-5 flex-shrink-0 ${collapsed ? '' : 'mr-3'}`} aria-hidden="true" />
                {!collapsed && <span>{item.name}</span>}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="skip-to-content"
      >
        Skip to main content
      </a>

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300 ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div
          className={`fixed inset-0 bg-gray-600 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 transition-opacity duration-300 ${
            sidebarOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
        <div
          className={`fixed inset-y-0 left-0 flex w-64 flex-col bg-white dark:bg-gray-800 transform transition-transform duration-300 ease-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-16 items-center justify-between px-4 border-b dark:border-gray-700">
            <span className="text-xl font-bold text-brand-600 whitespace-nowrap">Brand Engage</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 -mr-2 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Close navigation menu"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-2 scrollbar-thin" aria-label="Main navigation">
            {navigationGroups.map((group) => renderNavGroup(group, () => setSidebarOpen(false)))}
          </nav>
          <div className="border-t dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={cycleTheme}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label={`Current theme: ${theme}. Click to change.`}
              >
                <ThemeIcon className="h-4 w-4" aria-hidden="true" />
                <span className="capitalize">{theme}</span>
              </button>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Log out"
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'
        }`}
        aria-label="Main navigation"
      >
        <div className="flex flex-col flex-1 border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className={`flex h-16 items-center border-b dark:border-gray-700 ${sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
            {!sidebarCollapsed && (
              <span className="text-xl font-bold text-brand-600 whitespace-nowrap flex-shrink-0">Brand Engage</span>
            )}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={cycleTheme}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={`Theme: ${theme}`}
                aria-label={`Current theme: ${theme}. Click to change.`}
              >
                <ThemeIcon className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-expanded={!sidebarCollapsed}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
          <nav className={`flex-1 overflow-y-auto py-4 space-y-3 scrollbar-thin ${sidebarCollapsed ? 'px-2' : 'px-3'}`} aria-label="Main navigation">
            {navigationGroups.map((group) => renderNavGroup(group, undefined, sidebarCollapsed))}
          </nav>
          <div className="border-t dark:border-gray-700 p-4">
            {sidebarCollapsed ? (
              <button
                onClick={handleLogout}
                className="w-full p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex justify-center"
                title="Logout"
                aria-label="Log out"
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
              </button>
            ) : (
              <div className="flex items-center">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {user?.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Logout"
                  aria-label="Log out"
                >
                  <LogOut className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-x-4 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 px-4 lg:hidden">
          <div className="flex items-center gap-x-4">
            <button
              type="button"
              className="p-2.5 -ml-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors touch-target"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={sidebarOpen}
              aria-controls="mobile-sidebar"
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
            <span className="text-xl font-bold text-brand-600 whitespace-nowrap">Brand Engage</span>
          </div>
          <button
            onClick={cycleTheme}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-target"
            title={`Theme: ${theme}`}
            aria-label={`Current theme: ${theme}. Click to change.`}
          >
            <ThemeIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <main id="main-content" className="p-6" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      {/* Keyboard shortcuts modal */}
      <KeyboardShortcutsModal />
    </div>
  );
}
