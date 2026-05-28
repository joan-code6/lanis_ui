import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
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
} from '@heroicons/react/24/outline';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Nachrichten', href: '/messages', icon: ChatBubbleLeftRightIcon },
  { name: 'Mein Unterricht', href: '/courses', icon: AcademicCapIcon },
  { name: 'Kalender', href: '/calendar', icon: CalendarDaysIcon },
  { name: 'Profil', href: '/profile', icon: UserIcon },
  { name: 'Einstellungen', href: '/settings', icon: Cog6ToothIcon },
];

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

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
            <SidebarContent />
          </div>
        </div>
      )}

      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-surface-900 border-r border-surface-100 dark:border-surface-800">
          <SidebarContent />
        </div>
      </div>

      <div className="flex flex-col w-0 flex-1 md:ml-64">
        <header className="sticky top-0 z-20 flex-shrink-0 flex h-16 bg-white/80 dark:bg-surface-900/80 backdrop-blur-xl border-b border-surface-100 dark:border-surface-800">
          <button
            type="button"
            className="px-4 border-r border-surface-100 dark:border-surface-800 text-surface-500 dark:text-surface-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500/40 md:hidden hover:text-surface-700 dark:hover:text-surface-300 transition-colors"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <div className="flex-1 px-4 flex justify-between items-center">
            <div className="flex-1 flex" />
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 pl-2 border-l border-surface-200 dark:border-surface-700">
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-surface-100 dark:bg-surface-800 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse-soft" />
                  <span className="text-xs font-medium text-surface-700 dark:text-surface-300">
                    {user?.username || 'Benutzer'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-all duration-200 ease-out-expo active:scale-95"
                  title="Abmelden"
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Abmelden</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );

  function SidebarContent() {
    return (
      <>
        <div className="flex items-center flex-shrink-0 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-primary-600 rounded-xl flex items-center justify-center shadow-soft">
              <AcademicCapIcon className="h-5 w-5 text-white" />
            </div>
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
        </div>
      </>
    );
  }
};

export default Layout;
