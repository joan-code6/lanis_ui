import type { Module, User } from '../../types';

// The demo uses fictional data. It mirrors the shape of a normal student
// account without reusing anyone's personal details or school content.
export const demoUser: User = {
  school_id: 'demo',
  username: 'mia.keller',
  vorname: 'Mia',
  nachname: 'Keller',
  firstname: 'Mia',
  lastname: 'Keller',
  klasse: '9C',
  email: 'mia.keller@example.invalid',
  schule: 'Elisabeth-Selbert-Schule',
  role: 'Schüler/in',
  tutor: 'Herr Brandt',
  geburtsdatum: '08.11.2011',
  geschlecht: 'w',
  strasse: 'Schulstraße 1',
  plz: '60311',
  ort: 'Frankfurt am Main',
};

export const demoModules: Module[] = [
  { name: 'Mein Unterricht', url: 'https://schulportal.hessen.de/meinunterricht.php', direct_url: 'https://schulportal.hessen.de/meinunterricht.php', proxy_app: false, color: '#4f46e5', logo: 'fa fa-address-book', folders: ['Schule'], target: '_self' },
  { name: 'Nachrichten', url: 'https://schulportal.hessen.de/nachrichten.php', direct_url: 'https://schulportal.hessen.de/nachrichten.php', proxy_app: false, color: '#0891b2', logo: 'fa fa-envelope-o', folders: ['Kommunikation'], target: '_self' },
  { name: 'Kalender', url: 'https://schulportal.hessen.de/kalender.php', direct_url: 'https://schulportal.hessen.de/kalender.php', proxy_app: false, color: '#dc2626', logo: 'fa fa-calendar-o', folders: ['Schule'], target: '_self' },
  { name: 'Dateispeicher', url: 'https://schulportal.hessen.de/dateispeicher.php', direct_url: 'https://schulportal.hessen.de/dateispeicher.php', proxy_app: false, color: '#0f766e', logo: 'fa fa-folder-open-o', folders: ['Schule'], target: '_self' },
  { name: 'Vertretungsplan', url: 'https://schulportal.hessen.de/vertretungsplan.php', direct_url: 'https://schulportal.hessen.de/vertretungsplan.php', proxy_app: false, color: '#7c3aed', logo: 'fa fa-list-alt', folders: ['Schule'], target: '_self' },
  { name: 'DSBmobile', url: 'https://dsb.hessen.de/dsb.php', direct_url: 'https://dsb.hessen.de/dsb.php', proxy_app: false, color: '#64748b', logo: 'fa fa-retweet', folders: ['Schule'], target: '_self' },
  { name: 'Klassenbuch', url: 'https://schulportal.hessen.de/klassenbuch.php', direct_url: 'https://schulportal.hessen.de/klassenbuch.php', proxy_app: false, color: '#059669', logo: 'fa fa-book', folders: ['Schule'], target: '_blank' },
  { name: 'Stundenplan', url: 'https://schulportal.hessen.de/stundenplan.php', direct_url: 'https://schulportal.hessen.de/stundenplan.php', proxy_app: false, color: '#d97706', logo: 'fa fa-hourglass-half', folders: ['Schule'], target: '_self' },
  { name: 'Lerngruppen', url: 'https://schulportal.hessen.de/lerngruppen.php', direct_url: 'https://schulportal.hessen.de/lerngruppen.php', proxy_app: false, color: '#0d9488', logo: 'fa fa-users', folders: ['Schule'], target: '_self' },
  { name: 'Notenübersicht', url: 'https://schulportal.hessen.de/noten.php', direct_url: 'https://schulportal.hessen.de/noten.php', proxy_app: false, color: '#be185d', logo: 'fa fa-bar-chart', folders: ['Leistung'], target: '_blank' },
  { name: 'Klausurplan', url: 'https://schulportal.hessen.de/klausuren.php', direct_url: 'https://schulportal.hessen.de/klausuren.php', proxy_app: false, color: '#2563eb', logo: 'fa fa-list-alt', folders: ['Leistung'], target: '_blank' },
];

export const demoPinnedModules = ['Klassenbuch', 'Notenübersicht'];
