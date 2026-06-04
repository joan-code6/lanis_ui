import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import Layout from '../layout/Layout';

const mockUser = {
  username: 'max.mustermann',
  vorname: 'Max',
  nachname: 'Mustermann',
  klasse: 'Q2',
  email: 'max.mustermann@goethe-gymnasium.de',
  schule: 'Goethe-Gymnasium Frankfurt',
  role: 'Schüler',
  tutor: 'Herr Dr. Weber',
};

const mockAuth = {
  isAuthenticated: true as const,
  token: 'demo-mock-token-000000000000000000000000',
  user: mockUser,
  login: async () => true,
  logout: () => {},
};

const seedLocalStorage = () => {
  localStorage.setItem('__demo_mode', '1');

  const modules = [
    { name: 'Mein Unterricht', url: 'https://schulportal.hessen.de/meinunterricht.php', color: '#4f46e5', logo: 'fa fa-files-o', folders: ['Schule'], target: '_self' },
    { name: 'Nachrichten', url: 'https://schulportal.hessen.de/nachrichten.php', color: '#0891b2', logo: 'fa fa-envelope-o', folders: ['Kommunikation'], target: '_self' },
    { name: 'Kalender', url: 'https://schulportal.hessen.de/kalender.php', color: '#dc2626', logo: 'fa fa-calendar-o', folders: ['Schule'], target: '_self' },
    { name: 'Vertretungsplan', url: 'https://schulportal.hessen.de/dsb.php', color: '#7c3aed', logo: 'fa fa-files-o', folders: ['Schule'], target: '_self' },
    { name: 'Klassenbuch', url: 'https://schulportal.hessen.de/klassenbuch.php', color: '#059669', logo: 'fa fa-files-o', folders: ['Schule'], target: '_blank' },
    { name: 'Stundenplan', url: 'https://schulportal.hessen.de/stundenplan.php', color: '#d97706', logo: 'fa fa-calendar-o', folders: ['Schule'], target: '_blank' },
    { name: 'Notenübersicht', url: 'https://schulportal.hessen.de/noten.php', color: '#be185d', logo: 'fa fa-files-o', folders: ['Leistung'], target: '_blank' },
    { name: 'Klausurplan', url: 'https://schulportal.hessen.de/klausuren.php', color: '#2563eb', logo: 'fa fa-files-o', folders: ['Leistung'], target: '_blank' },
  ];
  localStorage.setItem('modules_cache', JSON.stringify(modules));
  localStorage.setItem('pinned_modules', JSON.stringify(['Klassenbuch', 'Notenübersicht']));

  const messages = [
    { Id: 'demo-msg-001', Uniquid: 'demo-uq-001', Sender: 'Herr Müller', Betreff: 'Klausur am Freitag — Wichtige Informationen', Papierkorb: '0', private: 0, WeitereEmpfaenger: '', empf: ['max.mustermann'], unread: true, date: '2025-06-01T10:00:00' },
    { Id: 'demo-msg-002', Uniquid: 'demo-uq-002', Sender: 'Frau Schmidt', Betreff: 'Projektabgabe verlängert', Papierkorb: '0', private: 0, WeitereEmpfaenger: '', empf: ['max.mustermann'], unread: false, read: true, date: '2025-05-28T14:30:00' },
    { Id: 'demo-msg-003', Uniquid: 'demo-uq-003', Sender: 'Schulleitung', Betreff: 'Wichtige Mitteilung: Schulausflug', Papierkorb: '0', private: 0, WeitereEmpfaenger: '', empf: ['max.mustermann'], unread: true, date: '2025-05-25T08:00:00' },
    { Id: 'demo-msg-004', Uniquid: 'demo-uq-004', Sender: 'Hr. Dr. Weber', Betreff: 'Sprechstunde diese Woche', Papierkorb: '0', private: 0, WeitereEmpfaenger: '', empf: ['max.mustermann'], unread: false, read: true, date: '2025-05-22T16:00:00' },
    { Id: 'demo-msg-005', Uniquid: 'demo-uq-005', Sender: 'Sekretariat', Betreff: 'Zeugnisausgabe', Papierkorb: '0', private: 0, WeitereEmpfaenger: '', empf: ['max.mustermann'], unread: true, date: '2025-05-20T09:00:00' },
  ];
  localStorage.setItem('messages_cache', JSON.stringify(messages));

  const courses = [
    { entry_id: 'demo-e1', book_id: 'demo-b1', name: 'Mathematik GK', course_link: 'https://schulportal.hessen.de/courses/1', teacher_full_name: 'Dr. Heinrich Weber', teacher_short: 'Wb', teacher_message_link: '', thema: 'Analysis: Kurvendiskussion und Extremwertprobleme', datum: '2025-06-02T08:00:00', homework: 'Aufgaben 1–5 auf Seite 142', homework_done: false },
    { entry_id: 'demo-e2', book_id: 'demo-b2', name: 'Deutsch LK', course_link: 'https://schulportal.hessen.de/courses/2', teacher_full_name: 'Prof. Anna Reinhardt', teacher_short: 'Re', teacher_message_link: '', thema: 'Faust I: Analyse des Osterspaziergangs', datum: '2025-06-01T10:45:00', homework: 'Essay: Die Rolle des Erdgeists in Faust I', homework_done: true },
    { entry_id: 'demo-e3', book_id: 'demo-b3', name: 'Englisch GK', course_link: 'https://schulportal.hessen.de/courses/3', teacher_full_name: "James O'Connor", teacher_short: "O'C", teacher_message_link: '', thema: 'Shakespeare: Hamlet Act III — To be or not to be', datum: '2025-05-31T09:00:00', homework: 'Read Act IV, Scene 1–3', homework_done: false },
    { entry_id: 'demo-e4', book_id: 'demo-b4', name: 'Physik LK', course_link: 'https://schulportal.hessen.de/courses/4', teacher_full_name: 'Dr. Sabine Keller', teacher_short: 'Kl', teacher_message_link: '', thema: 'Quantenmechanik: Doppelspaltexperiment', datum: '2025-05-30T11:30:00', homework: 'Berechnungen zum Doppelspaltexperiment', homework_done: false },
    { entry_id: 'demo-e5', book_id: 'demo-b5', name: 'Geschichte GK', course_link: 'https://schulportal.hessen.de/courses/5', teacher_full_name: 'Herr Thomas Bergmann', teacher_short: 'Bg', teacher_message_link: '', thema: 'Weimarer Republik: Die Goldenen Zwanziger', datum: '2025-05-29T13:00:00', homework: 'Quellenanalyse: Tagebucheintrag 1925', homework_done: true },
    { entry_id: 'demo-e6', book_id: 'demo-b6', name: 'Informatik LK', course_link: 'https://schulportal.hessen.de/courses/6', teacher_full_name: 'Frau Dr. Laura Chen', teacher_short: 'Ch', teacher_message_link: '', thema: 'Datenstrukturen: Binäre Suchbäume', datum: '2025-05-28T08:00:00', homework: 'Implementierung eines BST in Java', homework_done: false },
  ];
  localStorage.setItem('courses_cache', JSON.stringify(courses));

  localStorage.setItem('profile_cache', JSON.stringify(mockUser));
  localStorage.setItem('auth_token', mockAuth.token);
  localStorage.setItem('auth_user', JSON.stringify(mockUser));

  const dsbPlan = {
    menuItems: ['Heute', 'Morgen', 'Übermorgen'],
    planUrls: ['/plan/heute', '/plan/morgen', '/plan/uebermorgen'],
    tables: [{
      caption: 'Klasse Q2 — Vertretungsplan',
      headers: ['Stunde', 'Fach', 'Lehrkraft', 'Vertretung', 'Raum', 'Info'],
      rows: [
        { Stunde: '1–2', Fach: 'Mathe', Lehrkraft: 'Hr. Dr. Weber', Vertretung: '---', Raum: 'A12', Info: '' },
        { Stunde: '3–4', Fach: 'Deutsch', Lehrkraft: 'Hr. Müller', Vertretung: 'Fr. Schmidt', Raum: 'B05', Info: 'Vertretung' },
        { Stunde: '5', Fach: 'Englisch', Lehrkraft: "Hr. O'Connor", Vertretung: '---', Raum: 'C01', Info: '' },
        { Stunde: '6–7', Fach: 'Physik', Lehrkraft: 'Fr. Dr. Keller', Vertretung: '---', Raum: 'D17', Info: 'Ausfall' },
        { Stunde: '8–9', Fach: 'Sport', Lehrkraft: 'Hr. Wagner', Vertretung: 'Hr. Fischer', Raum: 'TH1', Info: 'Vertretung' },
      ],
      date: '2025-06-04',
    }],
    selectedPlanIndex: 0,
    timestamp: Date.now(),
  };
  localStorage.setItem('dsb_plan_cache', JSON.stringify(dsbPlan));
};

const DemoRoute: React.FC = () => {
  useEffect(() => {
    seedLocalStorage();
    return () => {
      localStorage.removeItem('__demo_mode');
    };
  }, []);

  return (
    <AuthContext.Provider value={mockAuth}>
      <Layout basePath="/demo">
        <div className="sticky top-0 z-30 bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800 px-4 py-1.5 text-center">
          <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
            Demo-Modus — Alle Daten sind Platzhalter
          </span>
        </div>
        <Outlet />
      </Layout>
    </AuthContext.Provider>
  );
};

export default DemoRoute;
