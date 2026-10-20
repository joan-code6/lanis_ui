import { useCachedResource } from '../../hooks/useCachedResource';
import React, { useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
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

export const RoomCard: React.FC<{ room: VideoRoom; statusLive: boolean }> = ({ room, statusLive }) => {
  const joinUrl = statusLive && room.can_join ? safeHttpsUrl(room.join_url) : null;
  const status = statusLive ? room.status : 'unknown';

  return (
    <article className="card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">{room.name}</h2>
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
      {room.links.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          {room.links.map(link => {
            const url = safeHttpsUrl(link.url);
            return url ? (
              <a key={`${link.label}-${url}`} href={url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline dark:text-primary-400">
                {link.label}<ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
              </a>
            ) : null;
          })}
        </div>
      )}
    </article>
  );
};

const Videokonferenz: React.FC = () => {
  const { token } = useAuth();
  const { data, loading, refreshing, error, refresh, updatedAt } = useCachedResource('videokonferenz', async (signal, force) => {
    const response = await videokonferenzAPI.getRooms(token!, force, signal);
    if (!response.success) throw new Error(response.error || 'Videoräume konnten nicht geladen werden.');
    return response;
  });
  // A cached room list is useful immediately, but joining requires this visit's live check.
  const initialData = useRef(data);
  const statusLive = Boolean(data && data !== initialData.current && !error && data.status_live);
  const overview = data ? { ...data, status_live: statusLive, open_count: statusLive ? data.open_count : 0 } : undefined;
  const lastChecked = updatedAt ? new Date(updatedAt) : null;

  useEffect(() => {
    if (!token) return;
    const interval = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [token, refresh]);

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
    <div className="min-h-full px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <SEO title="Videokonferenz" description="Deine aktuellen Videoräume im Schulportal Hessen." noindex />
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Videokonferenz</h1>
            {lastChecked && (
              <p className="mt-1 text-xs text-surface-500 dark:text-surface-400" aria-live="polite">
                Aktualisiert um {lastChecked.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
              </p>
            )}
          </div>
          <button
            type="button"
            className="btn btn-secondary self-start"
            onClick={refresh}
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
            <h2 className="font-semibold text-surface-900 dark:text-white">Keine Raumübersicht verfügbar</h2>
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
