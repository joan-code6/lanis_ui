export const CUSTOM_BACKEND_STORAGE_KEY = 'lanis_custom_backend_url';

export const DEFAULT_API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:8000'
).replace(/\/+$/, '');

const BACKEND_SCOPED_STORAGE_KEYS = [
  'auth_access_token',
  'auth_refresh_token',
  'auth_expires_at',
  'auth_user',
  'school_cache',
  'modules_cache',
  'messages_cache',
  'courses_cache',
  'profile_cache',
  'username_cache',
  'dsb_plan_cache_v2',
];

export function normalizeBackendUrl(value: string): string {
  const input = value.trim();
  if (!input) {
    throw new Error('Gib eine Backend-Adresse ein.');
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error('Gib eine vollständige URL mit http:// oder https:// ein.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Die Adresse muss mit http:// oder https:// beginnen.');
  }
  if (url.username || url.password) {
    throw new Error('Die Backend-Adresse darf keine Zugangsdaten enthalten.');
  }
  if (url.search || url.hash) {
    throw new Error('Die Backend-Adresse darf keine Abfrage oder Sprungmarke enthalten.');
  }

  url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString().replace(/\/+$/, '');
}

export function getCustomBackendUrl(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = window.localStorage.getItem(CUSTOM_BACKEND_STORAGE_KEY);
    return stored ? normalizeBackendUrl(stored) : null;
  } catch {
    return null;
  }
}

export function getApiBaseUrl(): string {
  return getCustomBackendUrl() || DEFAULT_API_BASE_URL;
}

export function setCustomBackendUrl(value: string): string {
  const normalized = normalizeBackendUrl(value);
  window.localStorage.setItem(CUSTOM_BACKEND_STORAGE_KEY, normalized);
  return normalized;
}

export function resetCustomBackendUrl(): void {
  window.localStorage.removeItem(CUSTOM_BACKEND_STORAGE_KEY);
}

export function clearBackendScopedStorage(): void {
  for (const key of BACKEND_SCOPED_STORAGE_KEYS) {
    window.localStorage.removeItem(key);
  }
}

export async function checkBackendHealth(value: string): Promise<string> {
  const normalized = normalizeBackendUrl(value);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${normalized}/health`, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Das Backend antwortet mit HTTP ${response.status}.`);
    }

    const data: unknown = await response.json();
    if (
      typeof data !== 'object'
      || data === null
      || !('status' in data)
      || data.status !== 'ok'
    ) {
      throw new Error('Die /health-Antwort stammt nicht von einem kompatiblen LANIS-Backend.');
    }
    return normalized;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Das Backend hat nicht innerhalb von 8 Sekunden geantwortet.');
    }
    if (error instanceof TypeError) {
      throw new Error('Das Backend konnte nicht erreicht werden. Prüfe Adresse, HTTPS und CORS-Freigabe.');
    }
    if (error instanceof Error) throw error;
    throw new Error('Das Backend konnte nicht erreicht werden.');
  } finally {
    window.clearTimeout(timeout);
  }
}
