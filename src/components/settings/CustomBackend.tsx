import React, { useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  CircleStackIcon,
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
  ServerStackIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';
import {
  DEFAULT_API_BASE_URL,
  checkBackendHealth,
  clearBackendScopedStorage,
  getApiBaseUrl,
  getCustomBackendUrl,
  normalizeBackendUrl,
  resetCustomBackendUrl,
  setCustomBackendUrl,
} from '../../utils/backendConfig';
import { unsubscribeBrowserPushSubscription } from '../../services/api';
import SEO from '../seo/SEO';

type RequestState = 'idle' | 'checking' | 'success' | 'error';

const CustomBackend: React.FC = () => {
  const initialCustomUrl = useMemo(() => getCustomBackendUrl(), []);
  const [backendUrl, setBackendUrl] = useState(initialCustomUrl || getApiBaseUrl());
  const [requestState, setRequestState] = useState<RequestState>('idle');
  const [message, setMessage] = useState('');

  const currentUrl = getApiBaseUrl();
  const hasCustomBackend = initialCustomUrl !== null;

  const isInsecureRemoteUrl = useMemo(() => {
    try {
      const url = new URL(backendUrl.trim());
      return window.location.protocol === 'https:'
        && url.protocol === 'http:'
        && url.hostname !== 'localhost'
        && url.hostname !== '127.0.0.1'
        && url.hostname !== '[::1]';
    } catch {
      return false;
    }
  }, [backendUrl]);

  const prepareBackendSwitch = async () => {
    try {
      await unsubscribeBrowserPushSubscription();
    } catch (error) {
      console.warn('Failed to remove push subscription before switching backend:', error);
    }
    clearBackendScopedStorage();
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setRequestState('checking');
    setMessage('Verbindung wird geprüft …');

    try {
      const normalized = normalizeBackendUrl(backendUrl);
      await checkBackendHealth(normalized);
      await prepareBackendSwitch();
      setCustomBackendUrl(normalized);
      setRequestState('success');
      setMessage('Backend bestätigt. Lanis wird neu geladen …');
      window.setTimeout(() => window.location.replace('/login'), 450);
    } catch (error) {
      setRequestState('error');
      setMessage(error instanceof Error ? error.message : 'Das Backend konnte nicht geprüft werden.');
    }
  };

  const handleReset = async () => {
    setRequestState('checking');
    setMessage('Standard-Backend wird wiederhergestellt …');
    await prepareBackendSwitch();
    resetCustomBackendUrl();
    window.location.replace('/login');
  };

  return (
    <div className="min-h-[100dvh] bg-surface-50 px-4 py-8 text-surface-900 dark:bg-surface-950 dark:text-surface-100 sm:px-6 sm:py-12">
      <SEO
        title="Eigenes Backend festlegen"
        description="Ein eigenes LANIS-Backend für dieses Gerät konfigurieren."
        path="/set-custom-backend"
        noindex
      />

      <main className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Eigenes Backend verwenden</h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-surface-500 dark:text-surface-400">
            Lege fest, mit welchem LANIS-Backend dieser Browser kommuniziert. Die Einstellung gilt nur auf diesem Gerät.
          </p>
          <p className="mt-3 text-sm text-surface-500 dark:text-surface-400">
            Du möchtest ein eigenes Backend betreiben?{' '}
            <a
              href="https://github.com/joan-code6/lanis_api"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary-700 underline decoration-primary-300 underline-offset-4 transition-colors hover:text-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-primary-300 dark:decoration-primary-700 dark:hover:text-primary-200"
            >
              LANIS API auf GitHub
              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </p>
        </div>

        <section className="mb-5 overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-soft dark:border-surface-800 dark:bg-surface-900" aria-label="Aktuelle Verbindung">
          <div className="grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-2 px-4 py-5 sm:gap-4 sm:px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300">
              <ComputerDesktopIcon className="h-5 w-5" />
            </div>
            <div className="h-px bg-surface-200 dark:bg-surface-700" />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white shadow-soft-md">
              <ServerStackIcon className="h-6 w-6" />
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-surface-900" />
            </div>
            <div className="h-px bg-surface-200 dark:bg-surface-700" />
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300">
              <CircleStackIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="border-t border-surface-100 bg-surface-50/70 px-4 py-3 dark:border-surface-800 dark:bg-surface-950/40 sm:px-6">
            <p className="text-xs font-medium uppercase tracking-wider text-surface-400">Aktuell verwendet</p>
            <p className="mt-1 break-all font-mono text-sm text-surface-700 dark:text-surface-200">{currentUrl}</p>
          </div>
        </section>

        <form onSubmit={handleSave} className="rounded-2xl border border-surface-200 bg-white p-5 shadow-soft dark:border-surface-800 dark:bg-surface-900 sm:p-6">
          <label htmlFor="backend-url" className="block text-sm font-semibold text-surface-900 dark:text-surface-100">
            Backend-Adresse
          </label>
          <p id="backend-url-help" className="mt-1 text-sm text-surface-500">
            Vollständige Basis-URL einschließlich http:// oder https://
          </p>
          <input
            id="backend-url"
            type="url"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={backendUrl}
            onChange={(event) => {
              setBackendUrl(event.target.value);
              setRequestState('idle');
              setMessage('');
            }}
            aria-describedby="backend-url-help backend-security-warning"
            placeholder="https://lanis-api.example.com"
            className="input mt-3 font-mono text-sm"
            disabled={requestState === 'checking' || requestState === 'success'}
          />

          {isInsecureRemoteUrl && (
            <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200">
              <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
              <p>Diese HTTP-Adresse wird von einer per HTTPS geöffneten Website wahrscheinlich blockiert. Verwende für Geräte im Netzwerk möglichst HTTPS.</p>
            </div>
          )}

          <div id="backend-security-warning" className="mt-4 flex gap-3 rounded-xl bg-surface-50 p-3 text-sm leading-relaxed text-surface-600 dark:bg-surface-800/70 dark:text-surface-300">
            <ShieldExclamationIcon className="mt-0.5 h-5 w-5 shrink-0 text-surface-500" />
            <p>Verwende nur ein Backend, dem du vertraust. Deine Schule, dein Benutzername, dein Passwort und alle abgerufenen Schuldaten werden an diese Adresse gesendet.</p>
          </div>

          {message && (
            <div
              className={`mt-4 flex items-center gap-2 text-sm ${
                requestState === 'error'
                  ? 'text-red-600 dark:text-red-400'
                  : requestState === 'success'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-surface-500'
              }`}
              role={requestState === 'error' ? 'alert' : 'status'}
            >
              {requestState === 'checking' && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
              {requestState === 'success' && <CheckCircleIcon className="h-4 w-4" />}
              {message}
            </div>
          )}

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {hasCustomBackend && (
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={requestState === 'checking' || requestState === 'success'}
                  className="btn btn-ghost w-full text-surface-600 dark:text-surface-300 sm:w-auto"
                >
                  Standard wiederherstellen
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={requestState === 'checking' || requestState === 'success' || !backendUrl.trim()}
              className="btn btn-primary w-full sm:w-auto"
            >
              {requestState === 'checking' ? 'Verbindung wird geprüft …' : 'Prüfen und verwenden'}
            </button>
          </div>
        </form>

        <p className="mt-5 text-center text-xs leading-relaxed text-surface-400">
          Beim Wechsel werden die Anmeldung und zwischengespeicherte Schuldaten auf diesem Gerät gelöscht. Standard: {DEFAULT_API_BASE_URL}
        </p>
      </main>
    </div>
  );
};

export default CustomBackend;
