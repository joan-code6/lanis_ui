import { DashboardModulesSkeleton } from '../shared/LoadingSkeletons';
import { useCachedState } from '../../hooks/useCachedState';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useBasePath } from '../../contexts/BasePathContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { appsAPI } from '../../services/api';
import axios from 'axios';
import { Module } from '../../types';
import SEO from '../seo/SEO';
import {
  FolderIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon,
  PencilIcon,
  EyeIcon,
  EyeSlashIcon,
  Bars3Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { API_BASE_URL } from '../../services/api';
import clsx from 'clsx';
import ModuleIcon from './ModuleIcon';
import { moduleDestination, prefetchModule } from '../../utils/modulePrefetch';
import DashboardNotifications from './DashboardNotifications';
import { readModulesCache, writeModulesCache } from '../../utils/moduleCache';
import { captureAccountDataGeneration } from '../../utils/accountDataWrites';
import InstallPromotion from '../pwa/InstallPromotion';

type DropTarget = {
  moduleName: string;
  placement: 'before' | 'after';
};

type DragSession = {
  moduleName: string;
  pointerId: number;
  startX: number;
  startY: number;
  target: DropTarget | null;
  started: boolean;
};

const Dashboard: React.FC = () => {
  const { token, user } = useAuth();
  const { preferences, updatePreferences } = usePreferences();
  const navigate = useNavigate();
  const basePath = useBasePath();
  const [modules, setModules, hasModules] = useCachedState<Module[]>('modules', () => readModulesCache(user));
  const [isUpdating, setIsUpdating] = useState(false);
  const folders = [...new Set(modules.flatMap(module => module.folders))];
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [externalModule, setExternalModule] = useState<Module | null>(null);
  const viewMode = preferences.dashboard.view_mode;
  const showSearch = preferences.dashboard.show_search;
  const showSubtitle = preferences.dashboard.show_subtitle;
  const [isEditMode, setIsEditMode] = useState(false);
  const moduleOrder = preferences.dashboard.module_order;
  const hiddenModules = preferences.dashboard.hidden_modules;
  const [draggedModule, setDraggedModule] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragSession = useRef<DragSession | null>(null);

  useEffect(() => {
    if (!token) return;
    const abortController = new AbortController();
    const writeGeneration = captureAccountDataGeneration();
    loadModules(abortController.signal, writeGeneration);
    return () => abortController.abort();
  }, [token, user?.school_id, user?.username]);

  const loadModules = async (signal?: AbortSignal, writeGeneration = captureAccountDataGeneration()) => {
    if (!token) return;
    setIsUpdating(true);
    try {
      setError('');
      const modulesResponse = await appsAPI.getModules(token, signal);
      if (signal?.aborted) return;
      if (modulesResponse.success) {
        setModules(modulesResponse.modules);
        writeModulesCache(user, modulesResponse.modules, writeGeneration);
      }
      setIsLoading(false);
    } catch (error) {
      if (axios.isCancel(error)) return;
      console.error('Error loading modules:', error);
      setError('Fehler beim Laden der Module.');
      setIsLoading(false);
    } finally {
      setIsUpdating(false);
    }
  };

  const warmModule = (module: Module) => {
    const id = moduleDestination(module);
    if (!isEditMode && id && token) void prefetchModule(id, token, preferences);
  };

  const handleModuleClick = (module: Module) => {
    if (isEditMode) return;
    if (module.url.includes('/nachrichten.php')) {
      navigate(`${basePath}/messages`);
      return;
    }
    if (module.url.includes('/meinunterricht.php')) {
      navigate(`${basePath}/courses`);
      return;
    }
    if (module.url.includes('/kalender.php')) {
      navigate(`${basePath}/calendar`);
      return;
    }
    const moduleLinks = `${module.url} ${module.direct_url || ''}`.toLowerCase();
    if (moduleLinks.includes('/videokonferenz.php') ||
        module.name.toLowerCase().includes('videokonferenz')) {
      navigate(`${basePath}/videokonferenz`);
      return;
    }
    if (module.url.toLowerCase().includes('/stundenplan.php') ||
        module.name.toLowerCase().includes('stundenplan')) {
      navigate(`${basePath}/timetable`);
      return;
    }
    if (module.url.toLowerCase().includes('/lerngruppen.php') ||
        module.name.toLowerCase().includes('lerngruppen')) {
      navigate(`${basePath}/study-groups`);
      return;
    }
    if (module.url.toLowerCase().includes('/oberstufenwahl.php') ||
        module.name.toLowerCase().includes('wahlen')) {
      navigate(`${basePath}/wahlen`);
      return;
    }
    if (moduleLinks.includes('/dateispeicher.php') || module.name.toLowerCase().includes('dateispeicher')) {
      navigate(`${basePath}/dateispeicher`);
      return;
    }
    if (moduleLinks.includes('/dateiverteilung.php') || module.name.toLowerCase().includes('dateiverteilung')) {
      navigate(`${basePath}/dateiverteilung`);
      return;
    }
    const moduleName = module.name.toLowerCase();
    const isDsbModule = moduleLinks.includes('dsb') || moduleName.includes('dsb');
    const isNativeSubstitutionPlan = !isDsbModule && (
      moduleLinks.includes('/vertretungsplan.php') || moduleName.includes('vertretungsplan')
    );
    if (isNativeSubstitutionPlan) {
      navigate(`${basePath}/vertretungsplan`);
      return;
    }
    if (isDsbModule) {
      navigate(`${basePath}/dsb`);
      return;
    }
    if (basePath === '/demo') {
      setExternalModule(module);
      return;
    }
    if (module.proxy_app) {
      if (!token) return;
      const proxyUrl = `${API_BASE_URL}/app/${encodeURIComponent(module.name)}?token=${encodeURIComponent(token)}`;
      window.open(proxyUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    window.open(module.direct_url || module.url, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    if (!externalModule) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExternalModule(null);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [externalModule]);

  const externalDestination = externalModule
    ? externalModule.proxy_app
      ? `${API_BASE_URL}/app/${encodeURIComponent(externalModule.name)}`
      : externalModule.direct_url || externalModule.url
    : '';

  const orderedModuleNames = [
    ...moduleOrder,
    ...modules
      .map(module => module.name)
      .filter(name => !moduleOrder.includes(name))
      .sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' })),
  ];

  const toggleHidden = (moduleName: string) => {
    const isHidden = hiddenModules.includes(moduleName);
    const newHidden = isHidden
      ? hiddenModules.filter(name => name !== moduleName)
      : [...hiddenModules, moduleName];
    if (!isHidden) {
      void updatePreferences({ dashboard: { hidden_modules: newHidden } });
      return;
    }

    const nextOrder = orderedModuleNames.filter(name => name !== moduleName);
    const firstHiddenIndex = nextOrder.findIndex(name => newHidden.includes(name));
    nextOrder.splice(firstHiddenIndex < 0 ? nextOrder.length : firstHiddenIndex, 0, moduleName);
    void updatePreferences({ dashboard: { hidden_modules: newHidden, module_order: nextOrder } });
  };

  const toggleSearch = () => {
    if (showSearch) setSearchTerm('');
    void updatePreferences({ dashboard: { show_search: !showSearch } });
  };

  const reorderModules = useCallback((sourceName: string, targetName: string, placement: DropTarget['placement']) => {
    if (sourceName === targetName) return;
    const source = modules.find(module => module.name === sourceName);
    const target = modules.find(module => module.name === targetName);
    if (!source || !target || hiddenModules.includes(sourceName) !== hiddenModules.includes(targetName)) return;

    const nextOrder = [
      ...moduleOrder,
      ...modules
        .map(module => module.name)
        .filter(name => !moduleOrder.includes(name))
        .sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' })),
    ];
    const sourceIndex = nextOrder.indexOf(sourceName);
    if (sourceIndex < 0 || !nextOrder.includes(targetName)) return;
    nextOrder.splice(sourceIndex, 1);
    const targetIndex = nextOrder.indexOf(targetName);
    nextOrder.splice(targetIndex + (placement === 'after' ? 1 : 0), 0, sourceName);
    void updatePreferences({ dashboard: { module_order: nextOrder } });
  }, [hiddenModules, moduleOrder, modules, updatePreferences]);

  const setDragTarget = (event: React.DragEvent, targetName: string) => {
    const sourceName = draggedModule || event.dataTransfer.getData('text/plain');
    if (!sourceName || sourceName === targetName) return;
    const source = modules.find(module => module.name === sourceName);
    const target = modules.find(module => module.name === targetName);
    if (!source || !target || hiddenModules.includes(sourceName) !== hiddenModules.includes(targetName)) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const bounds = event.currentTarget.getBoundingClientRect();
    const isVertical = viewMode === 'list' || window.innerWidth < 640;
    const placement = isVertical
      ? event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after'
      : event.clientX < bounds.left + bounds.width / 2 ? 'before' : 'after';
    setDropTarget({ moduleName: targetName, placement });
  };

  const handleDragStart = (event: React.DragEvent<HTMLButtonElement>, moduleName: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', moduleName);
    const card = event.currentTarget.closest<HTMLElement>('[data-dashboard-module]');
    if (card) {
      const bounds = card.getBoundingClientRect();
      event.dataTransfer.setDragImage(card, event.clientX - bounds.left, event.clientY - bounds.top);
    }
    setDraggedModule(moduleName);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>, targetName: string) => {
    event.preventDefault();
    const sourceName = draggedModule || event.dataTransfer.getData('text/plain');
    const target = dropTarget;
    if (sourceName && target?.moduleName === targetName) {
      reorderModules(sourceName, target.moduleName, target.placement);
    }
    setDraggedModule(null);
    setDropTarget(null);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>, moduleName: string) => {
    if (event.pointerType !== 'touch') return;
    if (event.button !== 0) return;
    event.preventDefault();
    dragSession.current = {
      moduleName,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      target: null,
      started: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const session = dragSession.current;
      if (!session || event.pointerId !== session.pointerId) return;
      const x = event.clientX - session.startX;
      const y = event.clientY - session.startY;
      if (!session.started && Math.hypot(x, y) < 4) return;

      session.started = true;
      event.preventDefault();
      setDraggedModule(session.moduleName);
      setDragOffset({ x, y });

      const target = document.elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>('[data-dashboard-module]');
      const targetName = target?.dataset.dashboardModule;
      if (!target || !targetName || targetName === session.moduleName) {
        session.target = null;
        setDropTarget(null);
        return;
      }

      const bounds = target.getBoundingClientRect();
      const isVertical = viewMode === 'list' || window.innerWidth < 640;
      let placement: DropTarget['placement'];
      if (isVertical) {
        placement = event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after';
      } else if (event.clientY < bounds.top + bounds.height * 0.25) {
        placement = 'before';
      } else if (event.clientY > bounds.bottom - bounds.height * 0.25) {
        placement = 'after';
      } else {
        placement = event.clientX < bounds.left + bounds.width / 2 ? 'before' : 'after';
      }

      const source = modules.find(module => module.name === session.moduleName);
      const targetModule = modules.find(module => module.name === targetName);
      if (!source || !targetModule
        || hiddenModules.includes(source.name) !== hiddenModules.includes(targetModule.name)) {
        session.target = null;
        setDropTarget(null);
        return;
      }

      session.target = { moduleName: targetName, placement };
      setDropTarget(session.target);
    };

    const finishDrag = (event: PointerEvent, commit: boolean) => {
      const session = dragSession.current;
      if (!session || event.pointerId !== session.pointerId) return;
      if (commit && session.started && session.target) {
        reorderModules(session.moduleName, session.target.moduleName, session.target.placement);
      }
      dragSession.current = null;
      setDraggedModule(null);
      setDropTarget(null);
      setDragOffset({ x: 0, y: 0 });
    };
    const handlePointerUp = (event: PointerEvent) => finishDrag(event, true);
    const handlePointerCancel = (event: PointerEvent) => finishDrag(event, false);

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [hiddenModules, modules, reorderModules, viewMode]);

  const filteredModules = modules.filter((module) => {
    if (!isEditMode && hiddenModules.includes(module.name)) return false;
    const matchesSearch = !showSearch || module.name.toLowerCase().includes(searchTerm.toLowerCase());
    const moduleFolders = module.folders.map(f => f.trim());
    const matchesFolder = selectedFolder === 'all' || moduleFolders.includes(selectedFolder);
    return matchesSearch && matchesFolder;
  });

  const sortedModules = [...filteredModules].sort((a, b) => {
    const aHidden = hiddenModules.includes(a.name);
    const bHidden = hiddenModules.includes(b.name);
    if (isEditMode && aHidden !== bHidden) return aHidden ? 1 : -1;
    return orderedModuleNames.indexOf(a.name) - orderedModuleNames.indexOf(b.name);
  });
  const moveModule = (moduleName: string, direction: -1 | 1, index: number) => {
    const neighbor = sortedModules[index + direction];
    if (!neighbor || hiddenModules.includes(moduleName) !== hiddenModules.includes(neighbor.name)) return;
    reorderModules(moduleName, neighbor.name, direction < 0 ? 'before' : 'after');
  };

  const renderMoveControls = (module: Module, index: number, vertical: boolean) => {
    const canMove = (direction: -1 | 1) => {
      const neighbor = sortedModules[index + direction];
      return Boolean(neighbor && hiddenModules.includes(module.name) === hiddenModules.includes(neighbor.name));
    };
    const moveButton = (
      direction: -1 | 1,
      Icon: typeof ChevronUpIcon,
      responsiveClass = '',
    ) => (
      <button
        key={`${direction}-${responsiveClass}`}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          moveModule(module.name, direction, index);
        }}
        disabled={!canMove(direction)}
        className={clsx('rounded-md p-1 text-surface-500 hover:bg-white hover:text-primary-600 disabled:opacity-25 dark:hover:bg-surface-700', responsiveClass)}
        aria-label={`${module.name} an die ${direction < 0 ? 'vorherige' : 'nächste'} Stelle verschieben`}
      >
        <Icon className="h-4 w-4" />
      </button>
    );

    return (
      <div className="ml-auto flex items-center rounded-lg bg-surface-100 p-0.5 dark:bg-surface-800">
        {vertical
          ? <>{moveButton(-1, ChevronUpIcon)}{moveButton(1, ChevronDownIcon)}</>
          : <>
              {moveButton(-1, ChevronUpIcon, 'sm:hidden')}
              {moveButton(1, ChevronDownIcon, 'sm:hidden')}
              {moveButton(-1, ChevronLeftIcon, 'hidden sm:inline-flex')}
              {moveButton(1, ChevronRightIcon, 'hidden sm:inline-flex')}
            </>}
      </div>
    );
  };

  if (!token) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100">Nicht authentifiziert</h3>
          <p className="text-surface-500">Bitte melden Sie sich an, um das Dashboard zu sehen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="module-page">
      <SEO
        title="Dashboard"
        description="Lanis Dashboard — Deine persönliche Übersicht über alle Apps und Module des Schulportal Hessen."
        path="/dashboard"
        noindex
      />
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        {(showSubtitle || isEditMode) && (
          <div className="flex items-center gap-2">
            <p className={clsx('page-subtitle', !showSubtitle && 'opacity-50')}>
              Alle verfügbaren Apps und Module
            </p>
            {isEditMode && (
              <button
                type="button"
                onClick={() => void updatePreferences({ dashboard: { show_subtitle: !showSubtitle } })}
                className="shrink-0 rounded-lg p-1.5 text-surface-500 transition-colors hover:bg-surface-100 hover:text-primary-600 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-primary-400"
                aria-label={showSubtitle ? 'Dashboard-Untertitel ausblenden' : 'Dashboard-Untertitel einblenden'}
                aria-pressed={showSubtitle}
                title={showSubtitle ? 'Untertitel ausblenden' : 'Untertitel einblenden'}
              >
                {showSubtitle ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            )}
          </div>
        )}
      </div>

      <DashboardNotifications />

      {basePath !== '/demo' && <InstallPromotion />}

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm animate-scale-in">
          {error}
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between">
        <div className="relative w-full min-w-0 max-w-sm flex-1 lg:max-w-md">
          {(showSearch || isEditMode) && (
            <>
              <MagnifyingGlassIcon className={clsx('absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2', showSearch ? 'text-surface-400' : 'text-surface-300 dark:text-surface-600')} />
              <input
                type="text"
                placeholder={showSearch ? 'Apps und Module durchsuchen...' : 'Suche ausgeblendet'}
                className={clsx('input w-full pl-10 text-sm', isEditMode && 'pr-12', !showSearch && 'cursor-not-allowed bg-surface-200 text-surface-500 opacity-50 dark:bg-surface-700 dark:text-surface-400')}
                value={showSearch ? searchTerm : ''}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={!showSearch}
              />
              {isEditMode && (
                <button
                  type="button"
                  onClick={toggleSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-surface-500 transition-colors hover:bg-surface-100 hover:text-primary-600 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-primary-400"
                  aria-label={showSearch ? 'Dashboard-Suche ausblenden' : 'Dashboard-Suche einblenden'}
                  aria-pressed={showSearch}
                  title={showSearch ? 'Suche ausblenden' : 'Suche einblenden'}
                >
                  {showSearch ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            className="hidden input text-sm flex-1 min-w-0 sm:flex-none sm:w-auto sm:max-w-[200px]"
          >
            <option value="all">Alle Ordner</option>
            {folders.map((folder) => (
              <option key={folder} value={folder}>
                {folder}
              </option>
            ))}
          </select>

          <div className="flex bg-surface-100 dark:bg-surface-800 rounded-lg p-0.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => void updatePreferences({ dashboard: { view_mode: 'grid' } })}
              aria-label="Kartenansicht"
              aria-pressed={viewMode === 'grid'}
              className={clsx(
                'p-2 rounded-md transition-all duration-200',
                viewMode === 'grid'
                  ? 'bg-white dark:bg-surface-700 text-primary-600 shadow-soft'
                  : 'text-surface-400 dark:text-surface-400 hover:text-surface-600 dark:hover:text-surface-200'
              )}
            >
              <Squares2X2Icon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => void updatePreferences({ dashboard: { view_mode: 'list' } })}
              aria-label="Listenansicht"
              aria-pressed={viewMode === 'list'}
              className={clsx(
                'p-2 rounded-md transition-all duration-200',
                viewMode === 'list'
                  ? 'bg-white dark:bg-surface-700 text-primary-600 shadow-soft'
                  : 'text-surface-400 dark:text-surface-400 hover:text-surface-600 dark:hover:text-surface-200'
              )}
            >
              <ListBulletIcon className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsEditMode(!isEditMode)}
            className={clsx(
              'h-9 px-3 rounded-lg transition-all duration-200 flex flex-shrink-0 items-center gap-2 text-sm font-medium',
              isEditMode
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                : 'bg-surface-100 dark:bg-surface-800 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200'
            )}
            aria-pressed={isEditMode}
          >
            <PencilIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{isEditMode ? 'Fertig' : 'Anpassen'}</span>
          </button>
        </div>
      </div>

      {isEditMode && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 dark:border-primary-800 dark:bg-primary-950/30">
          <Bars3Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
          <div>
            <p className="text-sm font-medium text-primary-800 dark:text-primary-200">
              Dashboard anpassen
            </p>
            <p className="mt-0.5 text-xs leading-5 text-primary-700/80 dark:text-primary-300/80">
              Ziehen Sie Module am Griff oder verschieben Sie sie mit den Pfeilen. Die Reihenfolge wird gespeichert.
            </p>
          </div>
        </div>
      )}

      {isLoading && !hasModules && modules.length === 0 ? (
        <DashboardModulesSkeleton viewMode={viewMode} />
      ) : sortedModules.length === 0 ? (
        <div className="empty-state">
          <FolderIcon className="empty-state-icon" />
          <h3 className="empty-state-title">Keine Module gefunden</h3>
          <p className="empty-state-text">Versuchen Sie, Ihre Suchkriterien zu ändern.</p>
        </div>
      ) : (
        <div
          className={clsx(
            'grid gap-4',
            viewMode === 'grid'
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : 'grid-cols-1'
          )}
        >
          {sortedModules.map((module, moduleIndex) => {
            const isHidden = hiddenModules.includes(module.name);
            const activeDropTarget = dropTarget?.moduleName === module.name && draggedModule !== module.name;
            const isVerticalLayout = viewMode === 'list' || window.innerWidth < 640;

            return (
              <div
                key={module.name}
                data-dashboard-module={module.name}
                className={clsx(
                  'card group relative transition-[opacity,transform,box-shadow] duration-150',
                  !isEditMode && 'card-hover',
                  viewMode === 'grid' ? 'p-5' : 'flex items-center gap-3 p-3 sm:gap-4 sm:p-4',
                  isEditMode && isHidden && 'opacity-50',
                  draggedModule === module.name && 'scale-[0.98] opacity-40',
                  dragSession.current?.moduleName === module.name && 'pointer-events-none'
                )}
                style={draggedModule === module.name && dragSession.current
                  ? { transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) scale(1.02)`, transition: 'none', zIndex: 20, willChange: 'transform', opacity: 0.85 }
                  : undefined}
                onDragOver={(event) => setDragTarget(event, module.name)}
                onDrop={(event) => handleDrop(event, module.name)}
                onDragEnd={() => {
                  setDraggedModule(null);
                  setDropTarget(null);
                }}
                onMouseEnter={() => warmModule(module)}
                onFocus={() => warmModule(module)}
                onClick={() => handleModuleClick(module)}
              >
                {activeDropTarget && (
                  <span
                    aria-hidden="true"
                    className={clsx(
                      'pointer-events-none absolute z-10 rounded-full bg-primary-500 shadow-[0_0_0_3px_rgba(14,165,233,0.15)]',
                      isVerticalLayout
                        ? 'left-2 right-2 h-1'
                        : 'bottom-2 top-2 w-1',
                      isVerticalLayout && dropTarget?.placement === 'before' && '-top-2',
                      isVerticalLayout && dropTarget?.placement === 'after' && '-bottom-2',
                      !isVerticalLayout && dropTarget?.placement === 'before' && '-left-2',
                      !isVerticalLayout && dropTarget?.placement === 'after' && '-right-2'
                    )}
                  />
                )}

                {viewMode === 'grid' ? (
                  <div className="flex min-h-[168px] flex-col items-center text-center">
                    {isEditMode && (
                      <button
                        type="button"
                        draggable
                        onDragStart={(event) => handleDragStart(event, module.name)}
                        onPointerDown={(event) => handlePointerDown(event, module.name)}
                        onDragEnd={() => {
                          setDraggedModule(null);
                          setDropTarget(null);
                        }}
                        onClick={(event) => event.stopPropagation()}
                        className="absolute right-3 top-3 touch-none rounded-lg p-1.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-primary-600 active:cursor-grabbing dark:hover:bg-surface-800 dark:hover:text-primary-400"
                        aria-label={`${module.name} greifen und ziehen, um die Reihenfolge zu ändern`}
                        title="Zum Sortieren ziehen"
                      >
                        <Bars3Icon className="h-5 w-5 cursor-grab" />
                      </button>
                    )}

                    <ModuleIcon name={module.name} logo={module.logo} color={module.color} size="grid" />
                    <h3 className="mt-4 text-sm font-medium text-surface-900 transition-colors group-hover:text-primary-600 dark:text-surface-100">
                      {module.name}
                    </h3>
                    {module.folders.length > 0 && (
                      <div className="mt-2 flex flex-wrap justify-center gap-1">
                        {module.folders.map((folder) => (
                          <span key={folder} className="badge badge-surface text-[11px]">{folder}</span>
                        ))}
                      </div>
                    )}
                    <span className="mt-2 text-[11px] font-medium text-surface-400">Modul</span>

                    {isEditMode && (
                      <div className="mt-auto flex w-full items-center gap-1 border-t border-surface-100 pt-3 dark:border-surface-800">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleHidden(module.name);
                          }}
                          className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-surface-500 transition-colors hover:bg-surface-100 hover:text-red-600 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-red-400"
                          aria-label={isHidden ? `${module.name} einblenden` : `${module.name} ausblenden`}
                        >
                          {isHidden ? <EyeIcon className="h-4 w-4" /> : <EyeSlashIcon className="h-4 w-4" />}
                          {isHidden ? 'Zeigen' : 'Ausblenden'}
                        </button>
                        {renderMoveControls(module, moduleIndex, false)}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {isEditMode && (
                      <button
                        type="button"
                        draggable
                        onDragStart={(event) => handleDragStart(event, module.name)}
                        onPointerDown={(event) => handlePointerDown(event, module.name)}
                        onDragEnd={() => {
                          setDraggedModule(null);
                          setDropTarget(null);
                        }}
                        onClick={(event) => event.stopPropagation()}
                        className="shrink-0 touch-none rounded-lg p-1.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-primary-600 active:cursor-grabbing dark:hover:bg-surface-800"
                        aria-label={`${module.name} greifen und ziehen, um die Reihenfolge zu ändern`}
                        title="Zum Sortieren ziehen"
                      >
                        <Bars3Icon className="h-5 w-5 cursor-grab" />
                      </button>
                    )}
                    <ModuleIcon name={module.name} logo={module.logo} color={module.color} size="list" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-medium text-surface-900 transition-colors group-hover:text-primary-600 dark:text-surface-100">
                          {module.name}
                        </h3>
                      </div>
                      {module.folders.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {module.folders.map((folder) => (
                            <span key={folder} className="badge badge-surface text-[11px]">{folder}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    {isEditMode && (
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleHidden(module.name);
                          }}
                          className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-100 hover:text-red-600 dark:hover:bg-surface-800 dark:hover:text-red-400"
                          aria-label={isHidden ? `${module.name} einblenden` : `${module.name} ausblenden`}
                        >
                          {isHidden ? <EyeIcon className="h-4 w-4" /> : <EyeSlashIcon className="h-4 w-4" />}
                        </button>
                        {renderMoveControls(module, moduleIndex, true)}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {externalModule && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setExternalModule(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="external-module-title"
            className="w-full max-w-md rounded-2xl border border-surface-200 bg-white p-6 shadow-soft-lg dark:border-surface-700 dark:bg-surface-900"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
                  <InformationCircleIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="external-module-title" className="item-title">
                    Externes Modul
                  </h2>
                  <p className="mt-1 text-sm leading-5 text-surface-600 dark:text-surface-300">
                    „{externalModule.name}“ würde eine externe Seite öffnen. In der Demo bleibt diese Seite geschlossen.
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Hinweis schließen"
                className="rounded-lg p-1.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800 dark:hover:text-surface-200"
                onClick={() => setExternalModule(null)}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 rounded-xl bg-surface-50 px-3 py-2.5 text-xs leading-5 text-surface-500 dark:bg-surface-800 dark:text-surface-300">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-surface-400 dark:text-surface-500">
                Zieladresse
              </span>
              <span className="break-all">{externalDestination}</span>
            </div>
            <div className="mt-6 flex justify-end">
              <button type="button" className="btn btn-primary" onClick={() => setExternalModule(null)}>
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
