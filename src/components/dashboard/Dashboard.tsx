import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { appsAPI } from '../../services/api';
import { Module } from '../../types';
import {
  FolderIcon,
  ArrowTopRightOnSquareIcon as ExternalLinkIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon as GridViewIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface CombinedModule {
  name: string;
  url: string;
  color: string;
  logo: string;
  folders: string[];
  target: string;
}

const Dashboard: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  // Cached modules state
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
      // Show cached state immediately, then update
      loadModules();
    }
    // eslint-disable-next-line
  }, [token]);

  const loadModules = async () => {
    if (!token) return;
    setIsUpdating(true);
    try {
      setError('');
      const modulesResponse = await appsAPI.getModules(token);
      if (modulesResponse.success) {
        setModules(modulesResponse.modules);
        localStorage.setItem('modules_cache', JSON.stringify(modulesResponse.modules));
        // Collect unique folder names as strings
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
    } catch (error) {
      console.error('Error loading modules:', error);
      setError('Fehler beim Laden der Module.');
    } finally {
      setIsLoading(false);
      setIsUpdating(false);
    }
  };

  const handleModuleClick = (module: CombinedModule) => {
    // Check if URL contains nachrichten.php or meinunterricht.php and navigate internally
    if (module.url.includes('/nachrichten.php')) {
      navigate('/messages');
      return;
    }
    if (module.url.includes('/meinunterricht.php')) {
      navigate('/courses');
      return;
    }
    // Open external links in a new tab
    window.open(module.url, '_blank', 'noopener,noreferrer');
  };

  const filteredModules = modules.filter((module) => {
    const matchesSearch = module.name.toLowerCase().includes(searchTerm.toLowerCase());
    // Defensive: sanitize folder names for comparison
    const moduleFolders = module.folders.map(f => f.trim());
    const matchesFolder = selectedFolder === 'all' || moduleFolders.includes(selectedFolder);
    return matchesSearch && matchesFolder;
  });

  const getModuleIcon = (logo: string, color: string) => {
    // Clean up logo string: remove newlines, extra spaces
    let trimmed = logo ? logo.replace(/\r?\n/g, '').replace(/\s+/g, ' ').trim() : '';
    
    // Normalize color (add # if missing for hex colors)
    let bgColor = color ? color.trim() : '#888888';
    if (bgColor && !bgColor.startsWith('#') && /^[0-9a-fA-F]{6}$/.test(bgColor)) {
      bgColor = '#' + bgColor;
    }

    // Map old Font Awesome 4 icons to Font Awesome 6 equivalents
    const iconMap: Record<string, string> = {
      'fa fa-files-o': 'fa-regular fa-copy',
      'fa fa-check-square-o': 'fa-regular fa-square-check',
      'glyphicon glyphicon-comment': 'fa-regular fa-comment',
      'glyphicon glyphicon-user': 'fa-regular fa-user',
      'glyphicon glyphicon-home': 'fa-solid fa-house',
      'glyphicon glyphicon-cog': 'fa-solid fa-gear',
      'glyphicon glyphicon-envelope': 'fa-regular fa-envelope',
      'glyphicon glyphicon-file': 'fa-regular fa-file',
      'glyphicon glyphicon-folder-open': 'fa-regular fa-folder-open',
      'glyphicon glyphicon-search': 'fa-solid fa-magnifying-glass',
      'glyphicon glyphicon-star': 'fa-regular fa-star',
      'glyphicon glyphicon-heart': 'fa-regular fa-heart',
      'glyphicon glyphicon-ok': 'fa-solid fa-check',
      'glyphicon glyphicon-remove': 'fa-solid fa-xmark',
      'glyphicon glyphicon-plus': 'fa-solid fa-plus',
      'glyphicon glyphicon-minus': 'fa-solid fa-minus',
      'glyphicon glyphicon-calendar': 'fa-regular fa-calendar',
      'glyphicon glyphicon-time': 'fa-regular fa-clock',
      'glyphicon glyphicon-pencil': 'fa-solid fa-pencil',
      'glyphicon glyphicon-trash': 'fa-regular fa-trash-can',
    };

    // Check if we need to map this icon
    if (iconMap[trimmed]) {
      trimmed = iconMap[trimmed];
    }

    // If we have a valid icon class, render it
    if (trimmed.length > 0) {
      return (
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl"
          style={{ backgroundColor: bgColor }}
        >
          <i className={trimmed} aria-hidden="true" />
        </div>
      );
    }
    
    // Fallback: show first letter of module name
    return (
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl font-bold"
        style={{ backgroundColor: bgColor }}
      >
        ?
      </div>
    );
  };

  // Show cached state immediately, but if no cached and loading, show skeleton
  if (isLoading && (!modules || modules.length === 0)) {
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
              <option key={folder} value={folder}>
                {folder}
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

      {/* Spinner indicator for updating */}
      {isUpdating && (
        <div className="flex items-center gap-2 px-4 py-2 text-primary-600">
          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 inline-block"></span>
          <span>Aktualisiere...</span>
        </div>
      )}
      {/* Modules grid/list */}
      {filteredModules.length === 0 ? (
        <div className="text-center py-12">
          <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Keine Module gefunden</h3>
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
          {filteredModules.map((module, index) => (
            <div
              key={index}
              className={clsx(
                'card card-hover group',
                viewMode === 'list' && 'flex items-center p-4'
              )}
              onClick={() => handleModuleClick(module)}
            >
              <div className={clsx('flex items-center', viewMode === 'grid' ? 'flex-col text-center' : 'flex-row')}>
                <div className={clsx('flex-shrink-0', viewMode === 'list' && 'mr-4')}>
                  {getModuleIcon(module.logo, module.color)}
                </div>
                <div className={clsx('flex-1', viewMode === 'grid' ? 'mt-4' : 'ml-0')}>
                  <h3 className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
                    {module.name}
                  </h3>
                  {module.folders.length > 0 && (
                    <div className={clsx('flex flex-wrap gap-1', viewMode === 'grid' ? 'mt-2 justify-center' : 'mt-1')}>
                      {module.folders.map((folder) => (
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
                    Modul
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