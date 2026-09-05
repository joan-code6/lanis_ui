import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { whatsappAPI } from '../../services/api';
import { WhatsAppPairingResponse, WhatsAppStatusResponse } from '../../types';

const emptyStatus: WhatsAppStatusResponse = {
  success: true,
  configured: false,
  linked: false,
  phone_suffix: '',
  linked_at: null,
  show_message_previews: false,
};

const WhatsAppSettings: React.FC = () => {
  const { token } = useAuth();
  const [status, setStatus] = useState<WhatsAppStatusResponse>(emptyStatus);
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [pairing, setPairing] = useState<WhatsAppPairingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [savingPreviews, setSavingPreviews] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [copied, setCopied] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const latestStatusRequest = useRef(0);
  const statusRequestInFlight = useRef<number | null>(null);
  const preferenceRequestInFlight = useRef(false);

  const loadStatus = useCallback(async (signal?: AbortSignal) => {
    if (!token || statusRequestInFlight.current !== null) return;
    const requestId = ++latestStatusRequest.current;
    statusRequestInFlight.current = requestId;
    try {
      const next = await whatsappAPI.getStatus(token, signal);
      if (requestId !== latestStatusRequest.current) return;
      setError('');
      setStatus(next);
      setStatusLoaded(true);
      if (next.linked) {
        setPairing(null);
        setMessage('WhatsApp wurde erfolgreich verbunden.');
      }
    } catch (statusError) {
      if (signal?.aborted || requestId !== latestStatusRequest.current) return;
      setError(statusError instanceof Error ? statusError.message : 'Der WhatsApp-Status konnte nicht geladen werden.');
    } finally {
      if (statusRequestInFlight.current === requestId) {
        statusRequestInFlight.current = null;
      }
      if (!signal?.aborted && requestId === latestStatusRequest.current) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    void loadStatus(controller.signal);
    return () => {
      controller.abort();
      latestStatusRequest.current += 1;
      statusRequestInFlight.current = null;
    };
  }, [loadStatus]);

  useEffect(() => {
    if (!pairing || status.linked) return undefined;
    const check = () => void loadStatus();
    const interval = window.setInterval(check, 3000);
    window.addEventListener('focus', check);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', check);
    };
  }, [loadStatus, pairing, status.linked]);

  useEffect(() => {
    if (!pairing) return undefined;
    const remaining = new Date(pairing.expires_at).getTime() - Date.now();
    if (remaining <= 0) {
      setPairing(null);
      setError('Der Verbindungscode ist abgelaufen. Erzeuge einen neuen Code.');
      return undefined;
    }
    const timeout = window.setTimeout(() => {
      setPairing(null);
      setError('Der Verbindungscode ist abgelaufen. Erzeuge einen neuen Code.');
    }, remaining);
    return () => window.clearTimeout(timeout);
  }, [pairing]);

  const createPairing = async () => {
    if (!token) return;
    setWorking(true);
    setError('');
    setMessage('');
    try {
      const response = await whatsappAPI.createPairing(token);
      if (!response.success) throw new Error('Der Server hat den Verbindungscode abgelehnt.');
      setPairing(response);
    } catch (pairingError) {
      setError(pairingError instanceof Error ? pairingError.message : 'Der Verbindungscode konnte nicht erzeugt werden.');
    } finally {
      setWorking(false);
    }
  };

  const savePreviews = async (enabled: boolean) => {
    if (!token || preferenceRequestInFlight.current) return;
    const previous = status.show_message_previews;
    preferenceRequestInFlight.current = true;
    setSavingPreviews(true);
    setStatus(current => ({ ...current, show_message_previews: enabled }));
    setError('');
    setMessage('');
    try {
      const response = await whatsappAPI.updatePreferences(token, enabled);
      if (!response.success) throw new Error('Der Server hat die Einstellung abgelehnt.');
      setMessage(enabled ? 'Nachrichtenvorschauen sind aktiviert.' : 'Nachrichtenvorschauen sind deaktiviert.');
    } catch (preferencesError) {
      setStatus(current => ({ ...current, show_message_previews: previous }));
      setError(preferencesError instanceof Error ? preferencesError.message : 'Die Einstellung konnte nicht gespeichert werden.');
    } finally {
      preferenceRequestInFlight.current = false;
      setSavingPreviews(false);
    }
  };

  const unlink = async () => {
    if (!token) return;
    setWorking(true);
    setError('');
    try {
      const response = await whatsappAPI.unlink(token);
      if (!response.success) throw new Error('Der Server hat das Trennen der Verbindung abgelehnt.');
      latestStatusRequest.current += 1;
      setStatus(current => ({ ...current, linked: false, phone_suffix: '', linked_at: null, show_message_previews: false }));
      setPairing(null);
      setConfirmUnlink(false);
      setMessage('Die WhatsApp-Verbindung wurde getrennt.');
    } catch (unlinkError) {
      setError(unlinkError instanceof Error ? unlinkError.message : 'Die Verbindung konnte nicht getrennt werden.');
    } finally {
      setWorking(false);
    }
  };

  const copyCode = async () => {
    if (!pairing) return;
    try {
      await navigator.clipboard.writeText(`LANIS ${pairing.code}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Der Code konnte nicht automatisch kopiert werden. Markiere ihn bitte manuell.');
    }
  };

  if (loading) {
    return (
      <div className="card flex items-center gap-3 text-sm text-surface-500">
        <ArrowPathIcon className="h-5 w-5 animate-spin" />
        WhatsApp-Status wird geladen…
      </div>
    );
  }

  if (!statusLoaded) {
    return (
      <div className="card">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <ExclamationTriangleIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-surface-900 dark:text-surface-100">Status nicht erreichbar</h2>
            <p className="mt-1 text-sm leading-6 text-surface-500 dark:text-surface-400">
              Die WhatsApp-Einstellungen konnten nicht geladen werden. Prüfe deine Verbindung und versuche es erneut.
            </p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setError('');
                void loadStatus();
              }}
              className="btn btn-secondary mt-4"
            >
              <ArrowPathIcon className="mr-2 h-4 w-4" />
              Erneut versuchen
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!status.configured) {
    return (
      <div className="card">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <ExclamationTriangleIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-surface-900 dark:text-surface-100">Noch nicht verfügbar</h2>
            <p className="mt-1 text-sm leading-6 text-surface-500 dark:text-surface-400">
              Der WhatsApp-Assistent wurde auf diesem LANIS-Server noch nicht eingerichtet. Deine Kontodaten wurden nicht geteilt.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="card overflow-hidden !p-0">
        <div className="flex items-start gap-4 border-b border-surface-100 px-5 py-5 dark:border-surface-800 sm:px-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <ChatBubbleLeftRightIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-surface-900 dark:text-surface-100">LANIS auf WhatsApp</h2>
              <span className={`badge ${status.linked ? 'badge-primary' : 'badge-surface'}`}>
                {status.linked ? 'Verbunden' : 'Nicht verbunden'}
              </span>
            </div>
            <p className="mt-1 text-sm leading-6 text-surface-500 dark:text-surface-400">
              Frage nach deinem Stundenplan, Vertretungen, Hausaufgaben, Klausuren, Terminen oder ungelesenen Nachrichten.
            </p>
          </div>
        </div>

        {!status.linked && !pairing && (
          <div className="px-5 py-5 sm:px-6">
            <ol className="space-y-3 text-sm text-surface-600 dark:text-surface-300">
              <li className="flex gap-3"><span className="font-semibold text-primary-600">1.</span>Erzeuge einen einmaligen Verbindungscode.</li>
              <li className="flex gap-3"><span className="font-semibold text-primary-600">2.</span>Sende die vorbereitete Nachricht an den LANIS-Assistenten.</li>
              <li className="flex gap-3"><span className="font-semibold text-primary-600">3.</span>Die Verbindung wird auf dieser Seite automatisch bestätigt.</li>
            </ol>
            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-surface-200 p-4 dark:border-surface-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                checked={consentAccepted}
                onChange={event => setConsentAccepted(event.target.checked)}
              />
              <span className="text-xs leading-5 text-surface-600 dark:text-surface-300">
                Ich möchte mein Konto freiwillig mit WhatsApp verbinden und habe die Hinweise in der{' '}
                <Link to="/privacy-policy" className="font-medium text-primary-600 underline underline-offset-2 dark:text-primary-400">
                  Datenschutzerklärung
                </Link>{' '}
                gelesen.
              </span>
            </label>
            <button type="button" onClick={() => void createPairing()} disabled={working || !consentAccepted} className="btn btn-primary mt-4 disabled:cursor-not-allowed disabled:opacity-50">
              {working ? 'Code wird erzeugt…' : 'WhatsApp verbinden'}
            </button>
          </div>
        )}

        {!status.linked && pairing && (
          <div className="space-y-4 px-5 py-5 sm:px-6">
            <div className="rounded-xl border border-primary-200 bg-primary-50/70 p-4 dark:border-primary-900 dark:bg-primary-950/30">
              <p className="text-xs font-medium uppercase tracking-wide text-primary-700 dark:text-primary-300">Dein einmaliger Code</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <code className="rounded-lg bg-white px-3 py-2 text-lg font-semibold tracking-widest text-surface-900 shadow-sm dark:bg-surface-900 dark:text-white">
                  {pairing.code}
                </code>
                <button type="button" onClick={() => void copyCode()} className="btn btn-secondary h-10 text-sm">
                  {copied ? <CheckCircleIcon className="mr-2 h-4 w-4" /> : <ClipboardDocumentIcon className="mr-2 h-4 w-4" />}
                  {copied ? 'Kopiert' : 'Code kopieren'}
                </button>
              </div>
              <p className="mt-3 text-xs leading-5 text-surface-500">Der Code ist zehn Minuten gültig und kann nur einmal verwendet werden.</p>
            </div>
            <a href={pairing.link_url} target="_blank" rel="noreferrer" className="btn btn-primary inline-flex">
              Nachricht in WhatsApp öffnen
              <ArrowTopRightOnSquareIcon className="ml-2 h-4 w-4" />
            </a>
            <button type="button" onClick={() => void createPairing()} disabled={working} className="btn btn-ghost text-sm disabled:opacity-50">
              <ArrowPathIcon className={`mr-2 h-4 w-4 ${working ? 'animate-spin' : ''}`} />
              Neuen Code erzeugen
            </button>
            <p className="text-xs text-surface-500" aria-live="polite">Warte auf die Bestätigung aus WhatsApp…</p>
          </div>
        )}

        {status.linked && (
          <div className="space-y-5 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950/30">
              <CheckCircleIcon className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Nummer mit Endung •••• {status.phone_suffix}</p>
                <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">Der Assistent darf Daten für dieses LANIS-Konto abrufen.</p>
              </div>
            </div>

            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-surface-200 p-4 dark:border-surface-700">
              <span>
                <span className="block text-sm font-medium text-surface-900 dark:text-surface-100">Nachrichtenvorschauen anzeigen</span>
                <span className="mt-1 block text-xs leading-5 text-surface-500">Zeigt Absender und Betreff ungelesener Schulportal-Nachrichten im WhatsApp-Chat. Standardmäßig aus.</span>
              </span>
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                checked={status.show_message_previews}
                disabled={savingPreviews}
                onChange={event => void savePreviews(event.target.checked)}
              />
            </label>

            {!confirmUnlink ? (
              <button type="button" onClick={() => setConfirmUnlink(true)} className="btn btn-ghost text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30">
                <TrashIcon className="mr-2 h-4 w-4" />
                Verbindung trennen
              </button>
            ) : (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
                <p className="text-sm font-medium text-red-900 dark:text-red-100">WhatsApp wirklich trennen?</p>
                <p className="mt-1 text-xs text-red-700 dark:text-red-300">Der Bot kann danach keine persönlichen LANIS-Daten mehr für diese Nummer abrufen.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void unlink()} disabled={working} className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">Jetzt trennen</button>
                  <button type="button" onClick={() => setConfirmUnlink(false)} disabled={working} className="btn btn-secondary">Abbrechen</button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="card">
        <div className="flex items-start gap-3">
          <ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
          <div>
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Datenschutz zuerst</h3>
            <p className="mt-1 text-sm leading-6 text-surface-500 dark:text-surface-400">
              Dein Schulportal-Passwort wird niemals an WhatsApp gesendet. Der Bot arbeitet nur auf deine Anfrage, antwortet nicht in Gruppen und verändert keine Daten im Schulportal. Beachte, dass Inhalte des Chats von WhatsApp und dem Betreiber des Bots verarbeitet werden.
            </p>
          </div>
        </div>
      </section>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">{error}</p>}
      {message && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" aria-live="polite">{message}</p>}
    </div>
  );
};

export default WhatsAppSettings;
