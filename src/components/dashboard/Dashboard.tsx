import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { appsAPI } from '../../services/api';
import { AppEntry, Module, AppFolder } from '../../types';
import {
  FolderIcon,
  ArrowTopRightOnSquareIcon as ExternalLinkIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon as GridViewIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface CombinedApp {
  name: string;
  url: string;
  color: string;
  logo: string;
  folders: string[];
  target: string;
  type: 'app' | 'module';
}

const Dashboard: React.FC = () => {
  const { token } = useAuth();
  const [apps, setApps] = useState<CombinedApp[]>([]);
  const [folders, setFolders] = useState<AppFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Early return if no token
  if (!token) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Nicht authentifiziert</h3>
          <p className="text-gray-500">Bitte melden Sie sich an, um das Dashboard zu sehen.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (token) {
      loadAppsAndModules();
    }
  }, [token]);

  const loadAppsAndModules = async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      setError('');

      // Load both apps and modules
      const [appsResponse, modulesResponse] = await Promise.all([
        appsAPI.getApps(token),
        appsAPI.getModules(token),
      ]);

      // Combine apps and modules
      const combinedApps: CombinedApp[] = [];

      // Add apps
      if (appsResponse.success) {
        setFolders(appsResponse.data.folders);
        appsResponse.data.entrys.forEach((app: AppEntry) => {
          combinedApps.push({
            name: app.Name,
            url: app.link,
            color: app.Farbe,
            logo: app.Logo,
            folders: app.Ordner,
            target: app.target,
            type: 'app',
          });
        });
      }

      // Add modules
      if (modulesResponse.success) {
        modulesResponse.modules.forEach((module: Module) => {
          combinedApps.push({
            name: module.name,
            url: module.url,
            color: module.color,
            logo: module.logo,
            folders: module.folders,
            target: module.target,
            type: 'module',
          });
        });
      }

      setApps(combinedApps);
    } catch (error) {
      console.error('Error loading apps and modules:', error);
      setError('Fehler beim Laden der Apps und Module.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppClick = (app: CombinedApp) => {
    if (app.url.includes('start.schulportal.hessen.de')) {
      // Handle internal module - you can implement routing here later
      console.log('Internal module:', app.url);
      // For now, open in new tab
      window.open(app.url, '_blank');
    } else {
      // External link
      const target = app.target === '_blank' ? '_blank' : '_self';
      window.open(app.url, target);
    }
  };

  const filteredApps = apps.filter((app) => {
    const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFolder = selectedFolder === 'all' || app.folders.includes(selectedFolder);
    return matchesSearch && matchesFolder;
  });

  const getAppIcon = (logo: string, color: string) => {
    // This is a simplified version - you might want to map specific icons
    return (
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl font-bold"
        style={{ backgroundColor: color }}
      >
        {logo.charAt(0).toUpperCase()}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-300 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-300 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Alle verfügbaren Apps und Module</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Search and filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex-1 max-w-lg relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Apps und Module durchsuchen..."
            className="input pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-4">
          {/* Folder filter */}
          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            className="input"
          >
            <option value="all">Alle Ordner</option>
            {folders.map((folder) => (
              <option key={folder.name} value={folder.name}>
                {folder.name}
              </option>
            ))}
          </select>

          {/* View mode toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={clsx(
                'p-2 rounded-md transition-colors',
                viewMode === 'grid'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <GridViewIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={clsx(
                'p-2 rounded-md transition-colors',
                viewMode === 'list'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <ListBulletIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Apps grid/list */}
      {filteredApps.length === 0 ? (
        <div className="text-center py-12">
          <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Keine Apps gefunden</h3>
          <p className="mt-1 text-sm text-gray-500">
            Versuchen Sie, Ihre Suchkriterien zu ändern.
          </p>
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
          {filteredApps.map((app, index) => (
            <div
              key={index}
              className={clsx(
                'card card-hover group',
                viewMode === 'list' && 'flex items-center p-4'
              )}
              onClick={() => handleAppClick(app)}
            >
              <div className={clsx('flex items-center', viewMode === 'grid' ? 'flex-col text-center' : 'flex-row')}>
                <div className={clsx('flex-shrink-0', viewMode === 'list' && 'mr-4')}>
                  {getAppIcon(app.logo, app.color)}
                </div>
                
                <div className={clsx('flex-1', viewMode === 'grid' ? 'mt-4' : 'ml-0')}>
                  <h3 className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
                    {app.name}
                  </h3>
                  
                  {app.folders.length > 0 && (
                    <div className={clsx('flex flex-wrap gap-1', viewMode === 'grid' ? 'mt-2 justify-center' : 'mt-1')}>
                      {app.folders.map((folder) => (
                        <span
                          key={folder}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
                        >
                          {folder}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className={clsx('text-xs text-gray-500', viewMode === 'grid' ? 'mt-2' : 'mt-1')}>
                    {app.type === 'module' ? 'Modul' : 'App'}
                  </div>
                </div>

                {viewMode === 'list' && (
                  <div className="flex-shrink-0 ml-4">
                    <ExternalLinkIcon className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;