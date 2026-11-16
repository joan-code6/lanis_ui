import { useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowPathIcon, KeyIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';

export default function PasswordChangeGate({ children }: { children: React.ReactNode }) {
  const { token, logout } = useAuth();
  const [required, setRequired] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleRequired = () => setRequired(true);
    window.addEventListener('lanis:password-change-required', handleRequired);
    return () => window.removeEventListener('lanis:password-change-required', handleRequired);
  }, []);

  const retry = async () => {
    if (!token) {
      // A redirect during login can occur before LANIS issues a session.
      setRequired(false);
      return;
    }
    setChecking(true);
    setError('');
    try {
      await authAPI.checkPasswordChange(token);
      setRequired(false);
    } catch (failure) {
      setError(axios.isAxiosError(failure) && failure.response?.data?.detail?.code === 'password_change_required'
        ? 'Bitte ändere zuerst dein Passwort im Schulportal.'
        : 'Die Prüfung hat nicht geklappt. Versuch es noch einmal.');
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    setChecking(true);
    try {
      await logout();
    } finally {
      setChecking(false);
      setRequired(false);
    }
  };

  if (!required) return <>{children}</>;

  return (
    <main className="min-h-[100dvh] flex items-center justify-center bg-surface-50 px-4 py-8 dark:bg-surface-950">
      <div className="card w-full max-w-md space-y-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
          <KeyIcon className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-100">Ändere zuerst dein Passwort</h1>
          <p className="text-sm text-surface-600 dark:text-surface-400">
            Das Schulportal verlangt ein neues Passwort, bevor du LANIS nutzen kannst.
          </p>
          <p className="text-sm text-surface-600 dark:text-surface-400">
            Ändere es im Schulportal. Komm danach hierher zurück und klicke auf „Erneut versuchen“.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <a className="btn btn-primary justify-center" href="https://start.schulportal.hessen.de/benutzerverwaltung.php?a=userChangePassword" target="_blank" rel="noopener noreferrer">
            Passwort im Schulportal ändern
          </a>
          <button className="btn btn-secondary justify-center" type="button" disabled={checking} onClick={() => void retry()}>
            {checking && <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            {checking ? 'Wird geprüft…' : 'Erneut versuchen'}
          </button>
        </div>
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {token && <div className="flex justify-center">
          <button type="button" className="btn btn-ghost !px-2 !py-1 !text-xs" disabled={checking} onClick={() => void handleLogout()}>
            Abmelden
          </button>
        </div>}
      </div>
    </main>
  );
}
