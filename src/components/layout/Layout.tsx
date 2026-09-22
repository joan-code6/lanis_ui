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
  MinusIcon,
} from '@heroicons/react/24/outline';
import { Link, useLocation } from 'react-router-dom';
import GlobalSearch from '../search/GlobalSearch';
import InstallPrompt from '../pwa/InstallPrompt';
import OutageNotice from '../status/OutageNotice';
import { getModuleAvailability, readModulesCache, writeModulesCache } from '../../utils/moduleCache';
import type { CachedModule } from '../../utils/moduleCache';
import { getThemeIconUrl, getThemeManifestUrl, THEME_COLOR_HEX } from '../../utils/themeAssets';
import AppIcon from '../AppIcon';
import { normalizeSidebarOrder, SidebarItemId, isDivider } from '../../utils/sidebarNavigation';

interface LayoutProps {
  children: React.ReactNode;
  basePath?: string;
}

type SidebarNavigationItem = {
  id: string;
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const SIDEBAR_COLLAPSED_KEY = 'lanis_sidebar_collapsed';

const Layout: React.FC<LayoutProps> = ({ children, basePath = '' }) => {
  const { user, token, logout } = useAuth();
  const { preferences } = usePreferences();
  const { themeColor } = useTheme();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(() => (
    window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
  ));
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

  React.useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

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
    search: { name: 'Suche', href: `${basePath}/search`, icon: MagnifyingGlassIcon },
    divider: { name: 'Trennlinie', href: '#divider', icon: MinusIcon },
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
    'search', 'divider', 'dashboard', 'messages', 'courses', 'timetable', 'study-groups', 'calendar', 'profile', 'settings',
    ...(hasNativeDateispeicher ? ['dateispeicher' as const] : []),
    ...(hasNativeSubstitutionPlan ? ['vertretungsplan' as const] : []),
    ...(hasDsbModule ? ['dsb' as const] : []),
    ...(hasWahlenModule ? ['wahlen' as const] : []),
  ]);
  const navigation = normalizeSidebarOrder(preferences.sidebar.order)
    .filter(id => !preferences.sidebar.hidden_items.includes(id))
    .filter(id => availableItems.has(id as SidebarItemId) || isDivider(id))
    .map(id => ({ id, ...(isDivider(id) ? navigationItems['divider'] : navigationItems[id as SidebarItemId]) }));

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
          <div className="relative flex flex-1 flex-col max-w-xs w-full bg-white dark:bg-surface-900 shadow-soft-lg animate-drawer-in">
            <SidebarContent navigation={navigation} showCloseButton />
          </div>
        </div>
      )}

      <div className={'hidden md:flex md:flex-col md:fixed transition-[width] duration-300 ease-out ' + (isSidebarCollapsed ? 'md:w-[60px]' : 'md:w-64') + ' ' + (isDemo ? 'md:top-10 md:bottom-0' : 'md:inset-y-0')}>
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-surface-900 border-r border-surface-100 dark:border-surface-800">
          <SidebarContent navigation={navigation} isCollapsed={isSidebarCollapsed} canCollapse />
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
      <main ref={mainRef} className={'flex-1 min-h-0 overflow-y-auto focus:outline-none pt-14 md:pt-0 transition-[margin] duration-300 ease-out ' + (isSidebarCollapsed ? 'md:ml-[60px]' : 'md:ml-64')}>
        <BasePathProvider basePath={basePath}>
          <div className="animate-fade-in">
            {!isDemo && <OutageNotice />}
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

  function SidebarContent({
    navigation,
    isCollapsed = false,
    canCollapse = false,
    showCloseButton = false,
  }: {
    navigation: SidebarNavigationItem[];
    isCollapsed?: boolean;
    canCollapse?: boolean;
    showCloseButton?: boolean;
  }) {
    return (
      <>
        <div className={`flex items-center flex-shrink-0 py-5 ${isCollapsed ? 'justify-center px-0' : 'justify-between px-5'}`}>
          <Link
            to={`${basePath}/dashboard`}
            className={`group relative flex items-center rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 ${isCollapsed ? 'h-10 w-10 justify-center' : 'gap-3'}`}
            aria-label={isCollapsed ? 'Seitenleiste ausklappen' : 'Zum Dashboard'}
            title={isCollapsed ? 'Seitenleiste ausklappen' : undefined}
            onClick={(event) => {
              setIsSidebarOpen(false);
              if (isCollapsed) {
                event.preventDefault();
                setIsSidebarCollapsed(false);
              }
            }}
          >
            <AppIcon alt="Schulportal" className={`${isCollapsed ? 'h-10 w-10' : 'h-9 w-9'} rounded-xl transition-opacity duration-200 ${isCollapsed ? 'group-hover:opacity-0' : ''}`} />
            <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-32 opacity-100'}`}>
              <h1 className="whitespace-nowrap text-base font-semibold text-surface-900 dark:text-surface-100 tracking-tight">Schulportal</h1>
              <p className="whitespace-nowrap text-[11px] text-surface-500 dark:text-surface-400 font-medium tracking-wide uppercase">Hessen</p>
            </div>
            {isCollapsed && (
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute h-5 w-5 text-surface-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100 dark:text-surface-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 4v16" />
                <path d="M5 12h10" />
                <path d="m11 8 4 4-4 4" />
              </svg>
            )}
          </Link>
          {canCollapse && !isCollapsed && (
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(true)}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/50 dark:text-surface-500 dark:hover:bg-surface-800 dark:hover:text-surface-200"
              aria-label="Seitenleiste einklappen"
              title="Seitenleiste einklappen"
            >
              <svg
                aria-hidden="true"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 4v16" />
                <path d="M19 12H9" />
                <path d="m13 8-4 4 4 4" />
              </svg>
            </button>
          )}
          {showCloseButton && (
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/50 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200"
              aria-label="Menü schließen"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className={`flex-1 flex flex-col overflow-y-auto ${isCollapsed ? 'px-0' : 'px-3'} pb-4`}>
          <nav className="flex-1 space-y-1">
            {navigation.map((item, index) => {
              if (item.id === 'search') {
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIsSearchOpen(true)}
                    className={`nav-link ${isCollapsed ? 'mx-auto h-10 w-10 justify-center gap-0 px-0' : 'w-full'}`}
                    title={isCollapsed ? item.name : undefined}
                    aria-label={item.name}
                  >
                    <item.icon className="nav-link-icon text-surface-400 dark:text-surface-500" />
                    <span className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-24 opacity-100'}`}>
                      {item.name}
                    </span>
                    {!isCollapsed && (
                      <kbd className="ml-auto hidden items-center rounded border border-surface-200 bg-surface-50 px-1.5 py-0.5 text-[10px] font-medium text-surface-400 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-500 md:inline-flex">
                        Strg+K
                      </kbd>
                    )}
                  </button>
                );
              }              if (isDivider(item.id)) {
                return (
                  <div key={item.id} className="!my-3 border-t border-surface-100 dark:border-surface-800" aria-label="Trennlinie" />
                );
              }
              const isActive = item.href === '/'
                ? location.pathname === item.href
                : location.pathname === item.href || location.pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.id}
                  to={item.href}
                  style={{ animationDelay: `${index * 60}ms` }}
                  className={`nav-link ${isCollapsed ? 'mx-auto h-10 w-10 justify-center gap-0 px-0' : ''} ${isActive ? 'nav-link-active' : ''}`}
                  title={isCollapsed ? item.name : undefined}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <item.icon
                    className={`nav-link-icon ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-surface-400 dark:text-surface-500'}`}
                  />
                  <span className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-48 opacity-100'}`}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto pt-4 border-t border-surface-100 dark:border-surface-800">
            <div className="relative">
              {showLogoutConfirmation && (
                <div
                  className={`${isCollapsed
                    ? 'fixed bottom-4 left-[68px] z-50 w-64'
                    : 'absolute bottom-full left-0 right-0 z-20 mb-2'} rounded-xl border border-surface-200 bg-white p-3 shadow-soft-lg dark:border-surface-700 dark:bg-surface-900`}
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
                className={`nav-link text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300 ${isCollapsed ? 'mx-auto h-10 w-10 justify-center gap-0 px-0' : 'w-full'}`}
                title="Abmelden"
                aria-expanded={showLogoutConfirmation}
              >
                <ArrowRightOnRectangleIcon className="nav-link-icon text-surface-400 dark:text-surface-500" />
                <span className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-24 opacity-100'}`}>
                  Abmelden
                </span>
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }
};

export default Layout;
