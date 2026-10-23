import React, { useEffect, useState } from 'react';
import type { Root } from 'react-dom/client';
import { appStorage, isImpersonating } from './utils/appStorage';
import { clearSignedOutAccountData } from './utils/accountDataWrites';
import { DEFAULT_API_BASE_URL } from './utils/backendConfig';

function PreviewShell({ children }: { children: React.ReactNode }) {
  const [remaining, setRemaining] = useState(0);
  const [ended, setEnded] = useState(false);
  const user = JSON.parse(appStorage.getItem('auth_user') || '{}');
  useEffect(() => {
    let ending = false;
    const end = () => {
      if (ending) return;
      ending = true;
      const token = appStorage.getItem('auth_access_token');
      clearSignedOutAccountData();
      setEnded(true);
      if (token) void fetch(`${DEFAULT_API_BASE_URL}/impersonation/end`, {
        method: 'POST', headers: { 'X-Session-Token': token }, cache: 'no-store',
      }).catch(() => {});
    };
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((Number(appStorage.getItem('auth_expires_at')) - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0) end();
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    window.addEventListener('lanis-preview-end', end);
    return () => { clearInterval(timer); window.removeEventListener('lanis-preview-end', end); };
  }, []);
  if (ended) return <PreviewMessage title="Vorschau beendet" description="Die Vorschau wurde geschlossen. Du kannst diesen Tab jetzt schließen." />;
  return <div className="flex h-[100dvh] flex-col"><div role="region" aria-label="Kontovorschau" className="z-[100] flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm">
    <div><p className="text-sm font-semibold">Kontovorschau · Nur lesen</p><p className="text-xs">{user.username} · Schule {user.school_id} · {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')} verbleibend</p></div>
    <button className="rounded-lg border border-amber-300 px-3 py-2 text-sm font-medium hover:bg-amber-100 focus-visible:outline focus-visible:outline-2" onClick={() => window.dispatchEvent(new Event('lanis-preview-end'))}>Vorschau beenden</button>
    <p className="w-full text-xs">Änderungen, Nachrichteninhalte, Downloads und externe Beitrittslinks sind in dieser Vorschau gesperrt.</p>
  </div><div className="relative min-h-0 flex-1 [transform:translateZ(0)]">{children}</div></div>;
}

function PreviewMessage({ title, description }: { title: string; description: string }) {
  return <main className="flex min-h-screen items-center justify-center bg-surface-50 p-6"><div className="max-w-md rounded-2xl border border-surface-200 bg-white p-8 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wider text-primary-600">LANIS · Kontovorschau</p><h1 className="mt-3 text-2xl font-semibold text-surface-900">{title}</h1><p role="status" className="mt-3 text-sm text-surface-600">{description}</p></div></main>;
}

export async function mountApplication(root: Root) {
  if (isImpersonating) {
    // Capture once, remove before any API request or app rendering. Never log it.
    const code = new URLSearchParams(window.location.hash.slice(1)).get('impersonate');
    if (code) window.history.replaceState(null, '', '/dashboard');
    root.render(<PreviewMessage title="Vorschau wird geöffnet" description="Eine isolierte Sitzung wird vorbereitet …" />);
    try {
      if (code) {
        appStorage.clear();
        const response = await fetch(`${DEFAULT_API_BASE_URL}/impersonation/exchange`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }), cache: 'no-store', credentials: 'omit',
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        appStorage.setItem('auth_access_token', data.access_token);
        appStorage.setItem('auth_expires_at', String(data.expires_at * 1000));
        appStorage.setItem('auth_user', JSON.stringify({ username: data.username, school_id: data.school_id, encryption_ready: 'true' }));
      }
      if (!appStorage.getItem('auth_access_token') || Number(appStorage.getItem('auth_expires_at')) <= Date.now()) throw new Error();
    } catch {
      appStorage.clear();
      root.render(<PreviewMessage title="Vorschau nicht verfügbar" description="Der Link ist abgelaufen, wurde bereits verwendet oder die Sitzung ist nicht mehr verfügbar. Öffne eine neue Vorschau im Adminportal." />);
      return;
    }
  }
  const { default: App } = await import('./App');
  root.render(isImpersonating ? <PreviewShell><App /></PreviewShell> : <React.StrictMode><App /></React.StrictMode>);
}
