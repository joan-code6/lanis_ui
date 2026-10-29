import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CheckIcon, ClipboardDocumentListIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { notificationsAPI, vertretungsplanAPI } from '../../services/api';

const VertretungsplanSettings: React.FC = () => {
  const { token } = useAuth();
  const { preferences, updatePreferences } = usePreferences();
  const [classOverride, setClassOverride] = useState(preferences.vertretungsplan.class_override);
  const [ownClass, setOwnClass] = useState('');
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setClassOverride(preferences.vertretungsplan.class_override);
  }, [preferences.vertretungsplan.class_override]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setError('');

    vertretungsplanAPI.getOptions(token, controller.signal)
      .then(response => {
        if (controller.signal.aborted) return;
        if (!response.success) {
          throw new Error(response.error || 'Die Klassen konnten nicht geladen werden.');
        }
        setOwnClass(response.own_class || '');
        setAvailableClasses(response.available_classes || []);
      })
      .catch(loadError => {
        if (axios.isCancel(loadError)) return;
        console.error('Failed to load Vertretungsplan class options:', loadError);
        setError('Klassen konnten gerade nicht aus dem Schulportal geladen werden. Du kannst sie trotzdem eingeben.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [token]);

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    const selectedClass = classOverride.trim();
    const saved = await updatePreferences({ vertretungsplan: { class_override: selectedClass } });
    if (saved) {
      try {
        if (token) {
          const current = await notificationsAPI.getPreferences(token);
          if (!current.success) throw new Error('Benachrichtigungseinstellungen konnten nicht geladen werden.');
          if (current.preferences.vertretungsplan_enabled) {
            const response = await notificationsAPI.updatePreferences(token, {
              ...current.preferences,
              vertretungsplan_class_mode: selectedClass ? 'selected' : 'own',
              vertretungsplan_classes: selectedClass ? [selectedClass] : [],
            });
            if (!response.success) throw new Error('Der Klassenfilter für Benachrichtigungen konnte nicht aktualisiert werden.');
          }
        }
        setMessage('Klasse für Vertretungen und Benachrichtigungen gespeichert.');
      } catch (syncError) {
        console.error('Failed to sync substitution notification class:', syncError);
        setError('Klasse gespeichert, aber der Benachrichtigungsfilter konnte nicht synchronisiert werden.');
      }
    } else {
      setError('Klasse lokal gespeichert. Die Synchronisierung erfolgt beim nächsten Versuch.');
    }
    setSaving(false);
  };

  return (
    <section className="card">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300">
          <ClipboardDocumentListIcon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="item-title">Meine Klasse</h2>
          <p className="mt-0.5 text-sm text-surface-500">
            Diese Klasse filtert sowohl den Vertretungsplan als auch die zugehörigen Push-Benachrichtigungen.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4 border-t border-surface-100 pt-5 dark:border-surface-800">
        {loading ? (
        <p className="text-sm text-surface-500">Verfügbare Klassen werden geladen …</p>
        ) : (
          <div className="flex items-start gap-2 rounded-xl bg-surface-50 p-3 dark:bg-surface-800/70">
            <InformationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary-500" />
            <p className="text-sm text-surface-600 dark:text-surface-300">
              {ownClass ? (
                <>Automatisch erkannt: <strong className="font-semibold text-surface-900 dark:text-surface-100">{ownClass}</strong></>
              ) : availableClasses.length > 0 ? (
                  <>In deinem Profil wurde keine Klasse gefunden. Wähle unten eine aus dem aktuellen Plan aus.</>
              ) : (
                  <>Weder in deinem Profil noch im aktuellen Plan wurde eine Klasse gefunden.</>
              )}
            </p>
          </div>
        )}

        <div>
          <label className="label" htmlFor="vertretungsplan-class-override">Klasse auswählen</label>
          <input
            id="vertretungsplan-class-override"
            type="text"
            className="input text-sm"
            value={classOverride}
            onChange={event => setClassOverride(event.target.value)}
            placeholder={ownClass || 'z. B. 10a'}
            maxLength={100}
            disabled={saving}
          />
          <p className="mt-1.5 text-xs text-surface-500">
            Lass das Feld leer, um die Klasse aus deinem Schulprofil zu verwenden. Eine eigene Klasse gilt für Vertretungen und Benachrichtigungen.
          </p>
        </div>

        {availableClasses.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-surface-400 dark:text-surface-500">Im Plan gefunden</p>
            <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto p-1">
              {availableClasses.map(className => {
                const selected = classOverride.trim().toLocaleLowerCase('de-DE') === className.toLocaleLowerCase('de-DE');
                return (
                  <button
                    key={className}
                    type="button"
                    onClick={() => setClassOverride(className)}
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/50 ${selected
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-900 dark:text-surface-300 dark:hover:bg-surface-700'}`}
                  >
                    {selected && <CheckIcon className="h-3.5 w-3.5" />}
                    {className}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && <p className="rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
        {message && <p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{message}</p>}

        <div className="flex justify-end">
          <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={saving}>
            {saving ? 'Wird gespeichert …' : 'Klasse speichern'}
          </button>
        </div>
      </div>
    </section>
  );
};

export default VertretungsplanSettings;
