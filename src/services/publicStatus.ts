import { useEffect, useState } from 'react';
import { getApiBaseUrl } from '../utils/backendConfig';

export type ServiceStatus = 'up' | 'degraded' | 'down' | 'unknown';
export interface Observation {
  status: ServiceStatus;
  checked_at: string | null;
  features: { name: string; status: ServiceStatus }[];
}
interface Availability {
  checks: number;
  available_checks: number;
  failed_checks: number;
  unknown_checks: number;
  uptime_percent: number | null;
  coverage_percent: number;
}
export interface PublicStatus {
  success: true;
  service: string;
  generated_at: string;
  current: Observation & { stale: boolean };
  summary: Availability & { period_days: number };
  daily: (Availability & { day: string; status: ServiceStatus })[];
  incidents: Observation[];
  measurement: { interval_seconds: number; stale_after_seconds: number; period_start: string; period_end: string; description: string };
}
export const statusLabels: Record<ServiceStatus, string> = {
  up: 'Erreichbar', degraded: 'Eingeschränkt', down: 'Nicht erreichbar', unknown: 'Unbekannt',
};
export const statusColors: Record<ServiceStatus, string> = {
  up: 'bg-emerald-500', degraded: 'bg-amber-500', down: 'bg-rose-500', unknown: 'bg-surface-300 dark:bg-surface-600',
};
export function formatTimestamp(value: string | null): string {
  return value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : 'Noch keine Messung';
}
export function formatPercent(value: number | null): string {
  return value === null ? '—' : `${value.toLocaleString('de-DE', { maximumFractionDigits: 2 })} %`;
}
export function freshStatus(data: PublicStatus | null): ServiceStatus {
  if (!data || data.current.stale || !data.current.checked_at) return 'unknown';
  const age = Date.now() - Date.parse(data.current.checked_at);
  return Number.isFinite(age) && age >= -60_000 && age <= data.measurement.stale_after_seconds * 1000
    ? data.current.status : 'unknown';
}
export function usePublicStatus(enabled = true) {
  const [data, setData] = useState<PublicStatus | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let controller: AbortController | undefined;
    const refresh = async () => {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      const timeout = window.setTimeout(() => request.abort(), 8000);
      try {
        const response = await fetch(`${getApiBaseUrl()}/status`, {
          signal: request.signal, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
        });
        if (!response.ok) throw new Error('Status unavailable');
        const value = await response.json();
        if (value.success !== true || !value.current || !value.summary || !value.measurement
          || !Array.isArray(value.daily) || !Array.isArray(value.incidents)
          || !Number.isFinite(value.measurement.stale_after_seconds)
          || !Number.isFinite(value.summary.coverage_percent)
          || (value.summary.uptime_percent !== null && !Number.isFinite(value.summary.uptime_percent))
          || value.daily.some((day: any) => !day || !Object.prototype.hasOwnProperty.call(statusLabels, day.status) || typeof day.day !== 'string' || !Number.isFinite(day.coverage_percent) || (day.uptime_percent !== null && !Number.isFinite(day.uptime_percent)))
          || value.incidents.some((item: any) => !item || !Object.prototype.hasOwnProperty.call(statusLabels, item.status))
          || !Object.prototype.hasOwnProperty.call(statusLabels, value.current.status)) throw new Error('Invalid status');
        if (active && controller === request) { setData(value); setError(false); }
      } catch {
        if (active && controller === request) { setData(null); setError(true); }
      } finally {
        window.clearTimeout(timeout);
        if (active && controller === request) setLoading(false);
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => { active = false; controller?.abort(); window.clearInterval(timer); };
  }, [enabled, revision]);
  return { data, loading, error, status: freshStatus(data), refresh: () => setRevision(value => value + 1) };
}
