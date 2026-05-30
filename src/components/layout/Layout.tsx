import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { appsAPI } from '../../services/api';
import {
  HomeIcon,
  ChatBubbleLeftRightIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  UserIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, token, logout } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [hasDsbModule, setHasDsbModule] = React.useState(false);

  React.useEffect(() => {
    const checkDsbModule = async () => {
      if (!token) return;
      try {
        const response = await appsAPI.getModules(token);
        if (response.success) {
          const dsbExists = response.modules.some(
            m => m.name.toLowerCase().includes('dsb') ||
                 m.name.toLowerCase().includes('vertretungsplan') ||
                 m.url.toLowerCase().includes('dsb') ||
                 m.url.toLowerCase().includes('vertretung')
          );
          setHasDsbModule(dsbExists);
        }
      } catch (error) {
        console.error('Error checking for DSB module:', error);
      }
    };

    checkDsbModule();
  }, [token]);

  const baseNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Nachrichten', href: '/messages', icon: ChatBubbleLeftRightIcon },
    { name: 'Mein Unterricht', href: '/courses', icon: AcademicCapIcon },
    { name: 'Kalender', href: '/calendar', icon: CalendarDaysIcon },
    { name: 'Profil', href: '/profile', icon: UserIcon },
    { name: 'Einstellungen', href: '/settings', icon: Cog6ToothIcon },
  ];

  const dsbNavItem = hasDsbModule ? { name: 'Vertretungsplan', href: '/dsb', icon: ClipboardDocumentListIcon } : null;

  const navigation = dsbNavItem ? [...baseNavigation.slice(0, 2), dsbNavItem, ...baseNavigation.slice(2)] : baseNavigation;

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-[100dvh] flex bg-surface-50 dark:bg-surface-950">
      {isSidebarOpen && (
        <div className="fixed inset-0 flex z-40 md:hidden">
          <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-surface-900 shadow-soft-lg animate-drawer-in">
            <div className="absolute top-0 right-0 -mr-12 pt-4">
              <button
                type="button"
                className="flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-white/50"
                onClick={() => setIsSidebarOpen(false)}
              >
                <XMarkIcon className="h-6 w-6 text-white" />
              </button>
            </div>
            <SidebarContent navigation={navigation} />
          </div>
        </div>
      )}

      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-surface-900 border-r border-surface-100 dark:border-surface-800">
          <SidebarContent navigation={navigation} />
        </div>
      </div>

      <div className="flex flex-col w-0 flex-1 md:ml-64">
        <div className="md:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md border-b border-surface-100 dark:border-surface-800">
          <button
            type="button"
            className="flex items-center justify-center h-9 w-9 rounded-lg text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/favicon/android-chrome-192x192.png" alt="Schulportal" className="h-7 w-7 rounded-lg" />
            <span className="text-sm font-semibold text-surface-900 dark:text-surface-100">Schulportal</span>
          </div>
          <div className="w-9" />
        </div>
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );

  function SidebarContent({ navigation }: { navigation: typeof baseNavigation }) {
    return (
      <>
        <div className="flex items-center flex-shrink-0 px-5 py-5">
          <div className="flex items-center gap-3">
            <img src="/favicon/android-chrome-192x192.png" alt="Schulportal" className="h-9 w-9 rounded-xl" />
            <div>
              <h1 className="text-base font-semibold text-surface-900 dark:text-surface-100 tracking-tight">Schulportal</h1>
              <p className="text-[11px] text-surface-500 dark:text-surface-400 font-medium tracking-wide uppercase">Hessen</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto px-3 pb-4">
          <nav className="flex-1 space-y-1">
            {navigation.map((item, index) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  style={{ animationDelay: `${index * 60}ms` }}
                  className={`nav-link ${isActive ? 'nav-link-active' : ''}`}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <item.icon
                    className={`nav-link-icon ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-surface-400 dark:text-surface-500'}`}
                  />
                  {item.name}
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-600 dark:bg-primary-400" />
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto pt-4 border-t border-surface-100 dark:border-surface-800">
            <button
              onClick={handleLogout}
              className="nav-link w-full text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300"
              title="Abmelden"
            >
              <ArrowRightOnRectangleIcon className="nav-link-icon text-surface-400 dark:text-surface-500" />
              Abmelden
            </button>
          </div>
        </div>
      </>
    );
  }
};

export default Layout;
