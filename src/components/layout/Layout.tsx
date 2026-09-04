import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { BasePathProvider } from '../../contexts/BasePathContext';
import { useTheme } from '../../contexts/ThemeContext';
import DemoBar from '../demo/DemoBar';
import { appsAPI } from '../../services/api';
import axios from 'axios';
import {
  HomeIcon,
  ChatBubbleLeftRightIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  UserIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ClipboardDocumentListIcon,
  ClipboardDocumentCheckIcon,
  FolderIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { Link, useLocation } from 'react-router-dom';
import GlobalSearch from '../search/GlobalSearch';
import InstallPrompt from '../pwa/InstallPrompt';
import { getModuleAvailability, readModulesCache, writeModulesCache } from '../../utils/moduleCache';
import type { CachedModule } from '../../utils/moduleCache';
import { getThemeIconUrl, getThemeManifestUrl, THEME_COLOR_HEX } from '../../utils/themeAssets';
import AppIcon from '../AppIcon';
import { normalizeSidebarOrder, SidebarItemId } from '../../utils/sidebarNavigation';

interface LayoutProps {
  children: React.ReactNode;
  basePath?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, basePath = '' }) => {
  const { user, token, logout } = useAuth();
  const { preferences } = usePreferences();
  const { themeColor } = useTheme();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = React.useState(false);
  const [hasNativeDateispeicher, setHasNativeDateispeicher] = React.useState(false);
  const [hasNativeSubstitutionPlan, setHasNativeSubstitutionPlan] = React.useState(false);
  const [hasDsbModule, setHasDsbModule] = React.useState(false);
  const [hasWahlenModule, setHasWahlenModule] = React.useState(false);
  const mainRef = React.useRef<HTMLElement>(null);
  const pwaRef = React.useRef<any>(null);

  const appIconUrl = getThemeIconUrl(themeColor);
  const manifestUrl = getThemeManifestUrl(themeColor);

  React.useLayoutEffect(() => {
    const el = pwaRef.current;
    if (!el) return;
    el.manualApple = true;
    el.manualChrome = true;
    el.useLocalStorage = true;
    el.styles = { '--tint-color': THEME_COLOR_HEX[themeColor] };
  }, []);

  React.useEffect(() => {
    const el = pwaRef.current;
    if (!el) return;
    el.icon = appIconUrl;
    el.manifestUrl = manifestUrl;
    el.styles = { '--tint-color': THEME_COLOR_HEX[themeColor] };
  }, [appIconUrl, manifestUrl, themeColor]);

  React.useLayoutEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  React.useEffect(() => {
    if (!token) return;
    const abortController = new AbortController();
    const applyModuleAvailability = (modules: CachedModule[]) => {
      const availability = getModuleAvailability(modules);
      setHasNativeDateispeicher(availability.hasNativeDateispeicher);
      setHasNativeSubstitutionPlan(availability.hasNativeSubstitutionPlan);
      setHasDsbModule(availability.hasDsbModule);
      setHasWahlenModule(availability.hasWahlenModule);
    };
    const cachedModules = readModulesCache(user);
    applyModuleAvailability(cachedModules);

    const checkDsbModule = async () => {
      try {
        const response = await appsAPI.getModules(token, abortController.signal);
        if (abortController.signal.aborted) return;
        if (response.success) {
          applyModuleAvailability(response.modules);
          writeModulesCache(user, response.modules);
        }
      } catch (error) {
        if (axios.isCancel(error)) return;
        console.error('Error checking for DSB module:', error);
      }
    };

    checkDsbModule();
    return () => abortController.abort();
  }, [token, user?.school_id, user?.username]);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'f')) {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const navigationItems = {
    dashboard: { name: 'Dashboard', href: `${basePath}/dashboard`, icon: HomeIcon },
    messages: { name: 'Nachrichten', href: `${basePath}/messages`, icon: ChatBubbleLeftRightIcon },
    dateispeicher: { name: 'Dateispeicher', href: `${basePath}/dateispeicher`, icon: FolderIcon },
    vertretungsplan: { name: 'Vertretungsplan', href: `${basePath}/vertretungsplan`, icon: ClipboardDocumentListIcon },
    dsb: { name: 'DSBmobile', href: `${basePath}/dsb`, icon: ClipboardDocumentListIcon },
    courses: { name: 'Mein Unterricht', href: `${basePath}/courses`, icon: AcademicCapIcon },
    wahlen: { name: 'Wahlen', href: `${basePath}/wahlen`, icon: ClipboardDocumentCheckIcon },
    timetable: { name: 'Stundenplan', href: `${basePath}/timetable`, icon: ClockIcon },
    'study-groups': { name: 'Lerngruppen', href: `${basePath}/study-groups`, icon: UserGroupIcon },
    calendar: { name: 'Kalender', href: `${basePath}/calendar`, icon: CalendarDaysIcon },
    profile: { name: 'Profil', href: `${basePath}/profile`, icon: UserIcon },
    settings: { name: 'Einstellungen', href: `${basePath}/settings`, icon: Cog6ToothIcon },
  } satisfies Record<SidebarItemId, { name: string; href: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }>;
  const availableItems = new Set<SidebarItemId>([
    'dashboard', 'messages', 'courses', 'timetable', 'study-groups', 'calendar', 'profile', 'settings',
    ...(hasNativeDateispeicher ? ['dateispeicher' as const] : []),
    ...(hasNativeSubstitutionPlan ? ['vertretungsplan' as const] : []),
    ...(hasDsbModule ? ['dsb' as const] : []),
    ...(hasWahlenModule ? ['wahlen' as const] : []),
  ]);
  const navigation = normalizeSidebarOrder(preferences.sidebar.order)
    .filter(id => !preferences.sidebar.hidden_items.includes(id))
    .filter(id => availableItems.has(id))
    .map(id => navigationItems[id]);

  const handleLogout = async () => {
    setShowLogoutConfirmation(false);
    await logout();
  };

  const isDemo = basePath === '/demo';

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-surface-50 dark:bg-surface-950">
      {isDemo && <DemoBar />}
      {isSidebarOpen && (
        <div className={'fixed inset-x-0 bottom-0 flex z-40 md:hidden ' + (isDemo ? 'top-10' : 'inset-0')}>
          <div className={'fixed inset-x-0 bottom-0 bg-surface-900/40 backdrop-blur-sm ' + (isDemo ? 'top-10' : 'inset-0')} onClick={() => setIsSidebarOpen(false)} />
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

      <div className={'hidden md:flex md:w-64 md:flex-col md:fixed ' + (isDemo ? 'md:top-10 md:bottom-0' : 'md:inset-y-0')}>
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-surface-900 border-r border-surface-100 dark:border-surface-800">
          <SidebarContent navigation={navigation} />
        </div>
      </div>

      <div className={'md:hidden absolute inset-x-0 h-14 z-30 flex items-center justify-between px-4 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md border-b border-surface-100 dark:border-surface-800 ' + (isDemo ? 'top-10' : 'top-0')}>
        <button
          type="button"
          className="flex items-center justify-center h-9 w-9 rounded-lg text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Bars3Icon className="h-5 w-5" />
        </button>
        <Link
          to={`${basePath}/dashboard`}
          className="flex items-center gap-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          aria-label="Zum Dashboard"
        >
          <AppIcon alt="Schulportal" className="h-7 w-7 rounded-lg" />
          <span className="text-sm font-semibold text-surface-900 dark:text-surface-100">Schulportal</span>
        </Link>
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center justify-center h-9 w-9 rounded-lg text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          title="Suche (Strg+K)"
        >
          <MagnifyingGlassIcon className="h-5 w-5" />
        </button>
      </div>
      <main ref={mainRef} className="flex-1 min-h-0 overflow-y-auto md:ml-64 focus:outline-none pt-14 md:pt-0">
        <BasePathProvider basePath={basePath}>
          <div className="animate-fade-in">
            {children}
          </div>
        </BasePathProvider>
      </main>
      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        basePath={basePath}
        hasNativeDateispeicher={hasNativeDateispeicher}
        hasNativeSubstitutionPlan={hasNativeSubstitutionPlan}
        hasDsbModule={hasDsbModule}
      />
      <pwa-install
        ref={pwaRef}
        manifest-url={manifestUrl}
        name="Lanis"
        icon={appIconUrl}
        description="Moderne Benutzeroberfläche für das Schulportal Hessen"
        install-description="Direkt vom Homescreen öffnen — wie eine echte App."
      ></pwa-install>
      <InstallPrompt />
    </div>
  );

  function SidebarContent({ navigation }: { navigation: typeof navigationItems[SidebarItemId][] }) {
    return (
      <>
        <div className="flex items-center flex-shrink-0 px-5 py-5">
          <div className="flex items-center gap-3">
            <AppIcon alt="Schulportal" className="h-9 w-9 rounded-xl" />
            <div>
              <h1 className="text-base font-semibold text-surface-900 dark:text-surface-100 tracking-tight">Schulportal</h1>
              <p className="text-[11px] text-surface-500 dark:text-surface-400 font-medium tracking-wide uppercase">Hessen</p>
            </div>
          </div>
        </div>

        <div className="px-3 pb-2">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="nav-link w-full justify-between"
          >
            <div className="flex items-center gap-3">
              <MagnifyingGlassIcon className="nav-link-icon text-surface-400 dark:text-surface-500" />
              <span>Suche</span>
            </div>
            <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-surface-400 dark:text-surface-500 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
              Strg+K
            </kbd>
          </button>
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto px-3 pb-4">
          <nav className="flex-1 space-y-1">
            {navigation.map((item, index) => {
              const isActive = item.href === '/'
                ? location.pathname === item.href
                : location.pathname === item.href || location.pathname.startsWith(item.href + '/');
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
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto pt-4 border-t border-surface-100 dark:border-surface-800">
            <div className="relative">
              {showLogoutConfirmation && (
                <div
                  className="absolute bottom-full left-0 right-0 z-20 mb-2 rounded-xl border border-surface-200 bg-white p-3 shadow-soft-lg dark:border-surface-700 dark:bg-surface-900"
                  role="dialog"
                  aria-label="Abmelden bestätigen"
                >
                  <p className="text-xs font-medium text-surface-800 dark:text-surface-200">Wirklich abmelden?</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowLogoutConfirmation(false)}
                      className="btn btn-secondary h-8 flex-1 px-2 py-1 text-xs"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleLogout()}
                      className="btn h-8 flex-1 bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                    >
                      Abmelden
                    </button>
                  </div>
                </div>
              )}
              <button
                onClick={() => setShowLogoutConfirmation(current => !current)}
                className="nav-link w-full text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300"
                title="Abmelden"
                aria-expanded={showLogoutConfirmation}
              >
                <ArrowRightOnRectangleIcon className="nav-link-icon text-surface-400 dark:text-surface-500" />
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }
};

export default Layout;
