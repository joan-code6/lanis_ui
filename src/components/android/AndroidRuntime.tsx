import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import type { PluginListenerHandle } from '@capacitor/core';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { isAndroid, LanisNative } from '../../platform/native';
import { authStorage, flushAuthStorage, reloadNativeCredentials } from '../../platform/authStorage';
import { nativeRoute } from '../../platform/links';
import { THEME_COLOR_HEX } from '../../utils/themeAssets';

export default function AndroidRuntime() {
  const { isAuthenticated, token } = useAuth();
  const { isDark, themeColor } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = useRef(location.pathname);
  const authenticated = useRef(isAuthenticated);
  const pendingRoute = useRef<string | null>(null);
  const [failure, setFailure] = useState('');
  currentPath.current = location.pathname;
  authenticated.current = isAuthenticated;

  useEffect(() => {
    if (!isAndroid) return;
    let disposed = false;
    const handles: PluginListenerHandle[] = [];
    const track = async (promise: Promise<PluginListenerHandle>) => {
      const handle = await promise;
      if (disposed) await handle.remove(); else handles.push(handle);
    };
    const open = (url: string) => {
      const route = nativeRoute(url);
      if (!route) return;
      if (authenticated.current) navigate(route);
      else pendingRoute.current = route;
    };
    void track(App.addListener('appUrlOpen', ({ url }) => open(url)));
    void App.getLaunchUrl().then(result => { if (!disposed && result) open(result.url); });
    void track(App.addListener('backButton', () => {
      // Dialogs/drawers get first chance to consume the Android back gesture.
      const event = new Event('lanis:back', { cancelable: true });
      if (!window.dispatchEvent(event)) return;
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      const idx = window.history.state?.idx;
      if (typeof idx === 'number' && idx > 0) navigate(-1);
      else if (!['/dashboard', '/login', '/onboarding'].includes(currentPath.current)) navigate('/dashboard', { replace: true });
      else void App.minimizeApp();
    }));
    void track(App.addListener('appStateChange', async ({ isActive }) => {
      if (!isActive || !authenticated.current || currentPath.current.startsWith('/demo')) return;
      try {
        await reloadNativeCredentials();
        const status = await LanisNative.sync();
        await reloadNativeCredentials();
        if (!status.signedIn || !authStorage.getItem('auth_access_token')) { window.location.replace('/login'); return; }
        window.dispatchEvent(new Event('lanis:resume'));
      } catch { /* Cached timetable stays available during network interruptions. */ }
    }));
    const externalLink = (event: MouseEvent) => {
      const anchor = (event.target as Element)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.hasAttribute('download') || anchor.href.startsWith('blob:')) return;
      const url = new URL(anchor.href);
      if (url.origin === window.location.origin) return;
      if (!['https:', 'http:'].includes(url.protocol)) return;
      event.preventDefault();
      void Browser.open({ url: url.href }).catch(() => setFailure('Der Link konnte nicht geöffnet werden.'));
    };
    document.addEventListener('click', externalLink, true);
    return () => { disposed = true; handles.forEach(handle => void handle.remove()); document.removeEventListener('click', externalLink, true); };
  }, [navigate]);

  useEffect(() => {
    if (!isAndroid || !isAuthenticated || currentPath.current.startsWith('/demo')) return;
    if (pendingRoute.current) { navigate(pendingRoute.current); pendingRoute.current = null; }
    void flushAuthStorage().then(() => LanisNative.sync()).catch(() => setFailure('Offline-Daten konnten noch nicht aktualisiert werden.'));
  }, [isAuthenticated, token, navigate]);

  useEffect(() => {
    if (isAndroid) void LanisNative.setAppearance({ dark: isDark, accent: THEME_COLOR_HEX[themeColor] }).catch(() => {});
  }, [isDark, themeColor]);

  if (!isAndroid || !failure) return null;
  return <button type="button" role="status" className="native-toast" onClick={() => setFailure('')}>{failure}<span className="sr-only"> Schließen</span></button>;
}
