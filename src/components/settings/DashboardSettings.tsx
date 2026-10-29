import React from 'react';
import { usePreferences } from '../../contexts/PreferencesContext';
import { UserPreferences } from '../../types';
import SettingsSwitch from './SettingsSwitch';

type DashboardPreferences = UserPreferences['dashboard'];
type DashboardToggle = {
  [Key in keyof DashboardPreferences]: DashboardPreferences[Key] extends boolean ? Key : never
}[keyof DashboardPreferences];

const sources: Array<{ key: DashboardToggle; label: string; description: string }> = [
  { key: 'notification_messages_enabled', label: 'Nachrichten', description: 'Neue und ungelesene Unterhaltungen.' },
  { key: 'notification_native_enabled', label: 'Vertretungsplan', description: 'Aktualisierungen aus dem Schulportal.' },
  { key: 'notification_dsb_enabled', label: 'DSBmobile', description: 'Aktualisierungen aus dem DSBmobile-Plan.' },
];

const DashboardSettings: React.FC = () => {
  const { preferences, updatePreferences, isSaving } = usePreferences();
  const dashboard = preferences.dashboard;

  const toggle = (key: DashboardToggle) => {
    void updatePreferences({ dashboard: { [key]: !dashboard[key] } });
  };

  return (
    <section className="card space-y-5">
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="item-title">Auf dem Dashboard</h2>
          <p className="mt-1 text-sm text-surface-500">Hinweisbanner oben im Dashboard – nur, solange Lanis geöffnet ist.</p>
        </div>
        <SettingsSwitch
          checked={dashboard.notifications_enabled}
          disabled={isSaving}
          label="Dashboard-Benachrichtigungen aktivieren"
          onChange={() => toggle('notifications_enabled')}
        />
      </div>

      <fieldset disabled={!dashboard.notifications_enabled || isSaving} className="space-y-5">
        <div>
          <h3 className="item-title">Quellen</h3>
          <div className="mt-3 divide-y divide-surface-100 dark:divide-surface-800">
            {sources.map(source => (
              <div key={source.key} className="flex items-center gap-4 py-4 first:pt-2 last:pb-2">
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-medium text-surface-900 dark:text-surface-100">{source.label}</h4>
                  <p className="mt-0.5 text-xs text-surface-500">{source.description}</p>
                </div>
                <SettingsSwitch
                  checked={dashboard[source.key] as boolean}
                  disabled={!dashboard.notifications_enabled || isSaving}
                  label={`${source.label} auf dem Dashboard anzeigen`}
                  onChange={() => toggle(source.key)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-surface-900 dark:text-surface-100">Gelesene Nachrichten behalten</h3>
            <p className="mt-0.5 text-xs text-surface-500">Gelesene Einträge bleiben abgeschwächt sichtbar.</p>
          </div>
          <SettingsSwitch
            checked={dashboard.notification_show_read}
            disabled={!dashboard.notifications_enabled || isSaving}
            label="Gelesene Nachrichten behalten"
            onChange={() => toggle('notification_show_read')}
          />
        </div>

        <fieldset>
          <legend className="label">Maximale Anzahl angezeigter Nachrichten</legend>
          <div className="segmented-control mt-2 grid-cols-4" role="radiogroup" aria-label="Maximale Anzahl angezeigter Nachrichten">
            {([5, 10, 20, 50] as const).map(limit => (
              <button
                key={limit}
                type="button"
                role="radio"
                aria-checked={dashboard.notification_limit === limit}
                disabled={!dashboard.notifications_enabled || isSaving}
                onClick={() => void updatePreferences({ dashboard: { notification_limit: limit } })}
                className="segmented-control-option"
              >
                {limit}
              </button>
            ))}
          </div>
        </fieldset>
      </fieldset>
    </section>
  );
};

export default DashboardSettings;
