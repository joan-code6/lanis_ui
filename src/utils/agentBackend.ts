import { normalizeBackendUrl } from './backendConfig';

// Return destinations are limited to the two agent flows, never arbitrary URLs.
export function agentReturnPath(value: string | null): string | null {
  if (!value || !value.startsWith('/')) return null;
  try {
    const url = new URL(value, 'https://lanis.invalid');
    if (url.origin !== 'https://lanis.invalid' || !['/agents/authorize', '/settings/agents'].includes(url.pathname) || url.hash) return null;
    const issuer = url.searchParams.get('issuer');
    if (!issuer) return null;
    const params = new URLSearchParams({ issuer: normalizeBackendUrl(issuer) });
    if (url.pathname === '/agents/authorize') {
      const request = url.searchParams.get('request');
      if (!request || !/^[A-Za-z0-9_-]{1,200}$/.test(request)) return null;
      return '/agents/authorize?' + new URLSearchParams({ request, issuer: normalizeBackendUrl(issuer) });
    }
    return url.pathname + '?' + params;
  } catch { return null; }
}

export function agentBackendSwitchPath(request: string, issuer: string): string {
  const normalized = normalizeBackendUrl(issuer);
  const returnTo = '/agents/authorize?' + new URLSearchParams({ request, issuer: normalized });
  return '/set-custom-backend?' + new URLSearchParams({ backend: normalized, returnTo });
}

export function agentSettingsSwitchPath(issuer: string): string {
  const normalized = normalizeBackendUrl(issuer);
  return '/set-custom-backend?' + new URLSearchParams({ backend: normalized, returnTo: '/settings/agents?' + new URLSearchParams({ issuer: normalized }) });
}
