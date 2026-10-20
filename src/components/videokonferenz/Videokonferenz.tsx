import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useBasePath } from '../../contexts/BasePathContext';
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  InformationCircleIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { videokonferenzAPI } from '../../services/api';
import type { VideoRoom, VideoRoomsResponse } from '../../types';
import SEO from '../seo/SEO';

const REFRESH_INTERVAL_MS = 30_000;

const statusOrder: Record<VideoRoom['status'], number> = {
  open: 0,
  waiting: 1,
  unknown: 2,
  closed: 3,
};

const statusLabels: Record<VideoRoom['status'], string> = {
  open: 'Offen',
  waiting: 'Noch nicht offen',
  closed: 'Geschlossen',
  unknown: 'Status unbekannt',
};

function safeHttpsUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? parsed.href : null;
  } catch {
    return null;
  }
}

function internalCoursePath(links: VideoRoom['links']): string | null {
  for (const link of links) {
    const safeUrl = safeHttpsUrl(link.url);
    if (!safeUrl) continue;
    const url = new URL(safeUrl);
    if (!['start.schulportal.hessen.de', 'schulportal.hessen.de'].includes(url.hostname)
      || url.pathname !== '/meinunterricht.php'
      || url.searchParams.getAll('a').length !== 1
      || url.searchParams.get('a') !== 'sus_view'
      || url.searchParams.getAll('id').length !== 1) continue;
    const id = url.searchParams.get('id') || '';
    if (/^[a-zA-Z0-9_-]+$/.test(id)) return `/courses/${encodeURIComponent(id)}`;
  }
  return null;
}

export const RoomCard: React.FC<{ room: VideoRoom; statusLive: boolean }> = ({ room, statusLive }) => {
  const basePath = useBasePath();
  const coursePath = internalCoursePath(room.links);
  const joinUrl = statusLive && room.status === 'open' && room.can_join ? safeHttpsUrl(room.join_url) : null;
  const status = statusLive ? room.status : 'unknown';

  return (
    <article className="card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">
            {coursePath ? (
              <Link to={`${basePath}${coursePath}`} className="hover:text-primary-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:text-primary-400">
                {room.name}
              </Link>
            ) : room.name}
          </h2>
          {room.teachers.length > 0 && (
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">{room.teachers.join(' · ')}</p>
          )}
          <p className={`mt-1 text-sm ${status === 'open' ? 'text-emerald-600 dark:text-emerald-400' : 'text-surface-500 dark:text-surface-400'}`}>
            {statusLabels[status]}
          </p>
        </div>
        {joinUrl && (
          <a href={joinUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary self-start sm:self-auto">
            Raum betreten
            <ArrowTopRightOnSquareIcon className="ml-2 h-4 w-4" />
          </a>
        )}
      </div>
    </article>
  );
};

const Videokonferenz: React.FC = () => {
  const { token } = useAuth();
  const [overview, setOverview] = useState<VideoRoomsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    let inFlight = false;

    const loadRooms = async (manual = false) => {
      if (inFlight || controller.signal.aborted) return;
      inFlight = true;
      if (manual) setRefreshing(true);
      else setLoading(true);
      try {
        const response = await videokonferenzAPI.getRooms(token, manual, controller.signal);
        if (controller.signal.aborted) return;
        if (!response.success) throw new Error(response.error || 'Videoräume konnten nicht geladen werden.');
        setOverview(response);
        setLastChecked(new Date());
        setError('');
      } catch (loadError) {
        if (!controller.signal.aborted && !axios.isCancel(loadError)) {
          setOverview(previous => previous ? {
            ...previous,
            status_live: false,
            open_count: 0,
            rooms: previous.rooms.map(room => ({
              ...room,
              status: 'unknown',
              status_label: 'Aktueller Status nicht verfügbar',
              can_join: false,
              join_url: null,
            })),
          } : null);
          setError(loadError instanceof Error ? loadError.message : 'Videoräume konnten nicht geladen werden.');
        }
      } finally {
        inFlight = false;
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    void loadRooms(reloadKey > 0);
    const interval = window.setInterval(() => void loadRooms(true), REFRESH_INTERVAL_MS);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [token, reloadKey]);

  const rooms = useMemo(
    () => [...(overview?.rooms || [])].sort((left, right) => statusOrder[left.status] - statusOrder[right.status]),
    [overview?.rooms],
  );

  if (!token) {
    return (
      <div className="p-6 text-center">
        <p className="text-surface-500">Bitte melde dich an, um deine Videoräume zu sehen.</p>
      </div>
    );
  }

  return (
    <div className="min-h-full module-padding">
      <SEO title="Videokonferenz" description="Deine aktuellen Videoräume im Schulportal Hessen." noindex />
      <div className="mx-auto max-w-7xl">
        <header className="page-header page-header-actions">
          <div>
            <h1 className="page-title">Videokonferenz</h1>
            {lastChecked && (
              <p className="mt-1 text-xs text-surface-500 dark:text-surface-400" aria-live="polite">
                Aktualisiert um {lastChecked.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
              </p>
            )}
          </div>
          <button
            type="button"
            className="btn btn-secondary self-start"
            onClick={() => setReloadKey(value => value + 1)}
            disabled={loading || refreshing}
          >
            <ArrowPathIcon className={`mr-2 h-4 w-4 ${loading || refreshing ? 'animate-spin' : ''}`} />
            Aktualisieren
          </button>
        </header>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300" role="alert">
            <p className="font-semibold">Videoräume konnten nicht aktualisiert werden</p>
            <p className="mt-0.5 text-sm">{error}</p>
          </div>
        )}

        {overview && !overview.status_live && !error && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200" role="status">
            <p className="text-sm">Raumstatus nicht verfügbar. Beitritt nach der nächsten erfolgreichen Prüfung möglich.</p>
          </div>
        )}

        {loading ? (
          <div className="card flex min-h-64 items-center justify-center">
            <div className="text-center text-surface-500">
              <ArrowPathIcon className="mx-auto mb-3 h-7 w-7 animate-spin text-primary-500" />
              Videoräume werden geladen …
            </div>
          </div>
        ) : !overview ? (
          <div className="card flex min-h-64 flex-col items-center justify-center text-center">
            <InformationCircleIcon className="mb-3 h-10 w-10 text-surface-300" />
            <h2 className="empty-state-title">Keine Raumübersicht verfügbar</h2>
            <p className="mt-1 max-w-md text-sm text-surface-500 dark:text-surface-400">
              Aktualisiere die Seite, um es erneut zu versuchen.
            </p>
          </div>
        ) : overview.available === false ? (
          <div className="card flex min-h-64 flex-col items-center justify-center text-center">
            <InformationCircleIcon className="mb-3 h-10 w-10 text-surface-300" />
            <h2 className="font-semibold text-surface-900 dark:text-white">Videokonferenz nicht verfügbar</h2>
            <p className="mt-1 max-w-md text-sm text-surface-500 dark:text-surface-400">
              Dieses Schulportal-Konto stellt das native Videokonferenz-Modul nicht bereit.
            </p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="card flex min-h-64 flex-col items-center justify-center text-center">
            <VideoCameraIcon className="mb-3 h-10 w-10 text-surface-300" />
            <h2 className="font-semibold text-surface-900 dark:text-white">Gerade ist kein Raum sichtbar</h2>
            <p className="mt-1 max-w-md text-sm text-surface-500 dark:text-surface-400">
              Die Übersicht prüft alle 30 Sekunden automatisch, ob eine Lehrkraft einen Raum öffnet.
            </p>
          </div>
        ) : (
          <section aria-label="Deine Videoräume">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-surface-600 dark:text-surface-300">
                {!overview.status_live
                  ? 'Aktueller Raumstatus nicht verfügbar'
                  : overview.open_count
                    ? `${overview.open_count} ${overview.open_count === 1 ? 'Raum ist' : 'Räume sind'} jetzt offen`
                    : 'Noch kein Raum ist offen'}
              </p>
              {refreshing && <span className="text-xs text-surface-400">Wird geprüft …</span>}
            </div>
            <div className="space-y-3">
              {rooms.map(room => <RoomCard key={room.id} room={room} statusLive={overview.status_live === true} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Videokonferenz;
