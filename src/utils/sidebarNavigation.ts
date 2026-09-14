export const SIDEBAR_ITEM_IDS = [
  'search',
  'divider',
  'dashboard',
  'messages',
  'dateispeicher',
  'dateiverteilung',
  'vertretungsplan',
  'dsb',
  'courses',
  'wahlen',
  'timetable',
  'study-groups',
  'calendar',
  'profile',
  'settings',
] as const;

export type SidebarItemId = typeof SIDEBAR_ITEM_IDS[number];

export const DEFAULT_SIDEBAR_ORDER: SidebarItemId[] = [
  'search',
  'dashboard',
  'messages',
  'dateispeicher',
  'dateiverteilung',
  'vertretungsplan',
  'dsb',
  'courses',
  'wahlen',
  'timetable',
  'study-groups',
  'calendar',
  'profile',
  'settings',
];

export const isDivider = (id: string): boolean => id === 'divider' || id.startsWith('divider-');

export const SIDEBAR_ITEM_LABELS: Record<string, string> = {
  search: 'Suche',
  divider: 'Trennlinie',
  dashboard: 'Dashboard',
  messages: 'Nachrichten',
  dateispeicher: 'Dateispeicher',
  dateiverteilung: 'Dateiverteilung',
  vertretungsplan: 'Vertretungsplan',
  dsb: 'DSBmobile',
  courses: 'Mein Unterricht',
  wahlen: 'Wahlen',
  timetable: 'Stundenplan',
  'study-groups': 'Lerngruppen',
  calendar: 'Kalender',
  profile: 'Profil',
  settings: 'Einstellungen',
};

export const getSidebarLabel = (id: string): string => {
  if (isDivider(id)) return 'Trennlinie';
  return SIDEBAR_ITEM_LABELS[id] ?? id;
};

export const normalizeSidebarOrder = (order: string[]): string[] => {
  const normalized = [...new Set(order)];

  for (const missingItem of DEFAULT_SIDEBAR_ORDER) {
    if (normalized.includes(missingItem)) continue;
    const defaultIndex = DEFAULT_SIDEBAR_ORDER.indexOf(missingItem);
    const previousItem = DEFAULT_SIDEBAR_ORDER
      .slice(0, defaultIndex)
      .reverse()
      .find(item => normalized.includes(item));
    const insertAt = previousItem ? normalized.indexOf(previousItem) + 1 : 0;
    normalized.splice(insertAt, 0, missingItem);
  }

  return normalized;
};
