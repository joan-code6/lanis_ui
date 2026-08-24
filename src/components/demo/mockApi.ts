const now = new Date();
const fmt = (d: Date) => d.toISOString();
const daysAgo = (n: number) => fmt(new Date(now.getTime() - n * 86400000));
const hoursAgo = (n: number) => fmt(new Date(now.getTime() - n * 3600000));
const daysFromNow = (n: number) => fmt(new Date(now.getTime() + n * 86400000));
const hoursFromNow = (n: number) => fmt(new Date(now.getTime() + n * 3600000));
const relDate = (daysOffset: number) => fmt(new Date(now.getTime() + daysOffset * 86400000)).slice(0, 10);
const relDateTime = (daysOffset: number, time: string) => relDate(daysOffset) + 'T' + time;

const mockUser = {
  username: 'max.mustermann',
  vorname: 'Max',
  nachname: 'Mustermann',
  klasse: 'Q2',
  email: 'max.mustermann@goethe-gymnasium.de',
  schule: 'Goethe-Gymnasium Frankfurt',
  role: 'Schüler',
  tutor: 'Herr Dr. Weber',
  geburtsdatum: '01.01.2008',
  geschlecht: 'm',
  strasse: 'Schulstraße 1',
  plz: '60311',
  ort: 'Frankfurt am Main',
};

const defaultMockNotificationPreferences = {
  enabled: false,
  start_time: '07:00',
  end_time: '21:00',
  poll_interval_minutes: 15,
  timezone: 'Europe/Berlin',
  show_preview: true,
};

let mockNotificationPreferences = { ...defaultMockNotificationPreferences };
let mockCustomLessons: any[] = [];
const mockClassLinkOverrides: Record<string, string> = {};

const mockModules = [
  { name: 'Mein Unterricht', url: 'https://schulportal.hessen.de/meinunterricht.php', direct_url: 'https://schulportal.hessen.de/meinunterricht.php', proxy_app: false, color: '#4f46e5', logo: 'fa fa-files-o', folders: ['Schule'], target: '_self' },
  { name: 'Nachrichten', url: 'https://schulportal.hessen.de/nachrichten.php', direct_url: 'https://schulportal.hessen.de/nachrichten.php', proxy_app: false, color: '#0891b2', logo: 'fa fa-envelope-o', folders: ['Kommunikation'], target: '_self' },
  { name: 'Kalender', url: 'https://schulportal.hessen.de/kalender.php', direct_url: 'https://schulportal.hessen.de/kalender.php', proxy_app: false, color: '#dc2626', logo: 'fa fa-calendar-o', folders: ['Schule'], target: '_self' },
  { name: 'Vertretungsplan', url: 'https://schulportal.hessen.de/dsb.php', direct_url: 'https://schulportal.hessen.de/dsb.php', proxy_app: false, color: '#7c3aed', logo: 'fa fa-files-o', folders: ['Schule'], target: '_self' },
  { name: 'Klassenbuch', url: 'https://schulportal.hessen.de/klassenbuch.php', direct_url: 'https://schulportal.hessen.de/klassenbuch.php', proxy_app: false, color: '#059669', logo: 'fa fa-files-o', folders: ['Schule'], target: '_blank' },
  { name: 'Stundenplan', url: 'https://schulportal.hessen.de/stundenplan.php', direct_url: 'https://schulportal.hessen.de/stundenplan.php', proxy_app: false, color: '#d97706', logo: 'fa fa-calendar-o', folders: ['Schule'], target: '_blank' },
  { name: 'Notenübersicht', url: 'https://schulportal.hessen.de/noten.php', direct_url: 'https://schulportal.hessen.de/noten.php', proxy_app: false, color: '#be185d', logo: 'fa fa-files-o', folders: ['Leistung'], target: '_blank' },
  { name: 'Klausurplan', url: 'https://schulportal.hessen.de/klausuren.php', direct_url: 'https://schulportal.hessen.de/klausuren.php', proxy_app: false, color: '#2563eb', logo: 'fa fa-files-o', folders: ['Leistung'], target: '_blank' },
];

const mockMessageHeaders = [
  { Id: 'dm-1', Uniquid: 'uq-1', Sender: 'Herr Müller', Betreff: 'Klausur am Freitag — Wichtige Informationen', Papierkorb: '0', private: 0, WeitereEmpfaenger: '', empf: ['max.mustermann'], unread: true, date: daysAgo(1) },
  { Id: 'dm-2', Uniquid: 'uq-2', Sender: 'Frau Schmidt', Betreff: 'Projektabgabe verlängert', Papierkorb: '0', private: 0, WeitereEmpfaenger: '', empf: ['max.mustermann'], unread: false, read: true, date: daysAgo(3) },
  { Id: 'dm-3', Uniquid: 'uq-3', Sender: 'Schulleitung', Betreff: 'Wichtige Mitteilung: Schulausflug', Papierkorb: '0', private: 0, WeitereEmpfaenger: '', empf: ['max.mustermann'], unread: true, date: daysAgo(5) },
  { Id: 'dm-4', Uniquid: 'uq-4', Sender: 'Hr. Dr. Weber', Betreff: 'Sprechstunde diese Woche', Papierkorb: '0', private: 0, WeitereEmpfaenger: '', empf: ['max.mustermann'], unread: false, read: true, date: daysAgo(7) },
  { Id: 'dm-5', Uniquid: 'uq-5', Sender: 'Sekretariat', Betreff: 'Zeugnisausgabe', Papierkorb: '0', private: 0, WeitereEmpfaenger: '', empf: ['max.mustermann'], unread: true, date: daysAgo(10) },
];

const mockConversations: Record<string, { messages: any[] }> = {
  'uq-1': { messages: [
    { id: 'c1-1', sender: 'Herr Müller', content: 'Liebe Schülerinnen und Schüler,\n\nam kommenden Freitag, den 05.06.2026, findet die angekündigte Klausur zum Thema „Analysis: Kurvendiskussion" statt. Bitte erscheinen Sie pünktlich um 8:00 Uhr in Raum A12.\n\nErlaubte Hilfsmittel: Taschenrechner (nicht programmierbar), Formelsammlung.\n\nBei Rückfragen stehe ich in meiner Sprechstunde zur Verfügung.\n\nMit freundlichen Grüßen\nHerr Müller', date: daysAgo(1) },
    { id: 'c1-2', sender: 'Max Mustermann', content: 'Sehr geehrter Herr Müller,\n\nvielen Dank für die Informationen. Ich habe noch eine Frage: Dürfen wir auch einen programmierbaren Taschenrechner verwenden, wenn wir den Speicher vorher löschen?\n\nMit freundlichen Grüßen\nMax Mustermann', date: hoursAgo(23) },
    { id: 'c1-3', sender: 'Herr Müller', content: 'Hallo Max,\n\nleider nein. Laut Schulordnung sind bei Klausuren ausschließlich nicht-programmierbare Taschenrechner zugelassen. Bitte besorge dir rechtzeitig einen geeigneten Taschenrechner.\n\nViele Grüße\nHerr Müller', date: hoursAgo(22) },
  ]},
  'uq-2': { messages: [
    { id: 'c2-1', sender: 'Frau Schmidt', content: 'Liebe Klasse,\n\ndie Abgabefrist für das Gruppenprojekt zum Thema „Nachhaltigkeit" wird um eine Woche verlängert.\n\nNeue Abgabefrist: 15.06.2026\n\nNutzt die zusätzliche Zeit bitte sinnvoll!\n\nViele Grüße\nFrau Schmidt', date: daysAgo(3) },
  ]},
  'uq-3': { messages: [
    { id: 'c3-1', sender: 'Schulleitung', content: 'Liebe Schulgemeinschaft,\n\nam 20. Juni findet der jährliche Schulausflug statt. Alle Klassen nehmen teil.\n\nZiele:\n- Klassen 5-7: Opel-Zoo Kronberg\n- Klassen 8-10: Mathematikum Gießen\n- Oberstufe (Q1-Q4): Goethe-Haus + Senckenbergmuseum Frankfurt\n\nAbfahrt: 8:00 Uhr | Rückkehr: ca. 16:00 Uhr\n\nBitte geben Sie die Einverständniserklärung bis zum 12.06. bei der Klassenleitung ab.\n\nMit freundlichen Grüßen\nDie Schulleitung', date: daysAgo(5) },
  ]},
  'uq-4': { messages: [
    { id: 'c4-1', sender: 'Hr. Dr. Weber', content: 'Guten Tag,\n\nmeine Sprechstunde findet diese Woche ausnahmsweise am Mittwoch (03.06.) von 14:00-15:30 Uhr statt, statt wie gewohnt am Dienstag.\n\nGrund ist eine Fachkonferenz am Dienstag.\n\nViele Grüße\nDr. Weber', date: daysAgo(7) },
  ]},
  'uq-5': { messages: [
    { id: 'c5-1', sender: 'Sekretariat', content: 'Sehr geehrte Eltern und Erziehungsberechtigte,\n\nhiermit möchten wir Sie über die Termine der Zeugnisausgabe informieren:\n\n- letzter Schultag: 18.07.2026\n- Zeugnisausgabe: 18.07.2026, 10:00 Uhr in der Aula\n\nBitte stellen Sie sicher, dass Ihr Kind an diesem Tag anwesend ist.\n\nMit freundlichen Grüßen\nDas Sekretariat', date: daysAgo(10) },
  ]},
};

const mockCourses = [
  { entry_id: 'e1', book_id: 'b1', name: 'Mathematik GK', course_link: 'https://schulportal.hessen.de/courses/b1', teacher_full_name: 'Dr. Heinrich Weber', teacher_short: 'Wb', teacher_message_link: '', thema: 'Analysis: Kurvendiskussion und Extremwertprobleme', datum: daysAgo(0), homework: 'Aufgaben 1–5 auf Seite 142', homework_done: false },
  { entry_id: 'e2', book_id: 'b2', name: 'Deutsch LK', course_link: 'https://schulportal.hessen.de/courses/b2', teacher_full_name: 'Prof. Anna Reinhardt', teacher_short: 'Re', teacher_message_link: '', thema: 'Faust I: Analyse des Osterspaziergangs', datum: daysAgo(1), homework: 'Essay: Die Rolle des Erdgeists in Faust I', homework_done: true },
  { entry_id: 'e3', book_id: 'b3', name: 'Englisch GK', course_link: 'https://schulportal.hessen.de/courses/b3', teacher_full_name: "James O'Connor", teacher_short: "O'C", teacher_message_link: '', thema: 'Shakespeare: Hamlet Act III — To be or not to be', datum: daysAgo(2), homework: 'Read Act IV, Scene 1–3', homework_done: false },
  { entry_id: 'e4', book_id: 'b4', name: 'Physik LK', course_link: 'https://schulportal.hessen.de/courses/b4', teacher_full_name: 'Dr. Sabine Keller', teacher_short: 'Kl', teacher_message_link: '', thema: 'Quantenmechanik: Doppelspaltexperiment', datum: daysAgo(3), homework: 'Berechnungen zum Doppelspaltexperiment', homework_done: false },
  { entry_id: 'e5', book_id: 'b5', name: 'Geschichte GK', course_link: 'https://schulportal.hessen.de/courses/b5', teacher_full_name: 'Herr Thomas Bergmann', teacher_short: 'Bg', teacher_message_link: '', thema: 'Weimarer Republik: Die Goldenen Zwanziger', datum: daysAgo(4), homework: 'Quellenanalyse: Tagebucheintrag 1925', homework_done: true },
  { entry_id: 'e6', book_id: 'b6', name: 'Informatik LK', course_link: 'https://schulportal.hessen.de/courses/b6', teacher_full_name: 'Frau Dr. Laura Chen', teacher_short: 'Ch', teacher_message_link: '', thema: 'Datenstrukturen: Binäre Suchbäume', datum: daysAgo(5), homework: 'Implementierung eines BST in Java', homework_done: false },
];

const mockSubmissions = [
  { id: 's1', title: 'Mathe-Klausur Q2', course: 'Mathematik GK', due_date: relDateTime(7, '08:00:00'), status: 'Anstehend', url: '' },
  { id: 's2', title: 'Faust Essay', course: 'Deutsch LK', due_date: relDateTime(5, '23:59:00'), status: 'Ausstehend', url: '' },
  { id: 's3', title: 'Hamlet Reading', course: 'Englisch GK', due_date: relDateTime(-2, '08:00:00'), status: 'Abgegeben', url: '' },
  { id: 's4', title: 'Physik Berechnungen', course: 'Physik LK', due_date: relDateTime(14, '08:00:00'), status: 'Anstehend', url: '' },
  { id: 's5', title: 'Informatik BST', course: 'Informatik LK', due_date: relDateTime(8, '23:59:00'), status: 'Ausstehend', url: '' },
  { id: 's6', title: 'Geschichte Quellenanalyse', course: 'Geschichte GK', due_date: relDateTime(-1, '23:59:00'), status: 'Überfällig', url: '' },
];

const mockCourseDetails: Record<string, any> = {
  'b1': {
    course_id: 'b1', course_name: 'Mathematik GK', semester: 'Q2/2. Halbjahr', teacher_short: 'Wb', teacher_full: 'Dr. Heinrich Weber',
    entries: [
      { entry_id: 'b1e1', date: daysAgo(0), hours: '1–2', thema: 'Analysis: Kurvendiskussion und Extremwertprobleme', homework: 'Aufgaben 1–5 auf Seite 142', homework_done: false, attendance: 'anwesend', files: [], content: 'Heute haben wir die Kurvendiskussion fortgesetzt. Schwerpunkte: Bestimmung von Extremwerten, Wendepunkten und das Verhalten im Unendlichen.' },
      { entry_id: 'b1e2', date: daysAgo(2), hours: '3–4', thema: 'Analysis: Ableitungen höherer Ordnung', homework: 'Arbeitsblatt 3 ausfüllen', homework_done: true, attendance: 'anwesend', files: [{ name: 'Arbeitsblatt_3.pdf', url: '/files/ab3.pdf' }], content: 'Einführung in Ableitungen höherer Ordnung und deren Anwendung bei der Kurvendiskussion.' },
      { entry_id: 'b1e3', date: daysAgo(4), hours: '1–2', thema: 'Analysis: Nullstellenberechnung', homework: '', homework_done: true, attendance: 'anwesend', files: [], content: 'Wiederholung der Nullstellenberechnung mit verschiedenen Verfahren.' },
      { entry_id: 'b1e4', date: daysAgo(7), hours: '5–6', thema: 'Analysis: Einführung Kurvendiskussion', homework: 'Seite 140 lesen', homework_done: true, attendance: 'anwesend', files: [], content: 'Erste Einführung in das Thema Kurvendiskussion.' },
      { entry_id: 'b1e5', date: daysAgo(10), hours: '1–2', thema: 'Analysis: Grenzwerte und Stetigkeit', homework: 'Aufgaben 1–3 auf dem Arbeitsblatt', homework_done: true, attendance: 'anwesend', files: [{ name: 'Grenzwerte.pdf', url: '/files/grenzwerte.pdf' }, { name: 'Übungen_Stetigkeit.pdf', url: '/files/stetigkeit.pdf' }], content: 'Einführung in Grenzwerte von Funktionen und das Konzept der Stetigkeit.' },
      { entry_id: 'b1e6', date: daysAgo(14), hours: '3–4', thema: 'Analysis: Wiederholung Differentialrechnung', homework: '', homework_done: true, attendance: 'entschuldigt', files: [], content: '' },
    ],
    entry_count: 6,
    exams: ['Klausur am ' + fmt(new Date(now.getTime() + 7 * 86400000)).slice(0, 10) + ': Analysis'],
    attendance_summary: { anwesend: '18', entschuldigt: '1', unentschuldigt: '0' },
  },
  'b2': {
    course_id: 'b2', course_name: 'Deutsch LK', semester: 'Q2/2. Halbjahr', teacher_short: 'Re', teacher_full: 'Prof. Anna Reinhardt',
    entries: [
      { entry_id: 'b2e1', date: daysAgo(1), hours: '1–3', thema: 'Faust I: Analyse des Osterspaziergangs', homework: 'Essay: Die Rolle des Erdgeists in Faust I', homework_done: true, attendance: 'anwesend', files: [], content: 'Ausführliche Analyse des Osterspaziergangs als Schlüsselszene.' },
      { entry_id: 'b2e2', date: daysAgo(3), hours: '4–5', thema: 'Faust I: Der Pakt mit Mephisto', homework: 'Szenenanalyse der Paktszene', homework_done: true, attendance: 'anwesend', files: [], content: 'Analyse der Paktszene zwischen Faust und Mephistopheles.' },
      { entry_id: 'b2e3', date: daysAgo(6), hours: '1–2', thema: 'Faust I: Einführung und Prolog', homework: 'Prolog im Himmel lesen', homework_done: true, attendance: 'anwesend', files: [{ name: 'Faust_Leseliste.pdf', url: '/files/faust.pdf' }], content: 'Einführung in die Lektüre. Besprechung des Prologs im Himmel.' },
      { entry_id: 'b2e4', date: daysAgo(8), hours: '3–4', thema: 'Faust I: Studierzimmer-Szene', homework: 'Vergleich der beiden Seelen in Fausts Brust', homework_done: false, attendance: 'anwesend', files: [], content: 'Analyse der Studierzimmer-Szene. Diskussion von Fausts innerem Zwiespalt.' },
      { entry_id: 'b2e5', date: daysAgo(12), hours: '5–6', thema: 'Literaturgeschichte: Sturm und Drang', homework: 'Referate vorbereiten', homework_done: true, attendance: 'anwesend', files: [{ name: 'Sturm_und_Drang.pdf', url: '/files/sturm.pdf' }], content: 'Überblick über die Epoche des Sturm und Drang mit Bezügen zu Goethes frühen Werken.' },
    ],
    entry_count: 5,
    exams: ['Klausur am ' + fmt(new Date(now.getTime() + 14 * 86400000)).slice(0, 10) + ': Faust I'],
    attendance_summary: { anwesend: '15', entschuldigt: '0', unentschuldigt: '0' },
  },
  'b3': {
    course_id: 'b3', course_name: 'Englisch GK', semester: 'Q2/2. Halbjahr', teacher_short: "O'C", teacher_full: "James O'Connor",
    entries: [
      { entry_id: 'b3e1', date: daysAgo(2), hours: '3–4', thema: 'Shakespeare: Hamlet Act III — To be or not to be', homework: 'Read Act IV, Scene 1–3', homework_done: false, attendance: 'anwesend', files: [], content: 'Analyse des berühmten Monologs. Diskussion über Hamlets inneren Konflikt.' },
      { entry_id: 'b3e2', date: daysAgo(5), hours: '3–4', thema: 'Shakespeare: Hamlet Act II', homework: 'Summary of Act II', homework_done: true, attendance: 'entschuldigt', files: [], content: '' },
      { entry_id: 'b3e3', date: daysAgo(8), hours: '1–2', thema: 'Shakespeare: Hamlet Act I — Characters', homework: 'Character sketch of Claudius', homework_done: true, attendance: 'anwesend', files: [], content: 'Einführung in die Charaktere des Stücks. Fokus auf Claudius und Gertrude.' },
      { entry_id: 'b3e4', date: daysAgo(11), hours: '5–6', thema: 'Shakespeare: Elizabethan Theatre', homework: 'Worksheet: Globe Theatre', homework_done: true, attendance: 'anwesend', files: [{ name: 'Globe_Theatre.pdf', url: '/files/globe.pdf' }], content: 'Historischer Kontext zum elisabethanischen Theater und zur Aufführungspraxis.' },
      { entry_id: 'b3e5', date: daysAgo(15), hours: '3–4', thema: 'Sonnet Analysis: Shakespeare\'s Sonnet 18', homework: 'Write your own sonnet', homework_done: false, attendance: 'fehlend', files: [], content: '' },
    ],
    entry_count: 5,
    exams: ['Klausur am ' + fmt(new Date(now.getTime() + 21 * 86400000)).slice(0, 10) + ': Hamlet'],
    attendance_summary: { anwesend: '20', entschuldigt: '2', unentschuldigt: '0' },
  },
  'b4': {
    course_id: 'b4', course_name: 'Physik LK', semester: 'Q2/2. Halbjahr', teacher_short: 'Kl', teacher_full: 'Dr. Sabine Keller',
    entries: [
      { entry_id: 'b4e1', date: daysAgo(3), hours: '1–2', thema: 'Quantenmechanik: Doppelspaltexperiment', homework: 'Berechnungen zum Doppelspaltexperiment', homework_done: false, attendance: 'anwesend', files: [], content: 'Durchführung und Analyse des Doppelspaltexperiments. Wellen-Teilchen-Dualismus.' },
      { entry_id: 'b4e2', date: daysAgo(6), hours: '5–6', thema: 'Quantenmechanik: Photoeffekt', homework: '', homework_done: true, attendance: 'anwesend', files: [{ name: 'Photoeffekt_Experiment.pdf', url: '/files/photo.pdf' }], content: 'Experimentelle Untersuchung des Photoeffekts.' },
      { entry_id: 'b4e3', date: daysAgo(9), hours: '1–2', thema: 'Quantenmechanik: Heisenbergsche Unschärferelation', homework: 'Aufgaben zur Unschärferelation', homework_done: true, attendance: 'anwesend', files: [], content: 'Einführung in die Heisenbergsche Unschärferelation und ihre Bedeutung.' },
      { entry_id: 'b4e4', date: daysAgo(13), hours: '3–4', thema: 'Atomphysik: Bohrsches Atommodell', homework: 'Energieniveaus berechnen', homework_done: true, attendance: 'anwesend', files: [{ name: 'Bohr_Atommodell.pdf', url: '/files/bohr.pdf' }], content: 'Wiederholung des Bohrschen Atommodells und der Energieniveaus.' },
      { entry_id: 'b4e5', date: daysAgo(17), hours: '5–6', thema: 'Atomphysik: Absorption und Emission', homework: '', homework_done: true, attendance: 'unentschuldigt', files: [], content: '' },
    ],
    entry_count: 5,
    exams: ['Klausur am ' + fmt(new Date(now.getTime() + 21 * 86400000)).slice(0, 10) + ': Quantenmechanik'],
    attendance_summary: { anwesend: '12', entschuldigt: '0', unentschuldigt: '1' },
  },
  'b5': {
    course_id: 'b5', course_name: 'Geschichte GK', semester: 'Q2/2. Halbjahr', teacher_short: 'Bg', teacher_full: 'Herr Thomas Bergmann',
    entries: [
      { entry_id: 'b5e1', date: daysAgo(4), hours: '1–2', thema: 'Weimarer Republik: Die Goldenen Zwanziger', homework: 'Quellenanalyse: Tagebucheintrag 1925', homework_done: true, attendance: 'anwesend', files: [], content: 'Besprechung der wirtschaftlichen und kulturellen Blütezeit der Weimarer Republik.' },
      { entry_id: 'b5e2', date: daysAgo(6), hours: '3–4', thema: 'Weimarer Republik: Inflation 1923', homework: 'Schaubild zur Inflation analysieren', homework_done: true, attendance: 'anwesend', files: [{ name: 'Inflation_1923.pdf', url: '/files/inflation.pdf' }], content: 'Analyse der Hyperinflation von 1923 und ihrer sozialen Auswirkungen.' },
      { entry_id: 'b5e3', date: daysAgo(9), hours: '1–2', thema: 'Weimarer Republik: Versailler Vertrag', homework: 'Karikaturenanalyse', homework_done: true, attendance: 'anwesend', files: [], content: 'Diskussion der Folgen des Versailler Vertrags für die Weimarer Republik.' },
      { entry_id: 'b5e4', date: daysAgo(12), hours: '5–6', thema: 'Kaiserreich: Erster Weltkrieg', homework: 'Referate vorbereiten', homework_done: false, attendance: 'anwesend', files: [{ name: 'Weltkrieg_Verlauf.pdf', url: '/files/ww1.pdf' }], content: 'Zusammenfassung der Kriegsereignisse und der Kriegsschuldfrage.' },
      { entry_id: 'b5e5', date: daysAgo(16), hours: '3–4', thema: 'Kaiserreich: Bismarck-Ära', homework: '', homework_done: true, attendance: 'entschuldigt', files: [], content: '' },
    ],
    entry_count: 5,
    exams: ['Klausur am ' + fmt(new Date(now.getTime() + 10 * 86400000)).slice(0, 10) + ': Weimarer Republik'],
    attendance_summary: { anwesend: '22', entschuldigt: '1', unentschuldigt: '0' },
  },
  'b6': {
    course_id: 'b6', course_name: 'Informatik LK', semester: 'Q2/2. Halbjahr', teacher_short: 'Ch', teacher_full: 'Frau Dr. Laura Chen',
    entries: [
      { entry_id: 'b6e1', date: daysAgo(5), hours: '1–3', thema: 'Datenstrukturen: Binäre Suchbäume', homework: 'Implementierung eines BST in Java', homework_done: false, attendance: 'anwesend', files: [], content: 'Einführung in binäre Suchbäume: Eigenschaften, Operationen (Einfügen, Suchen, Löschen) und Traversierung.' },
      { entry_id: 'b6e2', date: daysAgo(7), hours: '1–2', thema: 'Datenstrukturen: Bäume und Graphen', homework: 'Übungsblatt 4 bearbeiten', homework_done: true, attendance: 'anwesend', files: [{ name: 'Graphen_Einführung.pdf', url: '/files/graphen.pdf' }], content: 'Grundlagen der Graphentheorie: gerichtete/ungerichtete Graphen, Adjazenzmatrix, Adjazenzliste.' },
      { entry_id: 'b6e3', date: daysAgo(10), hours: '3–4', thema: 'Algorithmen: Sortierverfahren', homework: 'Merge-Sort implementieren', homework_done: true, attendance: 'anwesend', files: [{ name: 'Sortierverfahren.pdf', url: '/files/sorting.pdf' }], content: 'Vergleich von Sortierverfahren: Bubble Sort, Selection Sort, Merge Sort, Quick Sort.' },
      { entry_id: 'b6e4', date: daysAgo(13), hours: '1–2', thema: 'Algorithmen: Rekursion', homework: 'Rekursive Fibonacci-Funktion', homework_done: true, attendance: 'anwesend', files: [], content: 'Einführung in die rekursive Programmierung anhand von Beispielen.' },
      { entry_id: 'b6e5', date: daysAgo(18), hours: '5–6', thema: 'Objektorientierung: Vererbung und Polymorphie', homework: '', homework_done: true, attendance: 'anwesend', files: [], content: 'Wiederholung der OOP-Konzepte Vererbung, Polymorphie und Interfaces.' },
    ],
    entry_count: 5,
    exams: ['Klausur am ' + fmt(new Date(now.getTime() + 28 * 86400000)).slice(0, 10) + ': Datenstrukturen'],
    attendance_summary: { anwesend: '14', entschuldigt: '0', unentschuldigt: '0' },
  },
};

const mockEntryDetails: Record<string, any> = {
  'b1e1': {
    id: 'b1e1',
    title: 'Analysis: Kurvendiskussion und Extremwertprobleme',
    content: '<p>Heute haben wir die Kurvendiskussion fortgesetzt. Schwerpunkte:</p><ul><li>Bestimmung von Extremwerten (Hoch- und Tiefpunkte)</li><li>Wendepunkte und Krümmungsverhalten</li><li>Verhalten im Unendlichen (Grenzwerte)</li><li>Symmetrieeigenschaften von Funktionen</li></ul><p>Beispielfunktion: f(x) = x³ - 3x² + 2x</p><p>Hausaufgabe: Aufgaben 1–5 auf Seite 142</p>',
    date: daysAgo(0),
    attachments: [],
  },
  'b1e2': {
    id: 'b1e2',
    title: 'Analysis: Ableitungen höherer Ordnung',
    content: '<p>Einführung in Ableitungen höherer Ordnung:</p><ul><li>f\'(x): erste Ableitung (Steigung)</li><li>f\'\'(x): zweite Ableitung (Krümmung)</li><li>f\'\'\'(x): dritte Ableitung</li></ul><p>Anwendung bei der Kurvendiskussion zur Bestimmung von Wendepunkten.</p>',
    date: daysAgo(2),
    attachments: [{ name: 'Arbeitsblatt_3.pdf', url: '/files/ab3.pdf' }],
  },
  'b1e3': {
    id: 'b1e3',
    title: 'Analysis: Nullstellenberechnung',
    content: '<p>Wiederholung der Nullstellenberechnung mit verschiedenen Verfahren:</p><ul><li>Quadratische Ergänzung</li><li>Mitternachtsformel</li><li>Polynomdivision</li><li>Substitutionsverfahren</li></ul><p>Anwendung auf Funktionen dritten und vierten Grades.</p>',
    date: daysAgo(4),
    attachments: [],
  },
  'b1e5': {
    id: 'b1e5',
    title: 'Analysis: Grenzwerte und Stetigkeit',
    content: '<p>Einführung in die Grenzwertberechnung:</p><ul><li>Grenzwerte für x → ±∞</li><li>Rechts- und linksseitige Grenzwerte</li><li>Stetigkeit von Funktionen</li><li>Zwischenwertsatz</li></ul><p>Beispiele und Übungsaufgaben zur Vertiefung.</p>',
    date: daysAgo(10),
    attachments: [{ name: 'Grenzwerte.pdf', url: '/files/grenzwerte.pdf' }, { name: 'Übungen_Stetigkeit.pdf', url: '/files/stetigkeit.pdf' }],
  },
  'b2e1': {
    id: 'b2e1',
    title: 'Faust I: Analyse des Osterspaziergangs',
    content: '<p>Ausführliche Analyse des Osterspaziergangs als Schlüsselszene (Vers 808–1177).</p><p>Schwerpunkte:</p><ul><li>Fausts Monolog und seine Weltsicht</li><li>Die Bedeutung des Osterfestes</li><li>Sprachliche Gestaltung und Metrik</li><li>Übergang zur Osterszene</li></ul><p>Der Osterspaziergang zeigt Fausts innere Zerrissenheit zwischen Verzweiflung und Lebensbejahung.</p>',
    date: daysAgo(1),
    attachments: [],
  },
  'b2e2': {
    id: 'b2e2',
    title: 'Faust I: Der Pakt mit Mephisto',
    content: '<p>Analyse der Paktszene (Studierzimmer II, Verse 1770–1867).</p><ul><li>Die Wettbedingungen</li><li>Fausts und Mephistos Motive</li><li>Sprachliche Analyse des Paktes</li><li>Bezug zur heutigen Rezeption</li></ul>',
    date: daysAgo(3),
    attachments: [],
  },
  'b2e4': {
    id: 'b2e4',
    title: 'Faust I: Studierzimmer-Szene',
    content: '<p>Analyse der Studierzimmer-Szene.</p><p>Im Mittelpunkt steht Fausts berühmter Monolog "Habe nun, ach! Philosophie, Juristerei und Medizin..." (Verse 354–385).</p><ul><li>Fausts intellektuelle Krise</li><li>Die berühmten "zwei Seelen" in Fausts Brust</li><li>Der Entschluss zum Selbstmord und die Rettung durch die Osterglocken</li></ul>',
    date: daysAgo(8),
    attachments: [],
  },
  'b3e1': {
    id: 'b3e1',
    title: 'Shakespeare: Hamlet Act III — To be or not to be',
    content: '<p>Analyse des berühmten "To be or not to be"-Monologs (Act III, Scene 1).</p><ul><li>Existenzielle Fragen und Selbstreflexion</li><li>Der Konflikt zwischen Handeln und Zögern</li><li>Sprachliche Mittel: Metaphern, Antithesen</li><li>Bedeutung für die Charakterentwicklung Hamlets</li></ul>',
    date: daysAgo(2),
    attachments: [],
  },
  'b3e3': {
    id: 'b3e3',
    title: 'Shakespeare: Hamlet Act I — Characters',
    content: '<p>Introduction to the main characters of Hamlet Act I.</p><ul><li>Claudius — the usurping king</li><li>Gertrude — Hamlet\'s mother</li><li>Polonius — the lord chamberlain</li><li>Ophelia and Laertes</li><li>King Hamlet\'s ghost</li></ul><p>Key themes: appearance vs. reality, grief, corruption.</p>',
    date: daysAgo(8),
    attachments: [],
  },
  'b4e1': {
    id: 'b4e1',
    title: 'Quantenmechanik: Doppelspaltexperiment',
    content: '<p>Durchführung und Analyse des Doppelspaltexperiments.</p><p>Zentrale Erkenntnisse:</p><ul><li>Interferenzmuster bei Licht und Elektronen</li><li>Wellen-Teilchen-Dualismus</li><li>Die Rolle der Messung und Kollaps der Wellenfunktion</li><li>Bedeutung für das Verständnis der Quantenmechanik</li></ul>',
    date: daysAgo(3),
    attachments: [],
  },
  'b4e3': {
    id: 'b4e3',
    title: 'Quantenmechanik: Heisenbergsche Unschärferelation',
    content: '<p>Einführung in die Heisenbergsche Unschärferelation.</p><ul><li>Δx · Δp ≥ ℏ/2</li><li>Orts-Impuls-Unschärfe</li><li>Energie-Zeit-Unschärfe</li><li>Philosophische und experimentelle Bedeutung</li></ul><p>Diskussion der Grenzen der Messbarkeit in der Quantenwelt.</p>',
    date: daysAgo(9),
    attachments: [],
  },
  'b5e1': {
    id: 'b5e1',
    title: 'Weimarer Republik: Die Goldenen Zwanziger',
    content: '<p>Besprechung der wirtschaftlichen und kulturellen Blütezeit der Weimarer Republik (1924–1929).</p><ul><li>Wirtschaftliche Stabilisierung durch den Dawes-Plan</li><li>Kulturelle Entwicklungen: Bauhaus, Neue Sachlichkeit, expressionistischer Film</li><li>Gesellschaftlicher Wandel und die "Neue Frau"</li><li>Politische Radikalisierung am Ende der 1920er Jahre</li></ul>',
    date: daysAgo(4),
    attachments: [],
  },
  'b5e2': {
    id: 'b5e2',
    title: 'Weimarer Republik: Inflation 1923',
    content: '<p>Analyse der Hyperinflation von 1923 und ihrer sozialen Auswirkungen.</p><ul><li>Ursachen der Inflation: Reparationen, Ruhrbesetzung, Geldmengenausweitung</li><li>Soziale Folgen: Verarmung der Mittelschicht, Spekulation</li><li>Die Währungsreform und die Einführung der Rentenmark</li></ul>',
    date: daysAgo(6),
    attachments: [{ name: 'Inflation_1923.pdf', url: '/files/inflation.pdf' }],
  },
  'b5e3': {
    id: 'b5e3',
    title: 'Weimarer Republik: Versailler Vertrag',
    content: '<p>Diskussion der Folgen des Versailler Vertrags für die Weimarer Republik.</p><ul><li>Die Kriegsschuldthese (Artikel 231)</li><li>Gebietsabtretungen und Reparationen</li><li>Die Dolchstoßlegende</li><li>Auswirkungen auf die politische Stabilität der Weimarer Republik</li></ul>',
    date: daysAgo(9),
    attachments: [],
  },
  'b6e1': {
    id: 'b6e1',
    title: 'Datenstrukturen: Binäre Suchbäume',
    content: '<p>Einführung in binäre Suchbäume (Binary Search Trees, BST).</p><p>Wichtige Operationen:</p><ul><li>Einfügen (insert): O(log n) im Durchschnitt</li><li>Suchen (search): O(log n) im Durchschnitt</li><li>Löschen (delete): O(log n) im Durchschnitt</li><li>Traversierung: In-Order, Pre-Order, Post-Order</li></ul><p>Implementierung in Java mit generischen Typen.</p>',
    date: daysAgo(5),
    attachments: [],
  },
  'b6e2': {
    id: 'b6e2',
    title: 'Datenstrukturen: Bäume und Graphen',
    content: '<p>Grundlagen der Graphentheorie:</p><ul><li>Gerichtete vs. ungerichtete Graphen</li><li>Adjazenzmatrix und Adjazenzliste</li><li>Gewichtete und ungewichtete Graphen</li><li>Bäume als spezielle Graphen</li><li>Anwendungen: Routenplanung, soziale Netzwerke</li></ul>',
    date: daysAgo(7),
    attachments: [{ name: 'Graphen_Einführung.pdf', url: '/files/graphen.pdf' }],
  },
  'b6e3': {
    id: 'b6e3',
    title: 'Algorithmen: Sortierverfahren',
    content: '<p>Vergleich von Sortierverfahren:</p><table><tr><th>Verfahren</th><th>Best-Case</th><th>Worst-Case</th></tr><tr><td>Bubble Sort</td><td>O(n)</td><td>O(n²)</td></tr><tr><td>Selection Sort</td><td>O(n²)</td><td>O(n²)</td></tr><tr><td>Merge Sort</td><td>O(n log n)</td><td>O(n log n)</td></tr><tr><td>Quick Sort</td><td>O(n log n)</td><td>O(n²)</td></tr></table><p>Implementierung von Merge-Sort als Hausaufgabe.</p>',
    date: daysAgo(10),
    attachments: [{ name: 'Sortierverfahren.pdf', url: '/files/sorting.pdf' }],
  },
};

const mockCalendarCategories = [
  { id: 1, name: 'Klausuren', color: '#dc2626', logo: 'fa-regular fa-file-lines' },
  { id: 2, name: 'Veranstaltungen', color: '#2563eb', logo: 'fa-regular fa-calendar' },
  { id: 3, name: 'Ferien', color: '#059669', logo: 'fa-regular fa-sun' },
  { id: 4, name: 'Abgaben', color: '#d97706', logo: 'fa-regular fa-clock' },
  { id: 5, name: 'Konferenzen', color: '#7c3aed', logo: 'fa-regular fa-users' },
];

const mockCalendarEvents = [
  { id: 'ev1', title: 'Mathe-Klausur Q2', category: '1', category_name: 'Klausuren', category_color: '#dc2626', description: '<p>Klausur zum Thema <strong>Analysis: Kurvendiskussion und Extremwertprobleme</strong>.</p><p>Der Stoff umfasst:</p><ul><li>Bestimmung von Extremwerten</li><li>Wendepunkte und Krümmungsverhalten</li><li>Grenzwerte und Verhalten im Unendlichen</li><li>Symmetrieeigenschaften</li></ul><p>Erlaubte Hilfsmittel: Taschenrechner (nicht programmierbar), Formelsammlung</p>', start: relDateTime(7, '08:00:00'), end: relDateTime(7, '09:30:00'), all_day: false, new: '1', editable: false, properties: { 'Fach': 'Mathematik GK', 'Lehrer': 'Dr. Heinrich Weber', 'Raum': 'A12', 'Dauer': '90 Minuten', 'Hilfsmittel': 'Taschenrechner, Formelsammlung' }, raw: {} },
  { id: 'ev2', title: 'Schulausflug Oberstufe', category: '2', category_name: 'Veranstaltungen', category_color: '#2563eb', description: '<p>Der jährliche Schulausflug der Oberstufe (Q1–Q4).</p><p><strong>Programm:</strong></p><ul><li>Goethe-Haus (Frankfurt) — Führung durch Goethes Geburtshaus</li><li>Senckenbergmuseum — Naturkundliche Ausstellung mit Fokus auf Evolution</li></ul><p><strong>Abfahrt:</strong> 8:00 Uhr am Schulhof<br><strong>Rückkehr:</strong> ca. 16:00 Uhr</p><p>Bitte an wetterfeste Kleidung und Verpflegung denken.</p>', start: relDateTime(10, '08:00:00'), end: relDateTime(10, '16:00:00'), all_day: true, new: '0', editable: false, properties: { 'Ziel': 'Goethe-Haus + Senckenbergmuseum', 'Abfahrt': '08:00 Uhr', 'Rückkehr': 'ca. 16:00 Uhr', 'Klasse': 'Q1–Q4', 'Kosten': '12,00 € (Eintritt)' }, raw: {} },
  { id: 'ev3', title: 'Faust Essay Abgabe', category: '4', category_name: 'Abgaben', category_color: '#d97706', description: '<p>Abgabe des Essays zum Thema <strong>"Die Rolle des Erdgeists in Faust I"</strong>.</p><p><strong>Anforderungen:</strong></p><ul><li>Umfang: 3–5 Seiten</li><li>Format: PDF</li><li>Abgabe über das Schulportal</li></ul>', start: relDateTime(5, '23:59:00'), end: relDateTime(5, '23:59:00'), all_day: true, new: '0', editable: false, properties: { 'Fach': 'Deutsch LK', 'Lehrer': 'Prof. Anna Reinhardt', 'Format': 'PDF', 'Umfang': '3–5 Seiten', 'Abgabeweg': 'Schulportal' }, raw: {} },
  { id: 'ev4', title: 'Sommerferien 2026', category: '3', category_name: 'Ferien', category_color: '#059669', description: '<p>Sommerferien in Hessen 2026.</p><p>Letzter Schultag vor den Ferien: 18.07.2026<br>Erster Schultag nach den Ferien: 31.08.2026</p><p>Wir wünschen allen Schülerinnen und Schülern erholsame Ferien!</p>', start: relDateTime(40, '00:00:00'), end: relDateTime(83, '23:59:00'), all_day: true, new: '0', editable: false, properties: { 'Bundesland': 'Hessen', 'Letzter Schultag': relDate(40), 'Erster Schultag': relDate(84), 'Dauer': '6 Wochen' }, raw: {} },
  { id: 'ev5', title: 'Fachkonferenz Mathe', category: '5', category_name: 'Konferenzen', category_color: '#7c3aed', description: '<p>Fachkonferenz Mathematik im Lehrerzimmer.</p><p><strong>Tagesordnung:</strong></p><ul><li>Ergebnisse der letzten Klausur</li><li>Planung des nächsten Schuljahres</li><li>Wahl der Lehrbücher für die E-Phase</li><li>Verschiedenes</li></ul>', start: relDateTime(3, '14:00:00'), end: relDateTime(3, '16:00:00'), all_day: false, new: '1', editable: false, properties: { 'Ort': 'Lehrerzimmer', 'Teilnehmer': 'Fachschaft Mathematik', 'Leitung': 'Dr. Heinrich Weber' }, raw: {} },
  { id: 'ev6', title: 'Zeugnisausgabe', category: '2', category_name: 'Veranstaltungen', category_color: '#2563eb', description: '<p>Zeugnisausgabe für das 2. Halbjahr 2025/2026.</p><p><strong>Hinweise:</strong></p><ul><li>Die Ausgabe findet in der Aula statt</li><li>Bitte pünktlich erscheinen</li><li>Eltern sind ebenfalls willkommen</li></ul>', start: relDateTime(30, '10:00:00'), end: relDateTime(30, '11:00:00'), all_day: false, new: '0', editable: false, properties: { 'Ort': 'Aula', 'Datum': relDate(30), 'Uhrzeit': '10:00–11:00 Uhr', 'Klasse': 'Q2' }, raw: {} },
  { id: 'ev7', title: 'Physik LK Klausur', category: '1', category_name: 'Klausuren', category_color: '#dc2626', description: '<p>Klausur zum Thema <strong>Quantenmechanik</strong>.</p><p><strong>Stoffgebiete:</strong></p><ul><li>Doppelspaltexperiment</li><li>Photoeffekt</li><li>Heisenbergsche Unschärferelation</li><li>Bohrsches Atommodell</li></ul><p>Erlaubte Hilfsmittel: Taschenrechner, Formelsammlung, selbsterstellte einseitige Notiz</p>', start: relDateTime(14, '08:00:00'), end: relDateTime(14, '09:30:00'), all_day: false, new: '1', editable: false, properties: { 'Fach': 'Physik LK', 'Lehrer': 'Dr. Sabine Keller', 'Raum': 'D17', 'Dauer': '90 Minuten', 'Hilfsmittel': 'Taschenrechner, Formelsammlung, Notiz' }, raw: {} },
  { id: 'ev8', title: 'Elternsprechtag Q2', category: '2', category_name: 'Veranstaltungen', category_color: '#2563eb', description: '<p>Elternsprechtag für die Qualifikationsphase (Q2).</p><p>Sie haben die Möglichkeit, mit allen Fachlehrkräften Ihrer Kinder zu sprechen.</p><p><strong>Zeitfenster:</strong> 16:00–19:00 Uhr</p><p>Anmeldung im Sekretariat oder online über das Schulportal.</p>', start: relDateTime(2, '16:00:00'), end: relDateTime(2, '19:00:00'), all_day: false, new: '0', editable: false, properties: { 'Zielgruppe': 'Q2', 'Uhrzeit': '16:00–19:00 Uhr', 'Anmeldung': 'Sekretariat / Online', 'Raum': 'Aula + Fachräume' }, raw: {} },
  { id: 'ev9', title: 'Deutsch LK Klausur', category: '1', category_name: 'Klausuren', category_color: '#dc2626', description: '<p>Klausur zum Thema <strong>Faust I</strong>.</p><ul><li>Osterspaziergang</li><li>Der Pakt mit Mephisto</li><li>Studierzimmer-Szene</li><li>Gattung: Dramenanalyse mit Erörterung</li></ul>', start: relDateTime(12, '08:00:00'), end: relDateTime(12, '11:00:00'), all_day: false, new: '0', editable: false, properties: { 'Fach': 'Deutsch LK', 'Lehrer': 'Prof. Anna Reinhardt', 'Raum': 'B05', 'Dauer': '180 Minuten' }, raw: {} },
  { id: 'ev10', title: 'Geschichte GK Klausur', category: '1', category_name: 'Klausuren', category_color: '#dc2626', description: '<p>Klausur zum Thema <strong>Weimarer Republik</strong>.</p><p>Stoff: Versailler Vertrag, Inflation 1923, Goldene Zwanziger, Ende der Republik.</p>', start: relDateTime(9, '08:00:00'), end: relDateTime(9, '09:30:00'), all_day: false, new: '0', editable: false, properties: { 'Fach': 'Geschichte GK', 'Lehrer': 'Herr Thomas Bergmann', 'Raum': 'C03', 'Dauer': '90 Minuten' }, raw: {} },
  { id: 'ev11', title: 'Informatik Projektabgabe', category: '4', category_name: 'Abgaben', category_color: '#d97706', description: '<p>Abgabe des Projekts <strong>"Binärer Suchbaum in Java"</strong>.</p><p>Das Projekt umfasst:</p><ul><li>Vollständige Implementierung eines BST</li><li>Unit-Tests mit JUnit</li><li>Dokumentation (JavaDoc)</li></ul>', start: relDateTime(8, '23:59:00'), end: relDateTime(8, '23:59:00'), all_day: true, new: '0', editable: false, properties: { 'Fach': 'Informatik LK', 'Lehrer': 'Frau Dr. Laura Chen', 'Abgabeweg': 'Schulportal', 'Format': 'ZIP (Quellcode + Dokumentation)' }, raw: {} },
  { id: 'ev12', title: 'SV-Sitzung', category: '5', category_name: 'Konferenzen', category_color: '#7c3aed', description: '<p>Schülervertretungs-Sitzung zur Planung des Sommerfestes.</p><p><strong>Themen:</strong></p><ul><li>Planung Sommerfest 2026</li><li>Rückblick Projekttage</li><li>Wünsche und Anregungen</li></ul>', start: relDateTime(4, '13:30:00'), end: relDateTime(4, '15:00:00'), all_day: false, new: '0', editable: false, properties: { 'Ort': 'Raum 215', 'Teilnehmer': 'SV Q2', 'Leitung': 'Max Mustermann' }, raw: {} },
  { id: 'ev13', title: 'Studientag', category: '3', category_name: 'Ferien', category_color: '#059669', description: '<p>Studientag — kein regulärer Unterricht.</p><p>Die Lehrkräfte nehmen an Fortbildungen teil. Die Schülerinnen und Schüler arbeiten eigenständig an Projekten oder haben frei.</p>', start: relDateTime(-3, '00:00:00'), end: relDateTime(-3, '23:59:00'), all_day: true, new: '0', editable: false, properties: { 'Art': 'Studientag', 'Unterricht': 'entfällt' }, raw: {} },
  { id: 'ev14', title: 'Mündliche Prüfung Englisch', category: '1', category_name: 'Klausuren', category_color: '#dc2626', description: '<p>Mündliche Prüfung in Englisch (Abiturvorbereitung).</p><p>Sie erhalten einen unbekannten Text, den Sie analysieren und diskutieren müssen. Anschließend folgt ein Gespräch über ein zweites Prüfungsthema.</p><p><strong>Dauer:</strong> ca. 20 Minuten + 20 Minuten Vorbereitung</p>', start: relDateTime(15, '09:00:00'), end: relDateTime(15, '12:00:00'), all_day: false, new: '0', editable: false, properties: { 'Fach': 'Englisch GK', 'Prüfer': "James O'Connor", 'Raum': 'B12', 'Dauer': '20 Min. + 20 Min. Vorbereitung' }, raw: {} },
  { id: 'ev15', title: 'Sporttag Q2', category: '2', category_name: 'Veranstaltungen', category_color: '#2563eb', description: '<p>Sporttag der Q2 in der Sportanlage Nord.</p><p><strong>Angebotene Sportarten:</strong></p><ul><li>Fußball (Turnier)</li><li>Volleyball</li><li>Leichtathletik</li><li>Badminton</li></ul><p>Bitte Sportkleidung und Handtuch mitbringen.</p>', start: relDateTime(13, '08:00:00'), end: relDateTime(13, '15:00:00'), all_day: false, new: '0', editable: false, properties: { 'Ort': 'Sportanlage Nord', 'Klasse': 'Q2', 'Sportarten': 'Fußball, Volleyball, Leichtathletik, Badminton' }, raw: {} },
];

const mockDsbData = {
  menuItems: ['Heute', 'Morgen'],
  planUrls: ['/plan/heute', '/plan/morgen'],
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
    date: relDate(0),
  }],
};

const mockTimetable = [
  { date: relDate(0), name: 'Montag', lessons: [
    { id: 'mo-1', period: '1–2', start_time: '08:00', end_time: '09:30', subject: 'Mathematik GK', teacher: 'Wb', room: 'A12', course_id: 'b1', course_name: 'Mathematik GK' },
    { id: 'mo-2', period: '3–4', start_time: '09:50', end_time: '11:20', subject: 'Deutsch LK', teacher: 'Re', room: 'B05', course_id: 'b2', course_name: 'Deutsch LK', homework: [{ entry_id: 'e2', text: mockCourses[1].homework, done: true, assigned_date: mockCourses[1].datum.slice(0, 10) }] },
    { id: 'mo-3', period: '5–6', start_time: '11:40', end_time: '13:10', subject: 'Englisch GK', teacher: "O'C", room: 'C01', course_id: 'b3', course_name: 'Englisch GK', homework: [{ entry_id: 'e3', text: mockCourses[2].homework, done: false, assigned_date: mockCourses[2].datum.slice(0, 10) }] },
  ] },
  { date: relDate(1), name: 'Dienstag', lessons: [
    { id: 'di-1', period: '1–2', start_time: '08:00', end_time: '09:30', subject: 'Physik LK', teacher: 'Kl', room: 'D17', course_id: 'b4', course_name: 'Physik LK', homework: [{ entry_id: 'e4', text: mockCourses[3].homework, done: false, assigned_date: mockCourses[3].datum.slice(0, 10) }] },
    { id: 'di-2', period: '3–4', start_time: '09:50', end_time: '11:20', subject: 'Geschichte GK', teacher: 'Bg', room: 'C03', course_id: 'b5', course_name: 'Geschichte GK', homework: [{ entry_id: 'e5', text: mockCourses[4].homework, done: true, assigned_date: mockCourses[4].datum.slice(0, 10) }] },
    { id: 'di-3', period: '5–6', start_time: '11:40', end_time: '13:10', subject: 'Informatik LK', teacher: 'Ch', room: 'R204', course_id: 'b6', course_name: 'Informatik LK', homework: [{ entry_id: 'e6', text: mockCourses[5].homework, done: false, assigned_date: mockCourses[5].datum.slice(0, 10) }] },
  ] },
  { date: relDate(2), name: 'Mittwoch', lessons: [
    { id: 'mi-1', period: '1–2', start_time: '08:00', end_time: '09:30', subject: 'Deutsch LK', teacher: 'Re', room: 'B05', course_id: 'b2', course_name: 'Deutsch LK' },
    { id: 'mi-2', period: '3–4', start_time: '09:50', end_time: '11:20', subject: 'Mathematik GK', teacher: 'Wb', room: 'A12', course_id: 'b1', course_name: 'Mathematik GK', homework: [{ entry_id: 'e1', text: mockCourses[0].homework, done: false, assigned_date: mockCourses[0].datum.slice(0, 10) }] },
  ] },
  { date: relDate(3), name: 'Donnerstag', lessons: [
    { id: 'do-1', period: '1–2', start_time: '08:00', end_time: '09:30', subject: 'Englisch GK', teacher: "O'C", room: 'C01', course_id: 'b3', course_name: 'Englisch GK' },
    { id: 'do-2', period: '3–4', start_time: '09:50', end_time: '11:20', subject: 'Physik LK', teacher: 'Kl', room: 'D17', info: 'Experiment mitbringen', course_id: 'b4', course_name: 'Physik LK' },
  ] },
  { date: relDate(4), name: 'Freitag', lessons: [
    { id: 'fr-1', period: '1–2', start_time: '08:00', end_time: '09:30', subject: 'Informatik LK', teacher: 'Ch', room: 'R204', course_id: 'b6', course_name: 'Informatik LK' },
    { id: 'fr-2', period: '3–4', start_time: '09:50', end_time: '11:20', subject: 'Geschichte GK', teacher: 'Bg', room: 'C03', course_id: 'b5', course_name: 'Geschichte GK' },
  ] },
];

const mockPeriodStart = (value: unknown) => Number(String(value || '').match(/\d+/)?.[0] || 999);

function getMockTimetable() {
  const days = mockTimetable.map(day => ({ ...day, lessons: day.lessons.map(lesson => ({ ...lesson })) }));
  for (const override of mockCustomLessons) {
    const day = days.find(entry => entry.date === override.date);
    if (!day) continue;
    const matching = day.lessons
      .map((lesson, index) => ({ lesson, index }))
      .filter(({ lesson }) => mockPeriodStart(lesson.period) === mockPeriodStart(override.period));
    if (override.removed) {
      day.lessons = day.lessons.filter(lesson => mockPeriodStart(lesson.period) !== mockPeriodStart(override.period));
      continue;
    }
    const nextLesson = {
      ...(matching[0]?.lesson || {}),
      ...override,
      id: `custom-${override.date}-${override.period}`,
      is_custom: true,
      subject: override.subject || 'Unterricht',
    };
    if (matching.length) {
      day.lessons = day.lessons.filter(lesson => mockPeriodStart(lesson.period) !== mockPeriodStart(override.period));
    }
    day.lessons.push(nextLesson);
    day.lessons.sort((left, right) => mockPeriodStart(left.period) - mockPeriodStart(right.period));
  }
  return days;
}

const mockStudyGroupExams = [
  { id: 'exam-1', course_id: 'group-1', course_name: 'Mathematik GK', course_sys_id: 'Q2-M-GK1', date: relDate(7), type: 'Klausur', duration_label: '90 Minuten', hours: '1.–2. Stunde' },
  { id: 'exam-2', course_id: 'group-2', course_name: 'Deutsch LK', course_sys_id: 'Q2-D-LK1', date: relDate(12), type: 'Klausur', duration_label: '180 Minuten', hours: '1.–4. Stunde' },
];

const mockStudyGroups = [
  { id: 'group-1', semester: '2026/27 · 1. Halbjahr', course_name: 'Mathematik GK', course_sys_id: 'Q2-M-GK1', teachers: [{ krz: 'Wb', first_name: 'Heinrich', last_name: 'Weber', email: 'h.weber@schule.example', recipient_id: 'l-1001' }], exams: [mockStudyGroupExams[0]] },
  { id: 'group-2', semester: '2026/27 · 1. Halbjahr', course_name: 'Deutsch LK', course_sys_id: 'Q2-D-LK1', teachers: [{ krz: 'Re', first_name: 'Anna', last_name: 'Reinhardt', email: 'a.reinhardt@schule.example', recipient_id: 'l-1002' }], exams: [mockStudyGroupExams[1]] },
  { id: 'group-3', semester: '2026/27 · 1. Halbjahr', course_name: 'Physik LK', course_sys_id: 'Q2-PH-LK1', teachers: [{ krz: 'Kl', first_name: 'Sabine', last_name: 'Keller', email: null, recipient_id: 'l-1003' }], exams: [] },
];

function urlMatches(pattern: string, url: string): boolean {
  const regex = new RegExp('^' + pattern.replace(/:\w+/g, '[^/]+').replace(/\*/g, '.*') + '$');
  return regex.test(url);
}

export function getMockResponse(url: string, method: string, config: any): { data: any; status: number } {
  const u = (url || '').replace(config?.baseURL || '', '').split('?')[0];

  // Auth
  if (u === '/benutzer' && method === 'get') { return { status: 200, data: { success: true, data: mockUser } }; }
  if (u === '/health' && method === 'get') { return { status: 200, data: { status: 'ok' } }; }

  // Modules
  if (u === '/modules' && method === 'get') { return { status: 200, data: { success: true, modules: mockModules } }; }

  // Messages
  if (u === '/nachrichten/headers' && method === 'get') { return { status: 200, data: { success: true, total: mockMessageHeaders.length, conversations: mockMessageHeaders } }; }
  if (u.startsWith('/nachrichten/') && method === 'get' && !u.includes('search') && !u.includes('headers')) {
    const convId = u.split('/')[2]?.split('?')[0];
    const conv = mockConversations[convId];
    if (conv) {
      return { status: 200, data: { success: true, conversation_id: convId, messages: conv.messages } };
    }
    return { status: 200, data: { success: true, conversation_id: convId || '', messages: [] } };
  }
  if (u.startsWith('/nachrichten/search') && method === 'get') {
    return { status: 200, data: { success: true, results: [
      { id: 'r1', name: 'Herr Müller', username: 'mueller', type: 'Lehrer' },
      { id: 'r2', name: 'Frau Schmidt', username: 'schmidt', type: 'Lehrer' },
      { id: 'r3', name: 'Max Mustermann', username: 'max.mustermann', type: 'Schüler' },
      { id: 'r4', name: 'Anna Becker', username: 'anna.becker', type: 'Schüler' },
    ] } };
  }
  if (u === '/nachrichten/send' && method === 'post') { return { status: 200, data: { success: true, message_id: 'new-msg-' + Date.now(), sent_at: fmt(new Date()) } }; }
  if (u === '/nachrichten/reply' && method === 'post') { return { status: 200, data: { success: true, details: { back: true, id: 'reply-' + Date.now() } } }; }
  if (u === '/nachrichten/mark-read' && method === 'post') { return { status: 200, data: { success: true } }; }

  // Message push notifications
  if (u === '/notifications/config' && method === 'get') {
    return { status: 200, data: { success: true, configured: false, public_key: '' } };
  }
  if (u === '/notifications/preferences' && method === 'get') {
    return { status: 200, data: { success: true, preferences: { ...mockNotificationPreferences } } };
  }
  if (u === '/notifications/preferences' && method === 'put') {
    const body = typeof config?.data === 'string' ? JSON.parse(config.data) : config?.data;
    mockNotificationPreferences = { ...mockNotificationPreferences, ...(body || {}) };
    return { status: 200, data: { success: true, preferences: { ...mockNotificationPreferences } } };
  }

  // Courses and account-specific class links
  if (u === '/settings/class-links' && method === 'get') {
    const links = mockCourses.map(course => ({
      course_id: course.book_id,
      name: course.name,
      teacher: course.teacher_full_name,
      url: Object.prototype.hasOwnProperty.call(mockClassLinkOverrides, course.book_id)
        ? mockClassLinkOverrides[course.book_id]
        : course.course_link,
      overridden: Object.prototype.hasOwnProperty.call(mockClassLinkOverrides, course.book_id),
    }));
    return { status: 200, data: { success: true, links } };
  }
  if (u === '/settings/class-links' && method === 'put') {
    const body = typeof config?.data === 'string' ? JSON.parse(config.data) : config?.data;
    mockClassLinkOverrides[body?.course_id] = body?.url || '';
    return { status: 200, data: { success: true, link: { course_id: body?.course_id, url: body?.url || '', overridden: true } } };
  }
  if (u === '/settings/class-links' && method === 'delete') {
    delete mockClassLinkOverrides[config?.params?.course_id];
    return { status: 200, data: { success: true } };
  }
  if (u === '/meinunterricht' && method === 'get') {
    const entries = mockCourses.map(course => ({
      ...course,
      ...(Object.prototype.hasOwnProperty.call(mockClassLinkOverrides, course.book_id)
        ? { course_link: mockClassLinkOverrides[course.book_id], course_link_custom: true }
        : {}),
    }));
    return { status: 200, data: { success: true, entries, entry_count: entries.length } };
  }
  if (u.startsWith('/meinunterricht/course/') && method === 'get') {
    const courseId = u.split('/')[3]?.split('?')[0];
    const detail = mockCourseDetails[courseId];
    if (detail) return { status: 200, data: { success: true, ...detail } };
    return { status: 200, data: { success: true, course_id: courseId, course_name: 'Unbekannt', semester: '', teacher_short: '', teacher_full: '', entries: [], entry_count: 0 } };
  }
  if (u.startsWith('/meinunterricht/entry') && method === 'get') {
    const urlStr = config?.params?.url || '';
    for (const [key, val] of Object.entries(mockEntryDetails)) {
      if (urlStr.includes(key)) return { status: 200, data: { success: true, entry: val } };
    }
    return { status: 200, data: { success: true, entry: { id: 'unknown', title: 'Eintrag', content: '<p>Keine Details verfügbar.</p>', date: fmt(new Date()), attachments: [] } } };
  }
  if (u === '/meinunterricht/weekly' && method === 'get') {
    return { status: 200, data: { success: true, week: { start_date: relDate(-3), entries: [
      { date: relDate(-3), course: 'Mathematik GK', entry: 'Kurvendiskussion', url: '' },
      { date: relDate(-2), course: 'Deutsch LK', entry: 'Faust I', url: '' },
      { date: relDate(-2), course: 'Englisch GK', entry: 'Hamlet Act III', url: '' },
      { date: relDate(-1), course: 'Physik LK', entry: 'Doppelspaltexperiment', url: '' },
      { date: relDate(0), course: 'Geschichte GK', entry: 'Weimarer Republik', url: '' },
      { date: relDate(0), course: 'Mathematik GK', entry: 'Klausur', url: '' },
    ] } } };
  }
  if (u === '/meinunterricht/submissions' && method === 'get') { return { status: 200, data: { success: true, submissions: mockSubmissions } }; }
  if (u === '/meinunterricht/homework-done' && method === 'post') { return { status: 200, data: { success: true } }; }

  // Calendar
  if (u === '/kalender' && method === 'get') {
    return { status: 200, data: {
      success: true,
      page_title: 'Kalender',
      calendar: { first_id: '0', new_events_count: '2', can_write: false, key: '', public_view: false, institution: 'Goethe-Gymnasium', is_admin: false },
      categories: mockCalendarCategories,
      groups: [{ id: 1, name: 'Q2' }],
      export_links: [],
    } };
  }
  if (u === '/kalender/events' && method === 'get') {
    return { status: 200, data: {
      success: true,
      events: mockCalendarEvents,
      count: mockCalendarEvents.length,
      categories: mockCalendarCategories,
      groups: [{ id: 1, name: 'Q2' }],
      filters: { year: 2025, start: 'year', category: '', search: '', target: '', view_id: '' },
      raw: {},
    } };
  }
  if (u.startsWith('/kalender/event/') && method === 'get') {
    const eventId = u.split('/')[3]?.split('?')[0];
    const event = mockCalendarEvents.find(e => e.id === eventId);
    if (event) {
      return { status: 200, data: { success: true, event: { ...event }, filters: { event_id: eventId || '', view_id: '' } } };
    }
    return { status: 200, data: { success: true, event: mockCalendarEvents[0], filters: { event_id: eventId || '', view_id: '' } } };
  }

  // Account-specific timetable adjustments
  if (u === '/settings/timetable/lessons' && method === 'get') {
    return { status: 200, data: { success: true, lessons: mockCustomLessons } };
  }
  if (u === '/settings/timetable/lessons' && method === 'put') {
    const body = typeof config?.data === 'string' ? JSON.parse(config.data) : config?.data;
    mockCustomLessons = mockCustomLessons.filter(lesson => !(lesson.date === body?.date && lesson.period === body?.period));
    mockCustomLessons.push({ ...body, is_custom: true });
    return { status: 200, data: { success: true, lesson: { ...body, is_custom: true } } };
  }
  if (u === '/settings/timetable/lessons' && method === 'delete') {
    mockCustomLessons = mockCustomLessons.filter(lesson => !(lesson.date === config?.params?.date && lesson.period === config?.params?.period));
    return { status: 200, data: { success: true } };
  }

  // Timetable
  if (u === '/stundenplan' && method === 'get') {
    const days = getMockTimetable();
    return { status: 200, data: { success: true, week_start: days[0].date, week_end: days[4].date, active_week: 'A', days, custom_lessons: mockCustomLessons } };
  }
  if (u === '/lerngruppen' && method === 'get') {
    return { status: 200, data: { success: true, groups: mockStudyGroups, group_count: mockStudyGroups.length, exams: mockStudyGroupExams, exam_count: mockStudyGroupExams.length } };
  }

  // DSB
  if (u === '/dsb/login' && method === 'post') { return { status: 200, data: { success: true, session_cookie: 'mock-session', session_id: 'mock-sid' } }; }
  if (u === '/dsb/plan-urls' && method === 'post') {
    return { status: 200, data: { success: true, plan_urls: ['/plan/heute', '/plan/morgen'], menu_items: ['Heute', 'Morgen'], count: 2 } };
  }
  if (u === '/dsb/plan' && method === 'post') {
    return { status: 200, data: { success: true, plan_url: '/plan/heute', title: 'Vertretungsplan', tables: mockDsbData.tables } };
  }

  // Fallback
  return { status: 200, data: { success: true } };
}
