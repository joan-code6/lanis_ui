const origins = new Set(['https://lanis.arg-server.de', 'https://localhost']);
const allowedPath = /^\/(dashboard|timetable|messages|vertretungsplan|dsb|courses|calendar|settings|profile|dateispeicher|dateiverteilung|videokonferenz|wahlen|study-groups)(\/|$)/;

export function nativeRoute(value: string): string | null {
  try {
    const url = new URL(value, 'https://lanis.arg-server.de');
    if (url.username || url.password || !origins.has(url.origin) || !allowedPath.test(url.pathname)) return null;
    return url.pathname + url.search + url.hash;
  } catch { return null; }
}

/** Android Back at a history root stays within the current app mode. */
export function nativeBackFallback(pathname: string): string | null {
  const home = pathname.startsWith('/demo/') ? '/demo/dashboard' : '/dashboard';
  return [home, '/login', '/onboarding'].includes(pathname) ? null : home;
}
