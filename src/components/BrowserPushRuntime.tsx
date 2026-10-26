import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { canWriteAccountData, captureAccountDataGeneration } from '../utils/accountDataWrites';
import { repairBrowserPushRegistration } from '../utils/browserPush';

export default function BrowserPushRuntime() {
  const { token, isAuthenticated, user } = useAuth();
  const { pathname } = useLocation();
  const inactive = pathname.startsWith('/demo') || /^\/settings\/+notifications(?:\/|$)/i.test(pathname);

  useEffect(() => {
    const native = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
    if (native || inactive || !isAuthenticated || !token) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const controller = new AbortController();
    const generation = captureAccountDataGeneration();
    const refreshToken = localStorage.getItem('auth_refresh_token');
    if (!refreshToken) return;
    const isCurrent = () => canWriteAccountData(generation)
      && localStorage.getItem('auth_refresh_token') === refreshToken;
    let running = false;
    let nextAttemptAt = 0;
    const repairState = { renewalPending: false };
    const repair = async () => {
      if (running || document.visibilityState !== 'visible' || !navigator.onLine
        || Date.now() < nextAttemptAt) return;
      running = true;
      nextAttemptAt = Date.now() + 60_000;
      try {
        const result = await repairBrowserPushRegistration(token, controller.signal, isCurrent, repairState);
        if (result === 'registered' || result === 'inactive') nextAttemptAt = Date.now() + 15 * 60_000;
      } catch (error) {
        if (!controller.signal.aborted) console.warn('Browser push registration will retry:', error);
      } finally {
        running = false;
      }
    };
    void repair();
    // Re-register after server migrations/restarts or browser endpoint renewal,
    // even when the user never revisits notification settings.
    const interval = window.setInterval(repair, 60_000);
    window.addEventListener('online', repair);
    window.addEventListener('focus', repair);
    document.addEventListener('visibilitychange', repair);
    navigator.serviceWorker?.addEventListener('controllerchange', repair);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener('online', repair);
      window.removeEventListener('focus', repair);
      document.removeEventListener('visibilitychange', repair);
      navigator.serviceWorker?.removeEventListener('controllerchange', repair);
    };
  }, [inactive, isAuthenticated, token, user?.school_id, user?.username]);
  return null;
}
