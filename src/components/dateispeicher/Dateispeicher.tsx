import React, { FormEvent, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  FolderIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { dateispeicherAPI } from '../../services/api';
import {
  DateispeicherFile,
  DateispeicherFolder,
  DateispeicherNodeResponse,
} from '../../types';
import SEO from '../seo/SEO';

interface Breadcrumb {
  id: number;
  name: string;
  navigable?: boolean;
}

interface SearchCollections {
  files: DateispeicherFile[];
  folders: DateispeicherFolder[];
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function toId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function toParentId(value: unknown): number | undefined {
  const id = Number(value);
  return Number.isInteger(id) && id >= 0 ? id : undefined;
}

function toFile(value: unknown): DateispeicherFile | null {
  const record = recordValue(value);
  if (!record) return null;
  const id = toId(record.id ?? record.file_id);
  const name = String(record.name ?? record.filename ?? '').trim();
  if (id === null || !name) return null;
  return {
    id,
    name,
    download_url: typeof record.download_url === 'string' ? record.download_url : undefined,
    changed: typeof record.changed === 'string' ? record.changed : undefined,
    size: typeof record.size === 'string' ? record.size : undefined,
    note: typeof record.note === 'string' ? record.note : null,
    parent_folder_id: toParentId(record.parent_folder_id ?? record.folder_id),
  };
}

function toFolder(value: unknown): DateispeicherFolder | null {
  const record = recordValue(value);
  if (!record) return null;
  const id = toId(record.id ?? record.folder_id);
  const name = String(record.name ?? record.caption ?? '').trim();
  if (id === null || !name) return null;
  return {
    id,
    name,
    subfolders: Number(record.subfolders ?? record.folder_count ?? 0) || 0,
    description: typeof record.description === 'string' ? record.description : undefined,
    parent_folder_id: toParentId(record.parent_folder_id),
  };
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function classifySearchItems(values: unknown[]): SearchCollections {
  const files: DateispeicherFile[] = [];
  const folders: DateispeicherFolder[] = [];
  for (const item of values) {
    const itemRecord = recordValue(item);
    const isFile = Boolean(itemRecord && (
      'file_id' in itemRecord || 'download_url' in itemRecord || itemRecord.type === 'file'
    ));
    const isFolder = Boolean(itemRecord && !isFile && (
      'subfolders' in itemRecord || 'folder_id' in itemRecord || itemRecord.type === 'folder'
    ));
    if (isFolder) {
      const folder = toFolder(item);
      if (folder) folders.push(folder);
    } else {
      const file = toFile(item);
      if (file) files.push(file);
    }
  }
  return { files, folders };
}

function normaliseSearchResults(raw: unknown): SearchCollections {
  const record = recordValue(raw);
  if (Array.isArray(raw)) return classifySearchItems(raw);
  if (!record) return { files: [], folders: [] };

  const fileValues = asArray(record.files);
  const folderValues = asArray(record.folders);
  const mixedValues = record.files == null ? asArray(record.items ?? record.results) : [];
  const mixedCollections = classifySearchItems(mixedValues);
  return {
    files: [
      ...fileValues.map(toFile).filter((file): file is DateispeicherFile => file !== null),
      ...mixedCollections.files,
    ],
    folders: [
      ...folderValues.map(toFolder).filter((folder): folder is DateispeicherFolder => folder !== null),
      ...mixedCollections.folders,
    ],
  };
}

const Dateispeicher: React.FC = () => {
  const { token } = useAuth();
  const [node, setNode] = useState<DateispeicherNodeResponse | null>(null);
  const [folderId, setFolderId] = useState(0);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ id: 0, name: 'Dateispeicher' }]);
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchCollections | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [folderError, setFolderError] = useState('');
  const [searchError, setSearchError] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [searchKey, setSearchKey] = useState(0);
  const forceFolderRefresh = useRef(false);
  const forceSearchRefresh = useRef(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const refresh = forceFolderRefresh.current;
    forceFolderRefresh.current = false;
    setLoading(true);
    setFolderError('');
    setDownloadError('');
    setNode(null);
    dateispeicherAPI.getNode(token, folderId, refresh, controller.signal)
      .then(response => {
        if (!response.success) throw new Error(response.error || 'Der Dateispeicher konnte nicht geladen werden.');
        setNode(response);
      })
      .catch(err => {
        if (axios.isCancel(err)) return;
        setFolderError(err instanceof Error ? err.message : 'Der Dateispeicher konnte nicht geladen werden.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [token, folderId, reloadKey]);

  useEffect(() => {
    if (!token || !submittedQuery) {
      setSearchResults(null);
      setSearching(false);
      return undefined;
    }

    const controller = new AbortController();
    const refresh = forceSearchRefresh.current;
    forceSearchRefresh.current = false;
    setSearching(true);
    setSearchError('');
    setDownloadError('');
    setSearchResults(null);
    dateispeicherAPI.search(token, submittedQuery, refresh, controller.signal)
      .then(response => {
        if (!response.success) throw new Error(response.error || 'Die Dateisuche konnte nicht durchgeführt werden.');
        setSearchResults(normaliseSearchResults(response.results));
      })
      .catch(err => {
        if (axios.isCancel(err)) return;
        setSearchResults(null);
        setSearchError(err instanceof Error ? err.message : 'Die Dateisuche konnte nicht durchgeführt werden.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setSearching(false);
      });

    return () => controller.abort();
  }, [token, submittedQuery, searchKey]);

  const isSearchMode = submittedQuery.length > 0;

  const openFolder = (folder: DateispeicherFolder) => {
    const existingIndex = breadcrumbs.findIndex(item => item.id === folder.id);
    const parentIndex = typeof folder.parent_folder_id === 'number'
      ? breadcrumbs.findIndex(item => item.id === folder.parent_folder_id)
      : -1;
    const nextBreadcrumbs = existingIndex >= 0
      ? breadcrumbs.slice(0, existingIndex + 1)
      : parentIndex >= 0
        ? [...breadcrumbs.slice(0, parentIndex + 1), { id: folder.id, name: folder.name }]
        : isSearchMode
          ? [
            { id: 0, name: 'Dateispeicher' },
            { id: -1, name: '…', navigable: false },
            { id: folder.id, name: folder.name },
          ]
          : [...breadcrumbs, { id: folder.id, name: folder.name }];
    setBreadcrumbs(nextBreadcrumbs);
    setFolderId(folder.id);
    setSubmittedQuery('');
    setSearchResults(null);
  };

  const openBreadcrumb = (breadcrumb: Breadcrumb, index: number) => {
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    setFolderId(breadcrumb.id);
    setSubmittedQuery('');
    setSearchResults(null);
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const value = query.trim();
    setSubmittedQuery(value);
    setSearchKey(key => key + 1);
  };

  const clearSearch = () => {
    setQuery('');
    setSubmittedQuery('');
    setSearchResults(null);
    setSearchError('');
    setDownloadError('');
  };

  const downloadFile = async (file: DateispeicherFile) => {
    if (!token) return;
    setDownloadingId(file.id);
    setDownloadError('');
    try {
      const blob = await dateispeicherAPI.downloadFile(token, file.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      if (axios.isCancel(err)) return;
      setDownloadError(err instanceof Error ? err.message : 'Die Datei konnte nicht heruntergeladen werden.');
    } finally {
      setDownloadingId(null);
    }
  };

  const visibleFolders = isSearchMode ? (searchResults?.folders || []) : (node?.folders || []);
  const visibleFiles = isSearchMode ? (searchResults?.files || []) : (node?.files || []);
  const busy = isSearchMode ? searching : loading;
  const requestError = isSearchMode ? searchError : folderError;
  const visibleError = downloadError || requestError;

  if (!token) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100">Nicht authentifiziert</h3>
          <p className="text-surface-500">Bitte melden Sie sich an, um den Dateispeicher zu sehen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <SEO title="Dateispeicher" description="Deine Dateien aus dem nativen Dateispeicher des Schulportal Hessen." noindex />
      <div className="mx-auto max-w-7xl">
        <header className="mb-4 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-white sm:text-3xl">Dateispeicher</h1>
            <p className="mt-1.5 text-sm text-surface-500 dark:text-surface-400">Dateien und Ordner direkt aus dem Schulportal Hessen</p>
          </div>
          <button
            type="button"
            className="btn btn-secondary self-start"
            onClick={() => {
              if (isSearchMode) {
                forceSearchRefresh.current = true;
                setSearchKey(value => value + 1);
              } else {
                forceFolderRefresh.current = true;
                setReloadKey(value => value + 1);
              }
            }}
            disabled={busy}
          >
            <ArrowPathIcon className={`mr-2 h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
            Aktualisieren
          </button>
        </header>

        <form onSubmit={submitSearch} className="mb-5 flex gap-2">
          <div className="relative min-w-0 flex-1">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <input
              type="search"
              className="input pl-10 text-sm"
              placeholder="Dateien und Ordner durchsuchen …"
              value={query}
              onChange={event => setQuery(event.target.value)}
              aria-label="Dateispeicher durchsuchen"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={!query.trim() || searching}>
            {searching ? <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" /> : <MagnifyingGlassIcon className="mr-2 h-4 w-4" />}
            Suchen
          </button>
        </form>

        {isSearchMode ? (
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Suchergebnisse für <span className="font-medium text-surface-800 dark:text-surface-200">„{submittedQuery}“</span>
            </p>
            <button type="button" className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400" onClick={clearSearch}>
              Suche schließen
            </button>
          </div>
        ) : (
          <nav aria-label="Ordnerpfad" className="mb-5 flex items-center gap-1 overflow-x-auto text-sm">
            {breadcrumbs.map((breadcrumb, index) => (
              <React.Fragment key={`${breadcrumb.id}-${index}`}>
                {index > 0 && <ChevronRightIcon className="h-4 w-4 shrink-0 text-surface-300" />}
                {breadcrumb.navigable === false ? (
                  <span className="shrink-0 px-1 text-surface-400" aria-label="Weitere übergeordnete Ordner">
                    {breadcrumb.name}
                  </span>
                ) : (
                  <button
                    type="button"
                    className={`shrink-0 rounded-md px-2 py-1 ${index === breadcrumbs.length - 1 ? 'font-semibold text-surface-900 dark:text-white' : 'text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-950/40'}`}
                    onClick={() => openBreadcrumb(breadcrumb, index)}
                  >
                    {breadcrumb.name}
                  </button>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        {visibleError && (
          <div className="card mb-5 border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {visibleError}
          </div>
        )}

        {busy ? (
          <div className="card flex min-h-64 items-center justify-center">
            <div className="text-center text-surface-500">
              <ArrowPathIcon className="mx-auto mb-3 h-7 w-7 animate-spin text-primary-500" />
              {isSearchMode ? 'Dateispeicher wird durchsucht …' : 'Dateispeicher wird geladen …'}
            </div>
          </div>
        ) : (
          <>
            {visibleFolders.length > 0 && (
              <section className="mb-6">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">Ordner</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleFolders.map(folder => (
                    <button
                      key={folder.id}
                      type="button"
                      className="card flex items-start gap-3 text-left transition-colors hover:border-primary-300 hover:bg-primary-50/40 dark:hover:border-primary-700 dark:hover:bg-primary-950/20"
                      onClick={() => openFolder(folder)}
                    >
                      <FolderIcon className="mt-0.5 h-6 w-6 shrink-0 text-primary-600 dark:text-primary-400" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-surface-900 dark:text-white">{folder.name}</span>
                        {folder.description && <span className="mt-1 block text-sm text-surface-500 dark:text-surface-400">{folder.description}</span>}
                        {folder.subfolders > 0 && <span className="mt-1 block text-xs text-surface-400">{folder.subfolders} Unterordner</span>}
                      </span>
                      <ChevronRightIcon className="h-5 w-5 shrink-0 text-surface-300" />
                    </button>
                  ))}
                </div>
              </section>
            )}

            {visibleFiles.length > 0 ? (
              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">Dateien</h2>
                <div className="space-y-3">
                  {visibleFiles.map(file => (
                    <article key={`${file.id}-${file.parent_folder_id || ''}`} className="card flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-950/40">
                        <DocumentTextIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words font-semibold text-surface-900 dark:text-white">{file.name}</h3>
                        {file.note && <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">{file.note}</p>}
                        {(file.changed || file.size) && (
                          <p className="mt-1 text-xs text-surface-400 dark:text-surface-500">
                            {[file.changed, file.size].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary shrink-0 !px-3"
                        onClick={() => void downloadFile(file)}
                        disabled={downloadingId === file.id}
                        title={`${file.name} herunterladen`}
                      >
                        <ArrowDownTrayIcon className={`h-5 w-5 ${downloadingId === file.id ? 'animate-bounce' : ''}`} />
                        <span className="sr-only">Herunterladen</span>
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            ) : visibleFolders.length === 0 && !requestError ? (
              <div className="card flex min-h-64 flex-col items-center justify-center text-center">
                <FolderIcon className="mb-3 h-10 w-10 text-surface-300" />
                <h2 className="font-semibold text-surface-900 dark:text-white">Keine Dateien gefunden</h2>
                <p className="mt-1 max-w-md text-sm text-surface-500 dark:text-surface-400">
                  {isSearchMode ? 'Für diese Suche wurden keine Dateien oder Ordner gefunden.' : 'In diesem Ordner sind derzeit keine Dateien hinterlegt.'}
                </p>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

export default Dateispeicher;
