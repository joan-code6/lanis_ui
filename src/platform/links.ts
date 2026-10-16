const origins = new Set(['https://lanis.arg-server.de', 'https://localhost']);
const allowedPath = /^\/(dashboard|timetable|messages|vertretungsplan|dsb|courses|calendar|settings|profile|dateispeicher|study-groups)(\/|$)/;

export function nativeRoute(value: string): string | null {
  try {
    const url = new URL(value, 'https://lanis.arg-server.de');
    if (url.username || url.password || !origins.has(url.origin) || !allowedPath.test(url.pathname)) return null;
    return url.pathname + url.search + url.hash;
  } catch { return null; }
}
