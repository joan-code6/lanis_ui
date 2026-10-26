import { getApiBaseUrl, normalizeBackendUrl } from './backendConfig';

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

// The suggested server comes from the validated return destination only.
export function agentBackendProposal(params: URLSearchParams): string | null {
  const returnTo = agentReturnPath(params.get('returnTo'));
  return returnTo ? new URL(returnTo, 'https://lanis.invalid').searchParams.get('issuer') : null;
}

// Normalize both hosts with the callback scheme, including explicit default ports.
export function agentCallbackUrl(value: string, expectedHost: string): string {
  const target = new URL(value);
  if (!['https:', 'http:'].includes(target.protocol)) throw new Error('Invalid callback');
  const expected = new URL(`${target.protocol}//${expectedHost}`);
  if (target.host !== expected.host) throw new Error('Invalid callback');
  return target.href;
}

export function agentLoginPath(destination: string): string {
  let returnTo = agentReturnPath(destination);
  if (!returnTo && destination.startsWith('/')) {
    try {
      const url = new URL(destination, 'https://lanis.invalid');
      if (url.origin === 'https://lanis.invalid' && !url.searchParams.has('issuer')) {
        url.searchParams.set('issuer', getApiBaseUrl());
        returnTo = agentReturnPath(url.pathname + url.search + url.hash);
      }
    } catch { /* Invalid destinations use the ordinary login route. */ }
  }
  return returnTo ? '/login?' + new URLSearchParams({ returnTo }) : '/login';
}
