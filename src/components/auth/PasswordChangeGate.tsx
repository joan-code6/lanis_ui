import { useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowLeftOnRectangleIcon, ArrowPathIcon, KeyIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';
import './PasswordChangeGate.css';

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
    <main className="password-change-page">
      <div className="card password-change-card">
        <div className="password-change-emblem">
          <div><KeyIcon aria-hidden="true" /></div>
        </div>
        <h1>Ändere zuerst dein Passwort</h1>
        <div className="password-change-copy">
          <p>
            Das Schulportal verlangt ein neues Passwort, bevor du LANIS nutzen kannst.
          </p>
          <p>
            Ändere es im Schulportal. Komm danach hierher zurück und klicke auf „Erneut versuchen“.
          </p>
        </div>
        <div className="password-change-actions">
          <a className="btn btn-primary password-change-primary" href="https://start.schulportal.hessen.de/benutzerverwaltung.php?a=userChangePassword" target="_blank" rel="noopener noreferrer">
            Passwort im Schulportal ändern
          </a>
          <button className="btn btn-ghost password-change-retry" type="button" disabled={checking} onClick={() => void retry()}>
            <ArrowPathIcon className={`mr-2 h-4 w-4${checking ? ' animate-spin' : ''}`} aria-hidden="true" />
            {checking ? 'Wird geprüft…' : 'Erneut versuchen'}
          </button>
        </div>
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {token && <button type="button" className="btn btn-ghost password-change-logout" disabled={checking} onClick={() => void handleLogout()}>
          <ArrowLeftOnRectangleIcon aria-hidden="true" />
          Abmelden
        </button>}
      </div>
    </main>
  );
}
