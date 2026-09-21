import React from 'react';
import { Link } from 'react-router-dom';
import {
  BellAlertIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useBasePath } from '../../contexts/BasePathContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { UserPreferences } from '../../types';

type DashboardPreferences = UserPreferences['dashboard'];
type BooleanDashboardPreference = {
  [Key in keyof DashboardPreferences]: DashboardPreferences[Key] extends boolean ? Key : never
}[keyof DashboardPreferences];

const Toggle: React.FC<{
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: () => void;
}> = ({ checked, disabled, label, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={onChange}
    className={clsx(
      'relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-surface-900',
      checked ? 'bg-primary-600' : 'bg-surface-300 dark:bg-surface-700',
    )}
  >
    <span className={clsx(
      'absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
      checked && 'translate-x-5',
    )} />
  </button>
);

const DashboardSettings: React.FC = () => {
  const { preferences, updatePreferences, isSaving } = usePreferences();
  const basePath = useBasePath();
  const dashboard = preferences.dashboard;

  const toggle = (key: BooleanDashboardPreference) => {
    void updatePreferences({ dashboard: { [key]: !dashboard[key] } });
  };

  const sourceRows: Array<{
    key: BooleanDashboardPreference;
    title: string;
    description: string;
    icon: React.ElementType;
    iconStyle: string;
  }> = [
    {
      key: 'notification_messages_enabled',
      title: 'Nachrichten',
      description: 'Ungelesene Unterhaltungen im Dashboard anzeigen.',
      icon: ChatBubbleLeftRightIcon,
      iconStyle: 'bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300',
    },
    {
      key: 'notification_native_enabled',
      title: 'Schulportal-Vertretungsplan',
      description: 'Änderungen aus dem nativen Vertretungsplan anzeigen.',
      icon: ClipboardDocumentListIcon,
      iconStyle: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
    },
    {
      key: 'notification_dsb_enabled',
      title: 'DSBmobile',
      description: 'Änderungen aus dem DSBmobile-Plan anzeigen.',
      icon: ClipboardDocumentListIcon,
      iconStyle: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-900 text-white dark:bg-surface-100 dark:text-surface-900">
              <BellAlertIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">Hinweisbanner</h2>
              <p className="mt-1 text-sm leading-6 text-surface-500">
                Neue Nachrichten und Änderungen am Schultag direkt über den Apps anzeigen.
              </p>
            </div>
          </div>
          <Toggle
            checked={dashboard.notifications_enabled}
            disabled={isSaving}
            label="Hinweisbanner auf dem Dashboard anzeigen"
            onChange={() => toggle('notifications_enabled')}
          />
        </div>
      </div>

      <div className={clsx('card transition-opacity', !dashboard.notifications_enabled && 'pointer-events-none opacity-50')}>
        <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">Quellen</h2>
        <p className="mt-1 text-sm text-surface-500">Leere Quellen werden im Banner automatisch ausgeblendet.</p>
        <div className="mt-4 divide-y divide-surface-100 dark:divide-surface-800">
          {sourceRows.map(row => {
            const Icon = row.icon;
            return (
              <div key={row.key} className="flex items-center gap-3 py-4 first:pt-2 last:pb-0">
                <span className={clsx('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', row.iconStyle)}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-surface-900 dark:text-surface-100">{row.title}</h3>
                  <p className="mt-0.5 text-xs leading-5 text-surface-500">{row.description}</p>
                </div>
                <Toggle
                  checked={Boolean(dashboard[row.key])}
                  disabled={isSaving || !dashboard.notifications_enabled}
                  label={`${row.title} im Hinweisbanner anzeigen`}
                  onChange={() => toggle(row.key)}
                />
              </div>
            );
          })}
        </div>
        <p className="mt-4 rounded-xl bg-surface-50 px-3 py-2.5 text-xs leading-5 text-surface-500 dark:bg-surface-800/70">
          Vertretungen werden für deine ausgewählte Klasse gefiltert.{' '}
          <Link to={`${basePath}/settings/vertretungsplan`} className="font-medium text-primary-600 hover:underline dark:text-primary-400">
            Klasse festlegen
          </Link>
        </p>
      </div>

      <div className={clsx('card transition-opacity', !dashboard.notifications_enabled && 'pointer-events-none opacity-50')}>
        <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">Verhalten</h2>
        <div className="mt-4 space-y-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300">
              <EyeIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-surface-900 dark:text-surface-100">Gelesene Hinweise behalten</h3>
              <p className="mt-0.5 text-xs leading-5 text-surface-500">Gelesene Einträge bleiben abgeblendet sichtbar, solange sie aktuell sind.</p>
            </div>
            <Toggle
              checked={dashboard.notification_show_read}
              disabled={isSaving || !dashboard.notifications_enabled}
              label="Gelesene Hinweise im Banner behalten"
              onChange={() => toggle('notification_show_read')}
            />
          </div>

          <div>
            <label htmlFor="dashboard-notification-limit" className="label">Maximale Anzahl</label>
            <select
              id="dashboard-notification-limit"
              value={dashboard.notification_limit}
              disabled={isSaving || !dashboard.notifications_enabled}
              onChange={event => void updatePreferences({
                dashboard: { notification_limit: Number(event.target.value) as 5 | 10 | 20 | 50 },
              })}
              className="input mt-2 max-w-xs text-sm"
            >
              <option value={5}>5 Hinweise</option>
              <option value={10}>10 Hinweise</option>
              <option value={20}>20 Hinweise</option>
              <option value={50}>50 Hinweise</option>
            </select>
            <p className="mt-2 text-xs text-surface-500">Die neuesten Hinweise stehen immer zuerst.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSettings;
