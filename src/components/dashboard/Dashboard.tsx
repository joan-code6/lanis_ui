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
  ArrowTopRightOnSquareIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon,
  PencilIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { API_BASE_URL } from '../../services/api';
import clsx from 'clsx';
import ModuleIcon from './ModuleIcon';

interface CombinedModule {
  name: string;
  url: string;
  direct_url: string;
  proxy_app: boolean;
  color: string;
  logo: string;
  folders: string[];
  target: string;
}

const Dashboard: React.FC = () => {
  const { token } = useAuth();
  const { preferences, updatePreferences } = usePreferences();
  const navigate = useNavigate();
  const basePath = useBasePath();
  const [modules, setModules] = useState<CombinedModule[]>(() => {
    const cached = localStorage.getItem('modules_cache');
    return cached ? JSON.parse(cached) : [];
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [folders, setFolders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const viewMode = preferences.dashboard.view_mode;
  const [isEditMode, setIsEditMode] = useState(false);
  const pinnedModules = preferences.dashboard.pinned_modules;

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
    const abortController = new AbortController();
    loadModules(abortController.signal);
    return () => abortController.abort();
  }, [token]);

  const loadModules = async (signal?: AbortSignal) => {
    if (!token) return;
    setIsUpdating(true);
    try {
      setError('');
      const modulesResponse = await appsAPI.getModules(token, signal);
      if (signal?.aborted) return;
      if (modulesResponse.success) {
        setModules(modulesResponse.modules);
        localStorage.setItem('modules_cache', JSON.stringify(modulesResponse.modules));
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

  const handleModuleClick = (module: CombinedModule) => {
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
    const moduleLinks = `${module.url} ${module.direct_url || ''}`.toLowerCase();
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
    if (module.proxy_app) {
      const proxyUrl = `${API_BASE_URL}/app/${encodeURIComponent(module.name)}?token=${encodeURIComponent(token)}`;
      window.open(proxyUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    window.open(module.direct_url || module.url, '_blank', 'noopener,noreferrer');
  };

  const togglePin = (moduleName: string) => {
    const newPinned = pinnedModules.includes(moduleName)
      ? pinnedModules.filter(name => name !== moduleName)
      : [...pinnedModules, moduleName];
    void updatePreferences({ dashboard: { pinned_modules: newPinned } });
  };

  const filteredModules = modules.filter((module) => {
    const matchesSearch = module.name.toLowerCase().includes(searchTerm.toLowerCase());
    const moduleFolders = module.folders.map(f => f.trim());
    const matchesFolder = selectedFolder === 'all' || moduleFolders.includes(selectedFolder);
    return matchesSearch && matchesFolder;
  });

  const sortedModules = [...filteredModules].sort((a, b) => {
    const aPinned = pinnedModules.includes(a.name);
    const bPinned = pinnedModules.includes(b.name);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
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
              onClick={() => void updatePreferences({ dashboard: { view_mode: 'grid' } })}
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
              onClick={() => void updatePreferences({ dashboard: { view_mode: 'list' } })}
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
            onClick={() => setIsEditMode(!isEditMode)}
            className={clsx(
              'p-2 rounded-lg transition-all duration-200 flex-shrink-0',
              isEditMode
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                : 'bg-surface-100 dark:bg-surface-800 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200'
            )}
            title="Pinnen bearbeiten"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isEditMode && (
        <div className="mb-6 bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800 rounded-xl p-4">
          <p className="text-sm text-primary-700 dark:text-primary-300 font-medium">Bearbeitungsmodus aktiv — Klicken Sie auf einen Stern um Module zu pinnen</p>
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
          {sortedModules.map((module, index) => (
            <div
              key={index}
              className={clsx(
                'card card-hover group relative',
                viewMode === 'list' && 'flex items-center gap-4 p-4'
              )}
              onClick={() => handleModuleClick(module)}
            >
              {viewMode === 'grid' ? (
                <div className="flex flex-col items-center text-center">
                  <div className="relative">
                    <ModuleIcon name={module.name} logo={module.logo} color={module.color} size="grid" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-white dark:bg-surface-800 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-soft">
                      <ArrowTopRightOnSquareIcon className="w-2.5 h-2.5 text-surface-400" />
                    </div>
                    {isEditMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePin(module.name);
                        }}
                        className={clsx(
                          'absolute -top-1 -left-1 w-6 h-6 rounded-full flex items-center justify-center transition-all shadow-soft',
                          pinnedModules.includes(module.name)
                            ? 'bg-primary-500 text-white'
                            : 'bg-surface-200 dark:bg-surface-700 text-surface-500 hover:bg-primary-100 hover:text-primary-500'
                        )}
                      >
                        <StarIcon className={clsx('w-3.5 h-3.5', pinnedModules.includes(module.name) && 'fill-current')} />
                      </button>
                    )}
                  </div>
                  <h3 className="mt-4 font-medium text-surface-900 dark:text-surface-100 group-hover:text-primary-600 transition-colors text-sm">
                    {module.name}
                  </h3>
                  {module.folders.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 justify-center">
                      {module.folders.map((folder) => (
                        <span key={folder} className="badge badge-surface text-[11px]">
                          {folder}
                        </span>
                      ))}
                    </div>
                  )}
                  <span className="mt-2 text-[11px] text-surface-400 font-medium">Modul</span>
                </div>
                  ) : (
                <>
                  <ModuleIcon name={module.name} logo={module.logo} color={module.color} size="list" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-surface-900 dark:text-surface-100 group-hover:text-primary-600 transition-colors text-sm">
                      {module.name}
                    </h3>
                    {module.folders.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {module.folders.map((folder) => (
                          <span key={folder} className="badge badge-surface text-[11px]">
                            {folder}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {isEditMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePin(module.name);
                      }}
                      className={clsx(
                        'p-1.5 rounded-full transition-all',
                        pinnedModules.includes(module.name)
                          ? 'text-primary-500'
                          : 'text-surface-300 hover:text-primary-500'
                      )}
                    >
                      <StarIcon className={clsx('w-4 h-4', pinnedModules.includes(module.name) && 'fill-current')} />
                    </button>
                  )}
                  <ArrowTopRightOnSquareIcon className="w-4 h-4 text-surface-300 group-hover:text-primary-500 transition-colors flex-shrink-0" />
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
