import { useEffect, useState } from 'react';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import { LanisNative } from '../../platform/native';

export default function AppLockSettings() {
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let current = true;
    void LanisNative.getStatus().then(status => {
      if (current) { setEnabled(status.appLockEnabled); setAvailable(status.appLockAvailable); }
    }).catch(() => { if (current) setError('App-Sperre nicht erreichbar. Öffne die Einstellungen erneut.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);

  const toggle = async () => {
    setLoading(true); setError('');
    try {
      const status = await LanisNative.setAppLock({ enabled: !enabled });
      setEnabled(status.appLockEnabled); setAvailable(status.appLockAvailable);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Nicht geändert. Bitte erneut versuchen.');
    } finally { setLoading(false); }
  };

  return <section className="card" aria-labelledby="app-lock-heading">
    <div className="flex items-start gap-3">
      <LockClosedIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary-600 dark:text-primary-400" />
      <div className="min-w-0 flex-1">
        <h2 id="app-lock-heading" className="font-semibold text-surface-950 dark:text-white">App-Sperre</h2>
        <p id="app-lock-description" className="mt-1 text-sm text-surface-500 dark:text-surface-400">Bei jedem Öffnen mit Biometrie oder Geräte-PIN entsperren.</p>
      </div>
      <button type="button" role="switch" aria-checked={enabled} aria-label="App-Sperre" aria-describedby="app-lock-description" disabled={loading || !available} onClick={() => void toggle()}
        className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-40">
        <span className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${enabled ? 'bg-primary-600' : 'bg-surface-300 dark:bg-surface-600'}`}>
          <span className={`h-5 w-5 rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </span>
      </button>
    </div>
    {!loading && !available && !error && <p className="mt-3 text-sm text-surface-500 dark:text-surface-400">Richte zuerst eine Gerätesperre in Android ein.</p>}
    {enabled && <p className="mt-3 text-xs text-surface-500 dark:text-surface-400">Widgets und Benachrichtigungen verbergen Inhalte.</p>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
  </section>;
}
