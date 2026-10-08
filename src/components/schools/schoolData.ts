// POC: everything here is either taken from the public Schulportal Hessen exporteur endpoint
// (https://startcache.schulportal.hessen.de/exporteur.php?a=school&i=5201, snapshot below)
// or clearly mocked. A real version would load it per school at build time.

export interface SchoolColors {
  bg: string;
  border: string;
  text: string;
  activeBG: string;
  activeText: string;
  footer: string;
  headtitle: string;
}

export interface SchoolData {
  id: string;
  slug: string;
  name: string;
  city: string;
  colors: SchoolColors;
  logo: string;
  bg: { lg: string; md: string; sm: string; xs: string };
  css: string;
  lastChange: number;
  loginUrl: string;
}

// --- real data (exporteur.php?a=school&i=5201) ---
export const ARG: SchoolData = {
  id: '5201',
  slug: 'adolf-reichwein-gymnasium',
  name: 'Adolf-Reichwein-Gymnasium',
  city: 'Heusenstamm',
  colors: {
    bg: '#00bcd5',
    border: '#00a5bb',
    text: '#fffffe',
    activeBG: '#00bcd4',
    activeText: '#dfdfdf',
    footer: '#00a5bc',
    headtitle: '#606060',
  },
  logo: '/schools/5201/logo.png',
  bg: {
    lg: '/schools/5201/bg-lg.jpg',
    md: '/schools/5201/bg-md.jpg',
    sm: '/schools/5201/bg-sm.jpg',
    xs: '/schools/5201/bg-xs.jpg',
  },
  css: '/schools/5201/school.css',
  lastChange: 1607888404,
  loginUrl: '/login?i=5201',
};

// --- mock data (a real version would pull these from the API / public sources) ---
export const MOCK = {
  stats: [
    { value: '1.240', label: 'Schüler:innen' },
    { value: '96', label: 'Lehrkräfte' },
    { value: '48', label: 'Klassen' },
    { value: '1972', label: 'gegründet' },
  ],
  features: [
    { title: 'Vertretungsplan live', text: 'Ausfälle und Raumänderungen für deine Klasse, sobald sie online sind.' },
    { title: 'Stundenplan', text: 'Dein Plan mit Hausaufgaben direkt in der Stunde, in den Farben deiner Schule.' },
    { title: 'Nachrichten', text: 'Lehrkräfte und Mitschüler:innen, mit ungelesen-Markierung und Push.' },
    { title: 'Kurse & Noten', text: 'Lerngruppen, Termine für Klassenarbeiten und Anwesenheit auf einen Blick.' },
    { title: 'Kalender', text: 'Klausuren, Ferien und Schulveranstaltungen an einem Ort.' },
    { title: 'Dateispeicher', text: 'Arbeitsblätter und Material, auch offline verfügbar.' },
  ],
  substitutions: [
    { period: '1–2', klass: '10b', subject: 'Französisch', status: 'Entfall', note: '' },
    { period: '3', klass: '10b', subject: 'Mathematik', status: 'Raum', note: 'A 214 → B 102' },
    { period: '5–6', klass: '10b', subject: 'Latein', status: 'Vertretung', note: 'Fr. Keller' },
    { period: '7–8', klass: '10b', subject: 'WU Naturwiss.', status: 'Entfall', note: '' },
  ],
  timetable: [
    ['Ma', 'De', 'En', 'Ge', 'Ph'],
    ['Ma', 'En', 'Bi', 'La', 'Ph'],
    ['De', 'Sp', 'Ma', 'La', 'Ch'],
    ['Ku', 'Sp', 'Ge', 'En', 'Ch'],
    ['Re', 'Mu', 'Pb', 'De', 'Ma'],
  ],
  news: [
    { date: '12. Okt', title: 'Tag der offenen Tür', tag: 'Schulleben' },
    { date: '19. Okt', title: 'Unterrichtsfreier Tag', tag: 'Hinweis' },
    { date: '24. Okt', title: 'Herbstferien beginnen', tag: 'Kalender' },
  ],
};

export const SCHOOL_VARIANTS = [
  { id: '1', label: 'Hero' },
  { id: '2', label: 'Bento' },
  { id: '3', label: 'Poster' },
  { id: '4', label: 'Portal' },
] as const;

export const DEMO_BADGE = 'POC · Demo-Daten';
