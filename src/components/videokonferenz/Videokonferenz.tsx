import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ClockIcon,
  InformationCircleIcon,
  UserGroupIcon,
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

const statusAppearance: Record<VideoRoom['status'], { label: string; dot: string; badge: string; rail: string }> = {
  open: {
    label: 'Jetzt offen',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-400/20',
    rail: 'bg-emerald-500',
  },
  waiting: {
    label: 'Noch nicht offen',
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-400/20',
    rail: 'bg-amber-400',
  },
  closed: {
    label: 'Geschlossen',
    dot: 'bg-surface-400',
    badge: 'bg-surface-100 text-surface-600 ring-surface-500/20 dark:bg-surface-800 dark:text-surface-300 dark:ring-surface-400/20',
    rail: 'bg-surface-300 dark:bg-surface-700',
  },
  unknown: {
    label: 'Status unbekannt',
    dot: 'bg-surface-400',
    badge: 'bg-surface-100 text-surface-600 ring-surface-500/20 dark:bg-surface-800 dark:text-surface-300 dark:ring-surface-400/20',
    rail: 'bg-surface-300 dark:bg-surface-700',
  },
};

function safeHttpsUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}

const RoomCard: React.FC<{ room: VideoRoom }> = ({ room }) => {
  const appearance = statusAppearance[room.status];
  const joinUrl = safeHttpsUrl(room.join_url);
  const actionLabel = room.status === 'open' ? 'Raum betreten' : 'Auf Raum warten';

  return (
    <article className="relative overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-soft transition-shadow hover:shadow-soft-md dark:border-surface-800 dark:bg-surface-900">
      <div className={`absolute inset-y-0 left-0 w-1.5 ${appearance.rail}`} aria-hidden="true" />
      <div className="p-5 pl-6 sm:p-6 sm:pl-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${appearance.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${appearance.dot} ${room.status === 'open' ? 'animate-pulse motion-reduce:animate-none' : ''}`} />
                {appearance.label}
              </span>
              {room.status_label && room.status_label !== appearance.label && (
                <span className="text-xs text-surface-400 dark:text-surface-500">{room.status_label}</span>
              )}
            </div>
            <h2 className="mt-3 text-xl font-semibold tracking-tight text-surface-900 dark:text-white sm:text-2xl">
              {room.name}
            </h2>
            <div className="mt-2 flex items-center gap-2 text-sm text-surface-500 dark:text-surface-400">
              <UserGroupIcon className="h-4 w-4 shrink-0" />
              <span>{room.teachers.length > 0 ? room.teachers.join(' · ') : 'Keine Lehrkraft angegeben'}</span>
            </div>
          </div>

          {joinUrl && room.can_join ? (
            <a
              href={joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold shadow-sm transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-surface-900 motion-reduce:transform-none ${room.status === 'open'
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500'
                : 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500'}`}
            >
              <VideoCameraIcon className="h-5 w-5" />
              {actionLabel}
              <ArrowTopRightOnSquareIcon className="h-4 w-4 opacity-70" />
            </a>
          ) : (
            <div className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl bg-surface-100 px-4 text-sm font-medium text-surface-500 dark:bg-surface-800 dark:text-surface-400">
              <ClockIcon className="h-4 w-4" />
              Kein Beitritt möglich
            </div>
          )}
        </div>

        {room.links.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-surface-100 pt-4 dark:border-surface-800">
            {room.links.map(link => {
              const url = safeHttpsUrl(link.url);
              return url ? (
                <a
                  key={`${link.label}-${url}`}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500/50 dark:text-primary-300 dark:hover:bg-primary-950"
                >
                  {link.label}
                  <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                </a>
              ) : null;
            })}
          </div>
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

    const loadRooms = async (manual = false) => {
      if (manual) setRefreshing(true);
      else setLoading(true);
      try {
        const response = await videokonferenzAPI.getRooms(token, manual, controller.signal);
        if (!response.success) throw new Error(response.error || 'Videoräume konnten nicht geladen werden.');
        setOverview(response);
        setLastChecked(new Date());
        setError('');
      } catch (loadError) {
        if (!controller.signal.aborted && !axios.isCancel(loadError)) {
          setError(loadError instanceof Error ? loadError.message : 'Videoräume konnten nicht geladen werden.');
        }
      } finally {
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
    <div className="min-h-full px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <SEO title="Videokonferenz" description="Deine aktuellen Videoräume im Schulportal Hessen." noindex />
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300">
                <VideoCameraIcon className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-white sm:text-3xl">Videokonferenz</h1>
                <p className="mt-0.5 text-sm text-surface-500 dark:text-surface-400">Finde den richtigen Raum und tritt direkt bei.</p>
              </div>
            </div>
            {lastChecked && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-surface-400 dark:text-surface-500" aria-live="polite">
                <CheckCircleIcon className="h-4 w-4" />
                Zuletzt geprüft um {lastChecked.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                {overview?.updated_label ? ` · Schulportal: ${overview.updated_label}` : ''}
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
            <p className="font-semibold">Live-Status vorübergehend nicht verfügbar</p>
            <p className="mt-0.5 text-sm">Die Räume bleiben sichtbar, ein Beitritt wird erst nach der nächsten erfolgreichen Prüfung angeboten.</p>
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
                {overview?.open_count
                  ? `${overview.open_count} ${overview.open_count === 1 ? 'Raum ist' : 'Räume sind'} jetzt offen`
                  : 'Noch kein Raum ist offen'}
              </p>
              {refreshing && <span className="text-xs text-surface-400">Wird geprüft …</span>}
            </div>
            <div className="space-y-3">
              {rooms.map(room => <RoomCard key={room.id} room={room} />)}
            </div>
            <p className="mt-5 text-center text-xs text-surface-400 dark:text-surface-500">
              Beim Beitritt öffnet sich der Videoraum in einem neuen Tab.
            </p>
          </section>
        )}
      </div>
    </div>
  );
};

export default Videokonferenz;
