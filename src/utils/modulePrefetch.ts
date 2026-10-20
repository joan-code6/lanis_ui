import type { Module, UserPreferences } from '../types';
import { readAPI } from '../services/api';
import { normalizeSidebarOrder } from './sidebarNavigation';

export function moduleDestination(module: Module): string | undefined {
  const links = `${module.url} ${module.direct_url || ''}`.toLowerCase();
  const name = module.name.toLowerCase();
  const destinations = [
    ['nachrichten', 'messages'], ['meinunterricht', 'courses'], ['kalender', 'calendar'],
    ['videokonferenz', 'videokonferenz'], ['stundenplan', 'timetable'], ['lerngruppen', 'study-groups'],
    ['oberstufenwahl', 'wahlen'], ['dateispeicher', 'dateispeicher'], ['dateiverteilung', 'dateiverteilung'],
  ];
  for (const [app, route] of destinations) {
    if (links.includes(`/${app}.php`) || name.includes(app) || (route === 'wahlen' && name.includes('wahlen'))) return route;
  }
  if (links.includes('dsb') || name.includes('dsb')) return 'dsb';
  if (links.includes('/vertretungsplan.php') || name.includes('vertretungsplan')) return 'vertretungsplan';
}

export function modulePreloadOrder(modules: Module[], preferences: UserPreferences): string[] {
  const visible = modules.filter(module => !preferences.dashboard.hidden_modules.includes(module.name));
  const pinned = preferences.dashboard.pinned_modules.flatMap(name => visible.filter(module => module.name === name));
  const available = new Set(modules.map(moduleDestination).filter(Boolean));
  return [...new Set([
    ...pinned.map(moduleDestination),
    ...normalizeSidebarOrder(preferences.sidebar.order)
      .filter(id => !preferences.sidebar.hidden_items.includes(id) && available.has(id)),
    ...visible.map(moduleDestination),
  ].filter((id): id is string => Boolean(id)))];
}

export async function prefetchModule(id: string, token: string, preferences: UserPreferences): Promise<void> {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (!navigator.onLine || connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType || '')) return;
  const requests: Record<string, [string, Record<string, unknown>?][]> = {
    messages: [['/nachrichten/headers', { get_type: 'All', last: 0 }]],
    courses: [['/meinunterricht']],
    calendar: [['/kalender'], ['/kalender/events', { year: 0, start: 'year', category: '', search: '' }]],
    timetable: [['/stundenplan/view', { view_mode: preferences.timetable.view_mode, plan_mode: 'personal', show_substitutions: preferences.timetable.show_substitutions }]],
    'study-groups': [['/lerngruppen']],
    dateispeicher: [['/dateispeicher', { folder_id: 0 }]],
    dateiverteilung: [['/dateiverteilung']],
    vertretungsplan: [['/vertretungsplan']],
    videokonferenz: [['/videokonferenz']],
    dsb: [['/dsb/school-plan']],
    wahlen: [['/wahlen']],
  };
  for (const [url, params] of requests[id] || []) {
    try {
      await readAPI(url, { headers: { 'X-Session-Token': token }, params }, true);
    } catch {
      // Speculation is optional. Navigation retries failures normally.
      return;
    }
  }
}
