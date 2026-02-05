import { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  LogOut,
  ChevronRight,
  ChevronLeft,
  LayoutDashboard,
  Key,
  ClipboardList,
  TrendingUp,
  PlayCircle,
  UserCog,
  UserCircle,
  Settings,
  Moon,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '../hooks/useAuthStore';
import { useThemeStore } from '../hooks/useThemeStore';
import { useOrganizationStore } from '../hooks/useOrganizationStore';
import { useBrandStore } from '../hooks/useBrandStore';
import { organizationsApi, brandsApi } from '../services/api';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';
import OrganizationSwitcher from './OrganizationSwitcher';
import BrandSwitcher from './BrandSwitcher';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ name: 'Dashboard', href: '/', icon: LayoutDashboard }],
  },
  {
    label: 'Content',
    items: [
      { name: 'Keywords', href: '/keywords', icon: Key },
      { name: 'Workflow', href: '/workflow', icon: ClipboardList },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { name: 'Search Console', href: '/gsc', icon: TrendingUp },
      { name: 'YouTube', href: '/youtube', icon: PlayCircle },
    ],
  },
  {
    label: 'Settings',
    items: [
      { name: 'Accounts', href: '/accounts', icon: UserCog },
      { name: 'Personas', href: '/personas', icon: UserCircle },
      { name: 'Configuration', href: '/settings', icon: Settings },
    ],
  },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { setOrganizations, clearOrganizations } = useOrganizationStore();
  const { setBrands, clearBrands } = useBrandStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch organizations on mount
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const response = await organizationsApi.list();
        setOrganizations(response.data);
      } catch (error) {
        console.error('Failed to fetch organizations:', error);
      }
    };

    if (user) {
      fetchOrganizations();
    }
  }, [user, setOrganizations]);

  // Fetch brands on mount
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await brandsApi.list();
        setBrands(response.data);
      } catch (error) {
        console.error('Failed to fetch brands:', error);
      }
    };

    if (user) {
      fetchBrands();
    }
  }, [user, setBrands]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Handle escape key to close mobile sidebar
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    },
    [sidebarOpen]
  );

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
    clearOrganizations();
    clearBrands();
    logout();
    navigate('/login');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const ThemeIcon = theme === 'dark' ? Moon : Sun;

  const renderNavGroup = (group: NavGroup, onItemClick?: () => void, collapsed = false) => {
    return (
      <div key={group.label} className="mb-6">
        <h3
          className={`px-2 text-[10px] font-semibold text-surface-400 dark:text-surface-500 uppercase tracking-[0.08em] mb-2 ${
            collapsed ? 'text-center' : ''
          }`}
        >
          {collapsed ? group.label.charAt(0) : group.label}
        </h3>
        <nav className="space-y-0.5">
          {group.items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                      : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
                  } ${collapsed ? 'justify-center' : ''}`
                }
                onClick={onItemClick}
                title={collapsed ? item.name : undefined}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-primary-500 rounded-r-full" />
                    )}
                    <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                    {!collapsed && item.name}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>
    );
  };

  return (
    <div className="min-h-screen transition-colors duration-200">
      {/* Skip to main content link */}
      <a href="#main-content" className="skip-to-content">
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
          className={`fixed inset-0 bg-surface-900/60 backdrop-blur-sm transition-opacity duration-300 ${
            sidebarOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
        <div
          className={`fixed inset-y-0 left-0 flex w-64 flex-col bg-gradient-to-b from-surface-50 to-white dark:from-surface-900 dark:to-surface-800 transform transition-transform duration-300 ease-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Mobile Sidebar Header */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-surface-200/60 dark:border-surface-700/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">E</span>
              </div>
              <span className="text-surface-900 dark:text-white font-bold text-lg tracking-heading whitespace-nowrap">
                Engage
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 -mr-2 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors"
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mobile Organization Switcher */}
          <div className="px-3 py-3 border-b border-surface-200/60 dark:border-surface-700/60">
            <OrganizationSwitcher />
          </div>

          {/* Mobile Brand Switcher */}
          <div className="px-3 py-3 border-b border-surface-200/60 dark:border-surface-700/60">
            <BrandSwitcher />
          </div>

          {/* Mobile Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scrollbar-thin">
            {navigationGroups.map((group) => renderNavGroup(group, () => setSidebarOpen(false)))}
          </nav>

          {/* Mobile Footer */}
          <div className="border-t border-surface-200/60 dark:border-surface-700/60 p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <UserCircle className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-surface-900 dark:text-white truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-surface-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-lg text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700"
                aria-label="Toggle theme"
              >
                <ThemeIcon className="h-[18px] w-[18px]" />
              </button>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700"
                aria-label="Log out"
              >
                <LogOut className="h-[18px] w-[18px]" />
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
        <div className="flex flex-col flex-1 border-r border-surface-200/60 bg-gradient-to-b from-surface-50 to-white dark:border-surface-700/60 dark:from-surface-900 dark:to-surface-800">
          {/* Desktop Header */}
          <div
            className={`flex h-16 items-center border-b border-surface-200/60 dark:border-surface-700/60 ${
              sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'
            }`}
          >
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-lg">E</span>
                </div>
                <span className="text-surface-900 dark:text-white font-bold text-lg tracking-heading whitespace-nowrap">
                  Engage
                </span>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">E</span>
              </div>
            )}
            {!sidebarCollapsed && (
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-lg text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                aria-label="Toggle theme"
              >
                <ThemeIcon className="h-[18px] w-[18px]" />
              </button>
            )}
          </div>

          {/* Desktop Organization Switcher */}
          <div
            className={`border-b border-surface-200/60 dark:border-surface-700/60 ${
              sidebarCollapsed ? 'px-2 py-2' : 'px-3 py-3'
            }`}
          >
            <OrganizationSwitcher collapsed={sidebarCollapsed} />
          </div>

          {/* Desktop Brand Switcher */}
          <div
            className={`border-b border-surface-200/60 dark:border-surface-700/60 ${
              sidebarCollapsed ? 'px-2 py-2' : 'px-3 py-3'
            }`}
          >
            <BrandSwitcher />
          </div>

          {/* Desktop Navigation */}
          <nav
            className={`flex-1 overflow-y-auto py-4 scrollbar-thin ${
              sidebarCollapsed ? 'px-2' : 'px-4'
            }`}
          >
            {navigationGroups.map((group) => renderNavGroup(group, undefined, sidebarCollapsed))}
          </nav>

          {/* Desktop Footer */}
          <div className="border-t border-surface-200/60 dark:border-surface-700/60 p-4">
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={toggleTheme}
                  className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                  title="Toggle theme"
                  aria-label="Toggle theme"
                >
                  <ThemeIcon className="h-[18px] w-[18px]" />
                </button>
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                  title="Expand sidebar"
                  aria-label="Expand sidebar"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                  title="Logout"
                  aria-label="Log out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-3 p-2 rounded-lg bg-surface-100/50 dark:bg-surface-800/50">
                  <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <UserCircle className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-surface-900 dark:text-white truncate">
                      {user?.name}
                    </p>
                    <p className="text-xs text-surface-500 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                    aria-label="Log out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Collapse
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div
        className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}
      >
        {/* Mobile header */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-x-4 border-b border-surface-200/60 bg-white/80 backdrop-blur-xl dark:border-surface-700/60 dark:bg-surface-900/80 px-4 lg:hidden">
          <div className="flex items-center gap-x-4">
            <button
              type="button"
              className="p-2.5 -ml-2 text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors touch-target"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={sidebarOpen}
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-base">E</span>
              </div>
              <span className="text-surface-900 dark:text-white font-bold text-lg tracking-heading whitespace-nowrap">
                Engage
              </span>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors touch-target"
            aria-label="Toggle theme"
          >
            <ThemeIcon className="h-5 w-5" />
          </button>
        </header>

        <main id="main-content" className="p-6 lg:p-8" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      {/* Keyboard shortcuts modal */}
      <KeyboardShortcutsModal />
    </div>
  );
}
