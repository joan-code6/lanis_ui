export const SIDEBAR_ITEM_IDS = [
  'dashboard',
  'messages',
  'dateispeicher',
  'vertretungsplan',
  'dsb',
  'courses',
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
  timetable: 'Stundenplan',
  'study-groups': 'Lerngruppen',
  calendar: 'Kalender',
  profile: 'Profil',
  settings: 'Einstellungen',
};

export const normalizeSidebarOrder = (order: string[]): SidebarItemId[] => {
  const valid = order.filter((id): id is SidebarItemId => SIDEBAR_ITEM_IDS.includes(id as SidebarItemId));
  return [...new Set([...valid, ...DEFAULT_SIDEBAR_ORDER])];
};
