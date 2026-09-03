import React, { useState, useEffect } from 'react';
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
  StarIcon,
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
import { readModulesCache, writeModulesCache } from '../../utils/moduleCache';

type DropTarget = {
  moduleName: string;
  placement: 'before' | 'after';
};

const Dashboard: React.FC = () => {
  const { token, user } = useAuth();
  const { preferences, updatePreferences } = usePreferences();
  const navigate = useNavigate();
  const basePath = useBasePath();
  const [modules, setModules] = useState<Module[]>(() => readModulesCache(user));
  const [isUpdating, setIsUpdating] = useState(false);
  const [folders, setFolders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [externalModule, setExternalModule] = useState<Module | null>(null);
  const viewMode = preferences.dashboard.view_mode;
  const [isEditMode, setIsEditMode] = useState(false);
  const pinnedModules = preferences.dashboard.pinned_modules;
  const hiddenModules = preferences.dashboard.hidden_modules;
  const [draggedModule, setDraggedModule] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

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

  useEffect(() => {
    if (!token) return;
    setModules(readModulesCache(user));
    const abortController = new AbortController();
    loadModules(abortController.signal);
    return () => abortController.abort();
  }, [token, user?.school_id, user?.username]);

  const loadModules = async (signal?: AbortSignal) => {
    if (!token) return;
    setIsUpdating(true);
    try {
      setError('');
      const modulesResponse = await appsAPI.getModules(token, signal);
      if (signal?.aborted) return;
      if (modulesResponse.success) {
        setModules(modulesResponse.modules);
        writeModulesCache(user, modulesResponse.modules);
        const allFolders: string[] = [];
        modulesResponse.modules.forEach((module: Module) => {
          module.folders.forEach((folder) => {
            if (!allFolders.includes(folder)) {
              allFolders.push(folder);
            }
          });
        });
        setFolders(allFolders);
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
    const moduleLinks = `${module.url} ${module.direct_url || ''}`.toLowerCase();
    if (moduleLinks.includes('/dateispeicher.php') || module.name.toLowerCase().includes('dateispeicher')) {
      navigate(`${basePath}/dateispeicher`);
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

  const togglePin = (moduleName: string) => {
    const isPinned = pinnedModules.includes(moduleName);
    if (hiddenModules.includes(moduleName) && !isPinned) return;

    const newPinned = isPinned
      ? pinnedModules.filter(name => name !== moduleName)
      : [...pinnedModules, moduleName];
    void updatePreferences({ dashboard: { pinned_modules: newPinned } });
  };

  const movePinned = (moduleName: string, direction: -1 | 1) => {
    const fromIndex = pinnedModules.indexOf(moduleName);
    const toIndex = fromIndex + direction;
    if (fromIndex < 0 || toIndex < 0 || toIndex >= pinnedModules.length) return;

    const newPinned = [...pinnedModules];
    [newPinned[fromIndex], newPinned[toIndex]] = [newPinned[toIndex], newPinned[fromIndex]];
    void updatePreferences({ dashboard: { pinned_modules: newPinned } });
  };

  const toggleHidden = (moduleName: string) => {
    const newHidden = hiddenModules.includes(moduleName)
      ? hiddenModules.filter(name => name !== moduleName)
      : [...hiddenModules, moduleName];
    const newPinned = newHidden.includes(moduleName)
      ? pinnedModules.filter(name => name !== moduleName)
      : pinnedModules;
    void updatePreferences({ dashboard: { hidden_modules: newHidden, pinned_modules: newPinned } });
  };

  const handleDragStart = (event: React.DragEvent, moduleName: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', moduleName);
    setDraggedModule(moduleName);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>, targetName: string) => {
    if (!draggedModule || draggedModule === targetName || !pinnedModules.includes(targetName)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const bounds = event.currentTarget.getBoundingClientRect();
    const placement = viewMode === 'list'
      ? event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after'
      : event.clientX < bounds.left + bounds.width / 2 ? 'before' : 'after';
    setDropTarget({ moduleName: targetName, placement });
  };

  const handleDrop = (event: React.DragEvent, targetName: string) => {
    event.preventDefault();
    const sourceName = draggedModule || event.dataTransfer.getData('text/plain');
    const placement = dropTarget?.moduleName === targetName ? dropTarget.placement : 'before';
    if (!sourceName || sourceName === targetName) return;

    const newPinned = pinnedModules.filter(name => name !== sourceName);
    const targetIndex = newPinned.indexOf(targetName);
    if (targetIndex < 0) return;
    newPinned.splice(targetIndex + (placement === 'after' ? 1 : 0), 0, sourceName);
    void updatePreferences({ dashboard: { pinned_modules: newPinned } });
    setDraggedModule(null);
    setDropTarget(null);
  };

  const filteredModules = modules.filter((module) => {
    if (!isEditMode && hiddenModules.includes(module.name)) return false;
    const matchesSearch = module.name.toLowerCase().includes(searchTerm.toLowerCase());
    const moduleFolders = module.folders.map(f => f.trim());
    const matchesFolder = selectedFolder === 'all' || moduleFolders.includes(selectedFolder);
    return matchesSearch && matchesFolder;
  });

  const sortedModules = [...filteredModules].sort((a, b) => {
    const aHidden = hiddenModules.includes(a.name);
    const bHidden = hiddenModules.includes(b.name);
    if (isEditMode && aHidden !== bHidden) return aHidden ? 1 : -1;
    const aPinned = pinnedModules.includes(a.name);
    const bPinned = pinnedModules.includes(b.name);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    if (aPinned && bPinned) {
      return pinnedModules.indexOf(a.name) - pinnedModules.indexOf(b.name);
    }
    return 0;
  });

  if (isLoading && (!modules || modules.length === 0)) {
    return (
      <div className="p-6">
        <div className="space-y-6">
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-4 w-72" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <SEO
        title="Dashboard"
        description="Lanis Dashboard — Deine persönliche Übersicht über alle Apps und Module des Schulportal Hessen."
        path="/dashboard"
        noindex
      />
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Alle verfügbaren Apps und Module</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm animate-scale-in">
          {error}
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between">
        <div className="flex-1 max-w-sm lg:max-w-md relative w-full min-w-0">
          <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
          <input
            type="text"
            placeholder="Apps und Module durchsuchen..."
            className="input pl-10 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            className="input text-sm flex-1 min-w-0 sm:flex-none sm:w-auto sm:max-w-[200px]"
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
          <StarIcon className="mt-0.5 h-4 w-4 shrink-0 fill-current text-primary-500" />
          <div>
            <p className="text-sm font-medium text-primary-800 dark:text-primary-200">
              {pinnedModules.length} {pinnedModules.length === 1 ? 'Favorit' : 'Favoriten'} zuerst
            </p>
            <p className="mt-0.5 text-xs leading-5 text-primary-700/80 dark:text-primary-300/80">
              Favoriten lassen sich am Griff ziehen. Die Pfeile funktionieren auch auf Touch-Geräten und mit der Tastatur.
            </p>
          </div>
        </div>
      )}

      {sortedModules.length === 0 ? (
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
          {sortedModules.map((module) => {
            const isPinned = pinnedModules.includes(module.name);
            const isHidden = hiddenModules.includes(module.name);
            const pinnedIndex = pinnedModules.indexOf(module.name);
            const activeDropTarget = dropTarget?.moduleName === module.name && draggedModule !== module.name;

            return (
              <div
                key={module.name}
                className={clsx(
                  'card group relative transition-[opacity,transform,box-shadow] duration-150',
                  !isEditMode && 'card-hover',
                  viewMode === 'grid' ? 'p-5' : 'flex items-center gap-3 p-3 sm:gap-4 sm:p-4',
                  isEditMode && isHidden && 'opacity-50',
                  draggedModule === module.name && 'scale-[0.98] opacity-40'
                )}
                onDragOver={(event) => handleDragOver(event, module.name)}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropTarget(null);
                }}
                onDrop={(event) => handleDrop(event, module.name)}
                onClick={() => handleModuleClick(module)}
              >
                {activeDropTarget && (
                  <span
                    aria-hidden="true"
                    className={clsx(
                      'pointer-events-none absolute z-10 rounded-full bg-primary-500 shadow-[0_0_0_3px_rgba(14,165,233,0.15)]',
                      viewMode === 'list'
                        ? 'left-3 right-3 h-0.5'
                        : 'bottom-3 top-3 w-0.5',
                      viewMode === 'list' && dropTarget?.placement === 'before' && '-top-2',
                      viewMode === 'list' && dropTarget?.placement === 'after' && '-bottom-2',
                      viewMode === 'grid' && dropTarget?.placement === 'before' && '-left-2',
                      viewMode === 'grid' && dropTarget?.placement === 'after' && '-right-2'
                    )}
                  />
                )}

                {viewMode === 'grid' ? (
                  <div className="flex min-h-[168px] flex-col items-center text-center">
                    {isPinned && (
                      <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-primary-50 px-2 py-1 text-[10px] font-semibold text-primary-700 dark:bg-primary-950/50 dark:text-primary-300">
                        <StarIcon className="h-3 w-3 fill-current" />
                        Favorit
                      </span>
                    )}
                    {isEditMode && isPinned && (
                      <button
                        type="button"
                        draggable
                        onDragStart={(event) => handleDragStart(event, module.name)}
                        onDragEnd={() => {
                          setDraggedModule(null);
                          setDropTarget(null);
                        }}
                        onClick={(event) => event.stopPropagation()}
                        className="absolute right-3 top-3 rounded-lg p-1.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-primary-600 active:cursor-grabbing dark:hover:bg-surface-800 dark:hover:text-primary-400"
                        aria-label={`${module.name} ziehen, um die Reihenfolge zu ändern`}
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
                            togglePin(module.name);
                          }}
                          disabled={isHidden && !isPinned}
                          className={clsx(
                            'flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors',
                            isPinned
                              ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300'
                              : 'text-surface-500 hover:bg-surface-100 hover:text-primary-600 disabled:opacity-30 dark:text-surface-400 dark:hover:bg-surface-800'
                          )}
                          aria-label={isPinned ? `${module.name} aus Favoriten entfernen` : `${module.name} zu Favoriten hinzufügen`}
                        >
                          <StarIcon className={clsx('h-4 w-4', isPinned && 'fill-current')} />
                          Favorit
                        </button>
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
                        {isPinned && (
                          <div className="ml-auto flex items-center rounded-lg bg-surface-100 p-0.5 dark:bg-surface-800">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                movePinned(module.name, -1);
                              }}
                              disabled={pinnedIndex === 0}
                              className="rounded-md p-1 text-surface-500 hover:bg-white hover:text-primary-600 disabled:opacity-25 dark:hover:bg-surface-700"
                              aria-label={`${module.name} nach vorne verschieben`}
                            >
                              <ChevronLeftIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                movePinned(module.name, 1);
                              }}
                              disabled={pinnedIndex === pinnedModules.length - 1}
                              className="rounded-md p-1 text-surface-500 hover:bg-white hover:text-primary-600 disabled:opacity-25 dark:hover:bg-surface-700"
                              aria-label={`${module.name} nach hinten verschieben`}
                            >
                              <ChevronRightIcon className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {isEditMode && isPinned && (
                      <button
                        type="button"
                        draggable
                        onDragStart={(event) => handleDragStart(event, module.name)}
                        onDragEnd={() => {
                          setDraggedModule(null);
                          setDropTarget(null);
                        }}
                        onClick={(event) => event.stopPropagation()}
                        className="shrink-0 rounded-lg p-1.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-primary-600 active:cursor-grabbing dark:hover:bg-surface-800"
                        aria-label={`${module.name} ziehen, um die Reihenfolge zu ändern`}
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
                        {isPinned && (
                          <StarIcon className="h-3.5 w-3.5 shrink-0 fill-current text-primary-500" aria-label="Favorit" />
                        )}
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
                            togglePin(module.name);
                          }}
                          disabled={isHidden && !isPinned}
                          className={clsx(
                            'rounded-lg p-2 transition-colors',
                            isPinned
                              ? 'bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-300'
                              : 'text-surface-400 hover:bg-surface-100 hover:text-primary-600 disabled:opacity-30 dark:hover:bg-surface-800'
                          )}
                          aria-label={isPinned ? `${module.name} aus Favoriten entfernen` : `${module.name} zu Favoriten hinzufügen`}
                        >
                          <StarIcon className={clsx('h-4 w-4', isPinned && 'fill-current')} />
                        </button>
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
                        {isPinned && (
                          <div className="ml-1 flex items-center rounded-lg bg-surface-100 p-0.5 dark:bg-surface-800">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                movePinned(module.name, -1);
                              }}
                              disabled={pinnedIndex === 0}
                              className="rounded-md p-1 text-surface-500 hover:bg-white hover:text-primary-600 disabled:opacity-25 dark:hover:bg-surface-700"
                              aria-label={`${module.name} nach oben verschieben`}
                            >
                              <ChevronUpIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                movePinned(module.name, 1);
                              }}
                              disabled={pinnedIndex === pinnedModules.length - 1}
                              className="rounded-md p-1 text-surface-500 hover:bg-white hover:text-primary-600 disabled:opacity-25 dark:hover:bg-surface-700"
                              aria-label={`${module.name} nach unten verschieben`}
                            >
                              <ChevronDownIcon className="h-4 w-4" />
                            </button>
                          </div>
                        )}
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
                  <h2 id="external-module-title" className="text-base font-semibold text-surface-900 dark:text-surface-100">
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
