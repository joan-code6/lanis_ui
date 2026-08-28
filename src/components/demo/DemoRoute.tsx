import React, { useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { PreferencesProvider } from '../../contexts/PreferencesContext';
import { useTheme } from '../../contexts/ThemeContext';
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
  logout: async () => {},
  refreshToken: async () => true,
};

const seedLocalStorage = () => {
  localStorage.setItem('__demo_mode', '1');

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

  const modules = [
    { name: 'Mein Unterricht', url: 'https://schulportal.hessen.de/meinunterricht.php', color: '#4f46e5', logo: 'fa fa-files-o', folders: ['Schule'], target: '_self' },
    { name: 'Nachrichten', url: 'https://schulportal.hessen.de/nachrichten.php', color: '#0891b2', logo: 'fa fa-envelope-o', folders: ['Kommunikation'], target: '_self' },
    { name: 'Kalender', url: 'https://schulportal.hessen.de/kalender.php', color: '#dc2626', logo: 'fa fa-calendar-o', folders: ['Schule'], target: '_self' },
    { name: 'Vertretungsplan', url: 'https://schulportal.hessen.de/vertretungsplan.php', color: '#7c3aed', logo: 'fa fa-files-o', folders: ['Schule'], target: '_self' },
    { name: 'DSBmobile', url: 'https://dsb.hessen.de/dsb.php', color: '#64748b', logo: 'fa fa-files-o', folders: ['Schule'], target: '_self' },
    { name: 'Klassenbuch', url: 'https://schulportal.hessen.de/klassenbuch.php', color: '#059669', logo: 'fa fa-files-o', folders: ['Schule'], target: '_blank' },
    { name: 'Stundenplan', url: 'https://schulportal.hessen.de/stundenplan.php', color: '#d97706', logo: 'fa fa-calendar-o', folders: ['Schule'], target: '_blank' },
    { name: 'Lerngruppen', url: 'https://schulportal.hessen.de/lerngruppen.php', color: '#0d9488', logo: 'fa fa-users', folders: ['Schule'], target: '_self' },
    { name: 'Notenübersicht', url: 'https://schulportal.hessen.de/noten.php', color: '#be185d', logo: 'fa fa-files-o', folders: ['Leistung'], target: '_blank' },
    { name: 'Klausurplan', url: 'https://schulportal.hessen.de/klausuren.php', color: '#2563eb', logo: 'fa fa-files-o', folders: ['Leistung'], target: '_blank' },
  ];
  localStorage.setItem('modules_cache', JSON.stringify(modules));
  localStorage.setItem('pinned_modules', JSON.stringify(['Klassenbuch', 'Notenübersicht']));

  const messages = [
    { Id: 'dm-1', Uniquid: 'uq-1', Sender: 'Herr Müller', Betreff: 'Klausur am Freitag — Wichtige Informationen', Papierkorb: '0', private: 0, WeitereEmpfaenger: '', empf: ['max.mustermann'], unread: true, date: daysAgo(1) },
    { Id: 'dm-2', Uniquid: 'uq-2', Sender: 'Frau Schmidt', Betreff: 'Projektabgabe verlängert', Papierkorb: '0', private: 0, WeitereEmpfaenger: '', empf: ['max.mustermann'], unread: false, read: true, date: daysAgo(3) },
    { Id: 'dm-3', Uniquid: 'uq-3', Sender: 'Schulleitung', Betreff: 'Wichtige Mitteilung: Schulausflug', Papierkorb: '0', private: 0, WeitereEmpfaenger: '', empf: ['max.mustermann'], unread: true, date: daysAgo(5) },
    { Id: 'dm-4', Uniquid: 'uq-4', Sender: 'Hr. Dr. Weber', Betreff: 'Sprechstunde diese Woche', Papierkorb: '0', private: 0, WeitereEmpfaenger: '', empf: ['max.mustermann'], unread: false, read: true, date: daysAgo(7) },
    { Id: 'dm-5', Uniquid: 'uq-5', Sender: 'Sekretariat', Betreff: 'Zeugnisausgabe', Papierkorb: '0', private: 0, WeitereEmpfaenger: '', empf: ['max.mustermann'], unread: true, date: daysAgo(10) },
  ];
  localStorage.setItem('messages_cache', JSON.stringify(messages));

  const courses = [
    { entry_id: 'e1', book_id: 'b1', name: 'Mathematik GK', course_link: 'https://schulportal.hessen.de/courses/1', teacher_full_name: 'Dr. Heinrich Weber', teacher_short: 'Wb', teacher_message_link: '', thema: 'Analysis: Kurvendiskussion und Extremwertprobleme', datum: daysAgo(0), homework: 'Aufgaben 1–5 auf Seite 142', homework_done: false },
    { entry_id: 'e2', book_id: 'b2', name: 'Deutsch LK', course_link: 'https://schulportal.hessen.de/courses/2', teacher_full_name: 'Prof. Anna Reinhardt', teacher_short: 'Re', teacher_message_link: '', thema: 'Faust I: Analyse des Osterspaziergangs', datum: daysAgo(1), homework: 'Essay: Die Rolle des Erdgeists in Faust I', homework_done: true },
    { entry_id: 'e3', book_id: 'b3', name: 'Englisch GK', course_link: 'https://schulportal.hessen.de/courses/3', teacher_full_name: "James O'Connor", teacher_short: "O'C", teacher_message_link: '', thema: 'Shakespeare: Hamlet Act III — To be or not to be', datum: daysAgo(2), homework: 'Read Act IV, Scene 1–3', homework_done: false },
    { entry_id: 'e4', book_id: 'b4', name: 'Physik LK', course_link: 'https://schulportal.hessen.de/courses/4', teacher_full_name: 'Dr. Sabine Keller', teacher_short: 'Kl', teacher_message_link: '', thema: 'Quantenmechanik: Doppelspaltexperiment', datum: daysAgo(3), homework: 'Berechnungen zum Doppelspaltexperiment', homework_done: false },
    { entry_id: 'e5', book_id: 'b5', name: 'Geschichte GK', course_link: 'https://schulportal.hessen.de/courses/5', teacher_full_name: 'Herr Thomas Bergmann', teacher_short: 'Bg', teacher_message_link: '', thema: 'Weimarer Republik: Die Goldenen Zwanziger', datum: daysAgo(4), homework: 'Quellenanalyse: Tagebucheintrag 1925', homework_done: true },
    { entry_id: 'e6', book_id: 'b6', name: 'Informatik LK', course_link: 'https://schulportal.hessen.de/courses/6', teacher_full_name: 'Frau Dr. Laura Chen', teacher_short: 'Ch', teacher_message_link: '', thema: 'Datenstrukturen: Binäre Suchbäume', datum: daysAgo(5), homework: 'Implementierung eines BST in Java', homework_done: false },
  ];
  localStorage.setItem('courses_cache', JSON.stringify(courses));

  localStorage.setItem('profile_cache', JSON.stringify(mockUser));

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
      date: daysAgo(0).slice(0, 10),
    }],
    selectedPlanIndex: 0,
    timestamp: Date.now(),
  };
  localStorage.setItem('dsb_plan_cache_v2', JSON.stringify(dsbPlan));
};

const DemoRoute: React.FC = () => {
  const { themeMode, themeColor, setThemeMode, setThemeColor } = useTheme();
  const accountAppearanceRef = useRef({ themeMode, themeColor });

  useEffect(() => {
    seedLocalStorage();
    return () => {
      localStorage.removeItem('__demo_mode');
      setThemeMode(accountAppearanceRef.current.themeMode);
      setThemeColor(accountAppearanceRef.current.themeColor);
    };
  }, [setThemeColor, setThemeMode]);

  return (
    <AuthContext.Provider value={mockAuth}>
      <PreferencesProvider sync={false}>
        <Layout basePath="/demo">
          <Outlet />
        </Layout>
      </PreferencesProvider>
    </AuthContext.Provider>
  );
};

export default DemoRoute;
