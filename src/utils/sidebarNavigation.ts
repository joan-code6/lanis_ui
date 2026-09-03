export const SIDEBAR_ITEM_IDS = [
  'dashboard',
  'messages',
  'dateispeicher',
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
  'dashboard',
  'messages',
  'dateispeicher',
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

export const SIDEBAR_ITEM_LABELS: Record<SidebarItemId, string> = {
  dashboard: 'Dashboard',
  messages: 'Nachrichten',
  dateispeicher: 'Dateispeicher',
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

export const normalizeSidebarOrder = (order: string[]): SidebarItemId[] => {
  const normalized = [...new Set(
    order.filter((id): id is SidebarItemId => SIDEBAR_ITEM_IDS.includes(id as SidebarItemId)),
  )];

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
