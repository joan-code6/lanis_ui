import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  BellAlertIcon,
  ChatBubbleLeftRightIcon,
  CheckIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import axios from 'axios';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useBasePath } from '../../contexts/BasePathContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { dashboardAPI } from '../../services/api';
import { DashboardNotification, DashboardNotificationSource } from '../../types';

const SOURCE_DETAILS: Record<DashboardNotificationSource, {
  label: string;
  icon: React.ElementType;
  dot: string;
  badge: string;
}> = {
  messages: {
    label: 'Nachricht',
    icon: ChatBubbleLeftRightIcon,
    dot: 'bg-primary-500',
    badge: 'bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300',
  },
  native: {
    label: 'Schulportal',
    icon: ClipboardDocumentListIcon,
    dot: 'bg-violet-500',
    badge: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
  },
  dsb: {
    label: 'DSBmobile',
    icon: ClipboardDocumentListIcon,
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  },
};

function formatTimestamp(value: string): string {
  if (!value) return '';
  const portalDate = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (portalDate) {
    return `${portalDate[1].padStart(2, '0')}.${portalDate[2].padStart(2, '0')}`;
  }
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return value;
  return timestamp.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

const DashboardNotifications: React.FC = () => {
  const { token } = useAuth();
  const { preferences } = usePreferences();
  const basePath = useBasePath();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const dashboardPreferences = preferences.dashboard;
  const enabledSources = useMemo(() => new Set<DashboardNotificationSource>([
    ...(dashboardPreferences.notification_messages_enabled ? ['messages' as const] : []),
    ...(dashboardPreferences.notification_native_enabled ? ['native' as const] : []),
    ...(dashboardPreferences.notification_dsb_enabled ? ['dsb' as const] : []),
  ]), [
    dashboardPreferences.notification_dsb_enabled,
    dashboardPreferences.notification_messages_enabled,
    dashboardPreferences.notification_native_enabled,
  ]);

  useEffect(() => {
    if (!token || !dashboardPreferences.notifications_enabled) {
      setNotifications([]);
      setUnreadCount(0);
      setErrors([]);
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    dashboardAPI.getNotifications(token, reloadKey > 0, controller.signal)
      .then(response => {
        if (controller.signal.aborted) return;
        if (!response.success) throw new Error('Hinweise konnten nicht geladen werden.');
        const responseNotifications = response.notifications || [];
        const sourceNotifications = responseNotifications.filter(item => enabledSources.has(item.source));
        const nextNotifications = sourceNotifications.filter(
          item => dashboardPreferences.notification_show_read || !item.read,
        );
        setNotifications(nextNotifications);
        setUnreadCount(sourceNotifications.length === responseNotifications.length
          ? response.unread_count || 0
          : sourceNotifications.filter(item => !item.read).length);
        setErrors(Object.entries(response.errors || {})
          .filter(([source, error]) => error && enabledSources.has(source as DashboardNotificationSource))
          .map(([, error]) => error as string));
      })
      .catch(error => {
        if (axios.isCancel(error)) return;
        setErrors([error instanceof Error ? error.message : 'Hinweise konnten nicht geladen werden.']);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [
    dashboardPreferences.notification_show_read,
    dashboardPreferences.notifications_enabled,
    enabledSources,
    reloadKey,
    token,
  ]);

  const visibleNotifications = notifications.slice(0, dashboardPreferences.notification_limit);

  const markReadLocally = (ids: string[]) => {
    if (dashboardPreferences.notification_show_read) {
      setNotifications(current => current.map(item => (
        ids.includes(item.id) ? { ...item, read: true, read_at: new Date().toISOString() } : item
      )));
    } else {
      setNotifications(current => current.filter(item => !ids.includes(item.id)));
    }
  };

  const openNotification = (notification: DashboardNotification) => {
    if (!notification.read && token) {
      markReadLocally([notification.id]);
      setUnreadCount(current => Math.max(0, current - 1));
      void dashboardAPI.markNotificationsRead(token, [notification.id]).catch(error => {
        console.error('Failed to mark dashboard notification as read:', error);
      });
    }
    navigate(`${basePath}${notification.path}`);
  };

  const markAllRead = () => {
    if (!token || unreadCount === 0) return;
    const unreadIds = notifications.filter(item => !item.read).map(item => item.id);
    markReadLocally(unreadIds);
    setUnreadCount(0);
    void dashboardAPI.markAllNotificationsRead(token, Array.from(enabledSources)).catch(error => {
      console.error('Failed to mark dashboard notifications as read:', error);
      setReloadKey(value => value + 1);
    });
  };

  if (!dashboardPreferences.notifications_enabled) return null;

  if (loading && notifications.length === 0) {
    return <div className="skeleton mb-6 h-40 rounded-2xl" aria-label="Dashboard-Hinweise werden geladen" />;
  }

  if (visibleNotifications.length === 0 && errors.length === 0) return null;

  return (
    <aside className="mb-6 overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-soft dark:border-surface-700 dark:bg-surface-900" aria-labelledby="dashboard-notifications-title">
      <div className="flex items-center gap-3 border-b border-surface-100 px-4 py-4 dark:border-surface-800 sm:px-5">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-900 text-white dark:bg-surface-100 dark:text-surface-900">
          <BellAlertIcon className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-surface-900">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-surface-400 dark:text-surface-500">Neu für dich</p>
          <h2 id="dashboard-notifications-title" className="truncate text-base font-semibold text-surface-900 dark:text-surface-100">
            {unreadCount === 1 ? '1 ungelesener Hinweis' : `${unreadCount} ungelesene Hinweise`}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setReloadKey(value => value + 1)}
          disabled={loading}
          className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700 disabled:cursor-wait dark:hover:bg-surface-800 dark:hover:text-surface-200"
          aria-label="Hinweise aktualisieren"
          title="Aktualisieren"
        >
          <ArrowPathIcon className={clsx('h-4 w-4', loading && 'animate-spin')} />
        </button>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-800 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-100 sm:inline-flex"
          >
            <CheckIcon className="h-4 w-4" />
            Alle gelesen
          </button>
        )}
      </div>

      {errors.length > 0 && (
        <div className="flex items-start gap-2 border-b border-amber-100 bg-amber-50/70 px-4 py-2.5 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200 sm:px-5">
          <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Einige Quellen konnten gerade nicht aktualisiert werden.</span>
        </div>
      )}

      {visibleNotifications.length > 0 && (
        <div className="divide-y divide-surface-100 dark:divide-surface-800">
          {visibleNotifications.map(notification => {
            const source = SOURCE_DETAILS[notification.source];
            const Icon = source.icon;
            return (
              <button
                key={notification.id}
                type="button"
                onClick={() => openNotification(notification)}
                className={clsx(
                  'group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500/60 dark:hover:bg-surface-800/60 sm:px-5',
                  notification.read && 'opacity-60',
                )}
              >
                <span className={clsx('h-2 w-2 shrink-0 rounded-full', notification.read ? 'bg-surface-300 dark:bg-surface-600' : source.dot)} aria-hidden="true" />
                <span className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', source.badge)}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-surface-900 dark:text-surface-100">{notification.title}</span>
                    <span className={clsx('hidden shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold sm:inline', source.badge)}>{source.label}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-surface-500 dark:text-surface-400">{notification.detail}</span>
                </span>
                <time className="hidden shrink-0 text-[11px] tabular-nums text-surface-400 sm:block" dateTime={notification.created_at}>
                  {formatTimestamp(notification.meta || notification.created_at)}
                </time>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-surface-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-500 dark:text-surface-600" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      )}

      {unreadCount > 0 && (
        <button
          type="button"
          onClick={markAllRead}
          className="flex w-full items-center justify-center gap-1.5 border-t border-surface-100 px-4 py-3 text-xs font-medium text-surface-500 hover:bg-surface-50 dark:border-surface-800 dark:text-surface-400 dark:hover:bg-surface-800/60 sm:hidden"
        >
          <CheckIcon className="h-4 w-4" />
          Alle als gelesen markieren
        </button>
      )}
    </aside>
  );
};

export default DashboardNotifications;
