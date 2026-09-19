import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  BellAlertIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useBasePath } from '../../contexts/BasePathContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { dsbAPI, messagesAPI, vertretungsplanAPI } from '../../services/api';
import { DSBPlanTable, MessageHeader, Module, VertretungsplanEntry } from '../../types';
import clsx from 'clsx';

type NotificationSource = 'messages' | 'native' | 'dsb';

interface DashboardNotification {
  id: string;
  source: NotificationSource;
  title: string;
  detail: string;
  meta?: string;
  path: string;
  sortValue: number;
}

interface SourceState {
  loading: boolean;
  error: boolean;
}

const SOURCE_DETAILS: Record<NotificationSource, {
  label: string;
  empty: string;
  icon: React.ElementType;
  accent: string;
  iconStyle: string;
}> = {
  messages: {
    label: 'Nachrichten',
    empty: 'Keine ungelesenen Nachrichten',
    icon: ChatBubbleLeftRightIcon,
    accent: 'border-primary-400 dark:border-primary-600',
    iconStyle: 'bg-primary-50 text-primary-600 dark:bg-primary-950/60 dark:text-primary-300',
  },
  native: {
    label: 'Schulportal',
    empty: 'Keine Änderungen für deine Klasse',
    icon: ClipboardDocumentListIcon,
    accent: 'border-violet-400 dark:border-violet-600',
    iconStyle: 'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300',
  },
  dsb: {
    label: 'DSBmobile',
    empty: 'Keine Änderungen für deine Klasse',
    icon: ClipboardDocumentListIcon,
    accent: 'border-amber-400 dark:border-amber-600',
    iconStyle: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300',
  },
};

const initialSourceState = (): Record<NotificationSource, SourceState> => ({
  messages: { loading: false, error: false },
  native: { loading: false, error: false },
  dsb: { loading: false, error: false },
});

function moduleText(module: Module): string {
  return `${module.name} ${module.url} ${module.direct_url || ''}`.toLocaleLowerCase('de-DE');
}

function cleanText(value: unknown): string {
  return String(value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeClass(value: unknown): string {
  return cleanText(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('de-DE')
    .replace(/[^a-z0-9]/g, '');
}

function matchesClass(value: unknown, targetClass: string): boolean {
  if (!targetClass) return true;
  const valueClass = normalizeClass(value);
  const target = normalizeClass(targetClass);
  return Boolean(valueClass && target && valueClass.includes(target));
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return '';
}

function parseDate(value: unknown): number {
  const text = cleanText(value);
  if (!text) return 0;
  const germanDate = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (germanDate) {
    const year = Number(germanDate[3].length === 2 ? `20${germanDate[3]}` : germanDate[3]);
    return new Date(year, Number(germanDate[2]) - 1, Number(germanDate[1]), 12).getTime();
  }
  const parsed = new Date(text).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatMessageDate(value?: string): string {
  if (!value) return '';
  const timestamp = parseDate(value);
  if (!timestamp) return cleanText(value);
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' }).format(timestamp);
}

function messageNotifications(messages: MessageHeader[], basePath: string): DashboardNotification[] {
  return messages
    .filter(message => message.unread === true || Number(message.unread) === 1)
    .map(message => ({
      id: `message-${message.Uniquid}`,
      source: 'messages' as const,
      title: firstText(message.Betreff, 'Neue Nachricht'),
      detail: firstText(message.SenderName, message.Sender, 'Unbekannter Absender'),
      meta: formatMessageDate(message.date),
      path: `${basePath}/messages`,
      sortValue: parseDate(message.date),
    }));
}

function nativeNotificationDetail(entry: VertretungsplanEntry): string {
  const values = [
    firstText(entry.klasse, entry.klasse_alt),
    entry.stunde ? `${cleanText(entry.stunde)}. Std.` : '',
    entry.raum ? `Raum ${cleanText(entry.raum)}` : '',
  ].filter(Boolean);
  return values.join(' · ');
}

function tableValue(table: DSBPlanTable, row: Record<string, string> | string[], patterns: string[]): string {
  const index = table.headers.findIndex(header => {
    const normalized = normalizeClass(header);
    return patterns.some(pattern => normalized.includes(pattern));
  });
  if (index < 0) return '';
  return cleanText(Array.isArray(row) ? row[index] : row[table.headers[index]]);
}

function dsbNotificationDetail(table: DSBPlanTable, row: Record<string, string> | string[], targetClass: string): string {
  const className = tableValue(table, row, ['klasse', 'class'])
    || (matchesClass(table.caption, targetClass) ? targetClass : '');
  const period = tableValue(table, row, ['stunde', 'std', 'period']);
  const room = tableValue(table, row, ['raum', 'room']);
  return [className, period ? `${period}. Std.` : '', room ? `Raum ${room}` : ''].filter(Boolean).join(' · ');
}

const NotificationColumn: React.FC<{
  source: NotificationSource;
  items: DashboardNotification[];
  state: SourceState;
  onOpen: (path: string) => void;
}> = ({ source, items, state, onOpen }) => {
  const details = SOURCE_DETAILS[source];
  const Icon = details.icon;

  return (
    <section aria-labelledby={`dashboard-notifications-${source}`} className={clsx('border-l-2 pl-4', details.accent)}>
      <div className="mb-3 flex items-center gap-2.5">
        <span className={clsx('flex h-8 w-8 items-center justify-center rounded-lg', details.iconStyle)}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <h3 id={`dashboard-notifications-${source}`} className="text-sm font-semibold text-surface-900 dark:text-surface-100">
          {details.label}
        </h3>
        {!state.loading && !state.error && (
          <span className="ml-auto rounded-full bg-surface-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-surface-600 dark:bg-surface-800 dark:text-surface-300">
            {items.length}
          </span>
        )}
      </div>

      {state.loading ? (
        <div className="space-y-2" aria-label={`${details.label} werden geladen`}>
          <div className="skeleton h-14 w-full" />
          <div className="skeleton h-14 w-4/5" />
        </div>
      ) : state.error ? (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">
          <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Aktualisierung nicht verfügbar</span>
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center gap-2 py-2 text-xs text-surface-500 dark:text-surface-400">
          <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
          <span>{details.empty}</span>
        </div>
      ) : (
        <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
          {items.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpen(item.path)}
              className="group flex w-full items-start gap-2 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-surface-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 dark:hover:bg-surface-800/70"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-surface-900 dark:text-surface-100">{item.title}</span>
                <span className="mt-0.5 block truncate text-xs text-surface-500 dark:text-surface-400">{item.detail}</span>
              </span>
              {item.meta && <span className="mt-0.5 hidden shrink-0 text-[11px] tabular-nums text-surface-400 sm:inline">{item.meta}</span>}
              <ChevronRightIcon className="mt-1 h-3.5 w-3.5 shrink-0 text-surface-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-500 dark:text-surface-600" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

const DashboardNotifications: React.FC<{ modules: Module[] }> = ({ modules }) => {
  const { token, user } = useAuth();
  const { preferences } = usePreferences();
  const basePath = useBasePath();
  const navigate = useNavigate();
  const [items, setItems] = useState<DashboardNotification[]>([]);
  const [sourceState, setSourceState] = useState(initialSourceState);
  const [reloadKey, setReloadKey] = useState(0);

  const sources = useMemo(() => {
    const descriptors = modules.map(moduleText);
    return {
      messages: descriptors.some(value => value.includes('nachrichten')),
      native: descriptors.some(value => value.includes('vertretungsplan') && !value.includes('dsb')),
      dsb: descriptors.some(value => value.includes('dsb')),
    };
  }, [modules]);

  const enabledSources = (Object.keys(sources) as NotificationSource[]).filter(source => sources[source]);
  const targetClass = preferences.vertretungsplan.class_override
    || user?.klasse
    || user?.class
    || user?.Klasse
    || '';

  const replaceSourceItems = useCallback((source: NotificationSource, nextItems: DashboardNotification[]) => {
    setItems(current => [...current.filter(item => item.source !== source), ...nextItems]);
  }, []);

  useEffect(() => {
    if (!token || enabledSources.length === 0) return undefined;
    const controller = new AbortController();
    const loadingState = initialSourceState();
    enabledSources.forEach(source => { loadingState[source].loading = true; });
    setSourceState(loadingState);

    const finish = (source: NotificationSource, error: boolean) => {
      if (controller.signal.aborted) return;
      setSourceState(current => ({ ...current, [source]: { loading: false, error } }));
    };

    if (sources.messages) {
      messagesAPI.getMessageHeaders(token, 'All', 0, controller.signal)
        .then(response => {
          if (!response.success) throw new Error('Messages response was unsuccessful.');
          replaceSourceItems('messages', messageNotifications(response.conversations || [], basePath));
          finish('messages', false);
        })
        .catch(error => {
          if (!axios.isCancel(error)) finish('messages', true);
        });
    }

    if (sources.native) {
      vertretungsplanAPI.getPlan(token, reloadKey > 0, controller.signal)
        .then(response => {
          if (!response.success) throw new Error(response.error || 'Native plan response was unsuccessful.');
          const notifications = (response.days || []).flatMap(day => (day.substitutions || [])
            .filter(entry => matchesClass(firstText(entry.klasse, entry.klasse_alt), targetClass))
            .map((entry, index) => {
              const subject = firstText(entry.fach, entry.fach_alt);
              const kind = firstText(entry.art, entry.hinweis, 'Änderung');
              return {
                id: `native-${day.date}-${index}-${cleanText(entry.stunde)}`,
                source: 'native' as const,
                title: subject ? `${kind} · ${subject}` : kind,
                detail: nativeNotificationDetail(entry),
                meta: cleanText(entry.tag || day.date),
                path: `${basePath}/vertretungsplan`,
                sortValue: parseDate(entry.tag_en || entry.tag || day.date),
              };
            }));
          replaceSourceItems('native', notifications);
          finish('native', false);
        })
        .catch(error => {
          if (!axios.isCancel(error)) finish('native', true);
        });
    }

    if (sources.dsb) {
      dsbAPI.getSchoolPlan(token, reloadKey > 0, controller.signal)
        .then(response => {
          if (!response.success) throw new Error(response.error || 'DSB response was unsuccessful.');
          const notifications = (response.tables || []).flatMap((table, tableIndex) => (table.rows || [])
            .filter(row => matchesClass(
              tableValue(table, row, ['klasse', 'class']) || table.caption,
              targetClass,
            ))
            .map((row, rowIndex) => {
              const subject = tableValue(table, row, ['fach', 'subject']);
              const kind = firstText(
                tableValue(table, row, ['art', 'anderung', 'aenderung', 'type']),
                tableValue(table, row, ['info', 'hinweis']),
                'Änderung',
              );
              return {
                id: `dsb-${tableIndex}-${rowIndex}`,
                source: 'dsb' as const,
                title: subject ? `${kind} · ${subject}` : kind,
                detail: dsbNotificationDetail(table, row, targetClass),
                meta: cleanText(table.date || table.caption),
                path: `${basePath}/dsb`,
                sortValue: parseDate(table.date || table.caption),
              };
            }));
          replaceSourceItems('dsb', notifications);
          finish('dsb', false);
        })
        .catch(error => {
          if (!axios.isCancel(error)) finish('dsb', true);
        });
    }

    return () => controller.abort();
  }, [basePath, reloadKey, replaceSourceItems, sources.dsb, sources.messages, sources.native, targetClass, token]);

  if (enabledSources.length === 0) return null;

  const sortedItems = items
    .filter(item => sources[item.source] && !sourceState[item.source].error)
    .sort((a, b) => b.sortValue - a.sortValue);
  const visibleCount = sortedItems.length;
  const isLoading = enabledSources.some(source => sourceState[source].loading);

  return (
    <aside className="mb-6 overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-soft dark:border-surface-700 dark:bg-surface-900" aria-labelledby="dashboard-notifications-title">
      <div className="flex flex-col gap-4 border-b border-surface-100 px-5 py-4 dark:border-surface-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-900 text-white dark:bg-surface-100 dark:text-surface-900">
            <BellAlertIcon className="h-5 w-5" aria-hidden="true" />
            {visibleCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-surface-900">
                {visibleCount > 99 ? '99+' : visibleCount}
              </span>
            )}
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-surface-400 dark:text-surface-500">Dein Schultag</p>
            <h2 id="dashboard-notifications-title" className="text-lg font-semibold tracking-tight text-surface-900 dark:text-surface-100">
              {visibleCount > 0 ? `${visibleCount} ${visibleCount === 1 ? 'Hinweis' : 'Hinweise'} für dich` : 'Alles im Blick'}
            </h2>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setReloadKey(value => value + 1)}
          disabled={isLoading}
          className="inline-flex w-fit items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-800 disabled:cursor-wait disabled:opacity-60 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-100"
        >
          <ArrowPathIcon className={clsx('h-4 w-4', isLoading && 'animate-spin')} aria-hidden="true" />
          Aktualisieren
        </button>
      </div>

      <div className={clsx('grid gap-5 px-5 py-5', enabledSources.length === 3 ? 'lg:grid-cols-3' : 'md:grid-cols-2')}>
        {enabledSources.map(source => (
          <NotificationColumn
            key={source}
            source={source}
            items={sortedItems.filter(item => item.source === source)}
            state={sourceState[source]}
            onOpen={navigate}
          />
        ))}
      </div>
    </aside>
  );
};

export default DashboardNotifications;
