import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  DocumentTextIcon,
  InboxArrowDownIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { dateiverteilungAPI } from '../../services/api';
import type { DateiverteilungDistribution, DateiverteilungFile } from '../../types';
import SEO from '../seo/SEO';

type Filter = 'all' | 'unread';

function searchableText(distribution: DateiverteilungDistribution): string {
  return [
    distribution.title,
    distribution.description,
    distribution.source,
    distribution.created_at,
    ...distribution.files.map(file => file.name),
  ].filter(Boolean).join(' ').toLocaleLowerCase('de-DE');
}

function sourceInitial(source: string): string {
  return (source.trim()[0] || 'S').toLocaleUpperCase('de-DE');
}

const Dateiverteilung: React.FC = () => {
  const { token } = useAuth();
  const [distributions, setDistributions] = useState<DateiverteilungDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [reloadKey, setReloadKey] = useState(0);
  const [downloading, setDownloading] = useState('');
  const forceRefresh = useRef(false);
  const downloadController = useRef<AbortController | null>(null);

  useEffect(() => () => downloadController.current?.abort(), []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    const refresh = forceRefresh.current;
    forceRefresh.current = false;
    setLoading(true);
    setError('');

    dateiverteilungAPI.getOverview(token, refresh, controller.signal)
      .then(response => {
        if (!response.success) {
          throw new Error(response.error || 'Die Dateiverteilung konnte nicht geladen werden.');
        }
        setDistributions(Array.isArray(response.distributions) ? response.distributions : []);
      })
      .catch(cause => {
        if (axios.isCancel(cause)) return;
        setError(cause instanceof Error ? cause.message : 'Die Dateiverteilung konnte nicht geladen werden.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey, token]);

  const visibleGroups = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('de-DE');
    const visible = distributions.filter(distribution => (
      (filter === 'all' || distribution.unread)
      && (!needle || searchableText(distribution).includes(needle))
    ));
    const groups = new Map<string, DateiverteilungDistribution[]>();
    for (const distribution of visible) {
      const source = distribution.source?.trim() || 'Schulportal';
      groups.set(source, [...(groups.get(source) || []), distribution]);
    }
    return [...groups.entries()];
  }, [distributions, filter, query]);

  const unreadCount = distributions.filter(item => item.unread).length;
  const fileCount = distributions.reduce((count, item) => count + item.files.length, 0);

  const downloadFile = async (distribution: DateiverteilungDistribution, file: DateiverteilungFile) => {
    if (!token || downloading) return;
    const key = `${distribution.id}:${file.id}`;
    const controller = new AbortController();
    downloadController.current = controller;
    setDownloading(key);
    setError('');
    try {
      const blob = await dateiverteilungAPI.downloadFile(token, file.download_url, controller.signal);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (cause) {
      if (axios.isCancel(cause)) return;
      setError(cause instanceof Error ? cause.message : 'Die Datei konnte nicht heruntergeladen werden.');
    } finally {
      if (downloadController.current === controller) {
        downloadController.current = null;
        setDownloading('');
      }
    }
  };

  if (!token) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-lg font-semibold text-surface-900 dark:text-white">Nicht authentifiziert</h1>
        <p className="mt-1 text-surface-500 dark:text-surface-400">Bitte melde dich an, um verteilte Dateien zu sehen.</p>
      </div>
    );
  }

  return (
    <div className="min-h-full px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <SEO title="Dateiverteilung" description="Persönlich und zielgruppengerecht verteilte Dateien aus dem Schulportal Hessen." noindex />
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-700 dark:text-primary-300">
                <InboxArrowDownIcon className="h-4 w-4" />
                Für dich verteilt
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-surface-950 dark:text-white sm:text-3xl">Dateiverteilung</h1>
              <p className="mt-1.5 max-w-2xl text-sm text-surface-500 dark:text-surface-400">
                Finde Elternbriefe, persönliche Dokumente und Zugänge dort, woher sie kommen.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary self-start"
              onClick={() => {
                forceRefresh.current = true;
                setReloadKey(value => value + 1);
              }}
              disabled={loading}
            >
              <ArrowPathIcon className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Aktualisieren
            </button>
          </div>

          <div className="mt-5 grid gap-3 rounded-2xl border border-surface-200 bg-white p-3 shadow-soft dark:border-surface-800 dark:bg-surface-900 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <label className="relative block">
              <span className="sr-only">Verteilte Dateien durchsuchen</span>
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              <input
                type="search"
                className="input !border-transparent !bg-surface-50 pl-10 text-sm focus:!border-primary-400 dark:!bg-surface-950"
                placeholder="Titel, Absender oder Datei suchen …"
                value={query}
                onChange={event => setQuery(event.target.value)}
              />
            </label>
            <div className="flex rounded-xl bg-surface-100 p-1 dark:bg-surface-800" aria-label="Dateiverteilung filtern">
              {(['all', 'unread'] as const).map(value => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/50 ${filter === value ? 'bg-white text-surface-900 shadow-sm dark:bg-surface-700 dark:text-white' : 'text-surface-500 hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-200'}`}
                  aria-pressed={filter === value}
                >
                  {value === 'all' ? `Alle ${distributions.length}` : `Neu ${unreadCount}`}
                </button>
              ))}
            </div>
          </div>
        </header>

        {error && (
          <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="card flex min-h-64 items-center justify-center">
            <div className="text-center text-sm text-surface-500 dark:text-surface-400">
              <ArrowPathIcon className="mx-auto mb-3 h-7 w-7 animate-spin text-primary-500" />
              Verteilte Dateien werden geladen …
            </div>
          </div>
        ) : visibleGroups.length === 0 ? (
          <div className="card flex min-h-64 flex-col items-center justify-center text-center">
            <InboxArrowDownIcon className="mb-3 h-10 w-10 text-surface-300 dark:text-surface-600" />
            <h2 className="font-semibold text-surface-900 dark:text-white">Keine passenden Verteilungen</h2>
            <p className="mt-1 max-w-md text-sm text-surface-500 dark:text-surface-400">
              {query || filter === 'unread' ? 'Ändere die Suche oder zeige alle Verteilungen an.' : 'Für dich wurden derzeit keine Dateien oder Hinweise bereitgestellt.'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <p className="sr-only">{fileCount} Dateien in {distributions.length} Verteilungen</p>
            {visibleGroups.map(([source, items]) => (
              <section key={source} aria-labelledby={`source-${source}`} className="grid gap-3 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-5">
                <div className="md:sticky md:top-6 md:self-start">
                  <div className="flex items-center gap-2.5 md:block">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-sm font-bold text-primary-800 dark:bg-primary-950 dark:text-primary-200">
                      {sourceInitial(source)}
                    </div>
                    <div className="min-w-0 md:mt-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-surface-400">Herkunft</p>
                      <h2 id={`source-${source}`} className="truncate text-sm font-semibold text-surface-800 dark:text-surface-200 md:whitespace-normal">{source}</h2>
                    </div>
                  </div>
                </div>

                <div className="relative space-y-3 before:absolute before:bottom-3 before:left-[1.125rem] before:top-3 before:w-px before:bg-surface-200 dark:before:bg-surface-700 sm:before:left-[1.375rem]">
                  {items.map(distribution => (
                    <article key={distribution.id} className="relative rounded-2xl border border-surface-200 bg-white p-4 pl-12 shadow-soft dark:border-surface-800 dark:bg-surface-900 sm:p-5 sm:pl-16">
                      <span className={`absolute left-[0.875rem] top-6 z-10 h-2.5 w-2.5 rounded-full ring-4 ring-white dark:ring-surface-900 sm:left-[1.125rem] ${distribution.unread ? 'bg-primary-500' : 'bg-surface-300 dark:bg-surface-600'}`} aria-hidden="true" />
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-surface-950 dark:text-white">{distribution.title}</h3>
                            {distribution.unread && <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-800 dark:bg-primary-950 dark:text-primary-200">Neu</span>}
                          </div>
                          {distribution.created_at && <p className="mt-1 text-xs font-medium text-surface-400 dark:text-surface-500">Bereitgestellt am {distribution.created_at}</p>}
                        </div>
                      </div>

                      {distribution.description && <p className="mt-3 whitespace-pre-line text-sm leading-6 text-surface-600 dark:text-surface-300">{distribution.description}</p>}

                      {distribution.files.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {distribution.files.map(file => {
                            const key = `${distribution.id}:${file.id}`;
                            return (
                              <div key={key} className="flex items-center gap-3 rounded-xl border border-surface-200 bg-surface-50 p-2.5 dark:border-surface-700 dark:bg-surface-950/60">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-primary-600 shadow-sm dark:bg-surface-800 dark:text-primary-300">
                                  <DocumentTextIcon className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-surface-800 dark:text-surface-100">{file.name}</p>
                                  {file.size && <p className="mt-0.5 text-xs text-surface-400 dark:text-surface-500">{file.size}</p>}
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-primary shrink-0 !px-3"
                                  disabled={Boolean(downloading)}
                                  onClick={() => void downloadFile(distribution, file)}
                                  title={`${file.name} herunterladen`}
                                >
                                  <ArrowDownTrayIcon className={`h-4 w-4 ${downloading === key ? 'animate-bounce' : ''}`} />
                                  <span className="ml-2 hidden sm:inline">Herunterladen</span>
                                  <span className="sr-only sm:hidden">{file.name} herunterladen</span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {distribution.links.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {distribution.links.map(link => (
                            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary !px-3 text-sm">
                              {link.label}
                              <ArrowTopRightOnSquareIcon className="ml-2 h-4 w-4" />
                            </a>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dateiverteilung;
