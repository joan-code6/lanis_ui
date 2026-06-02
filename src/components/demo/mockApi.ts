const now = new Date();
const fmt = (d: Date) => d.toISOString();
const daysAgo = (n: number) => fmt(new Date(now.getTime() - n * 86400000));
const hoursAgo = (n: number) => fmt(new Date(now.getTime() - n * 3600000));

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

const mockModules = [
  { name: 'Mein Unterricht', url: 'https://schulportal.hessen.de/meinunterricht.php', color: '#4f46e5', logo: 'fa fa-files-o', folders: ['Schule'], target: '_self' },
  { name: 'Nachrichten', url: 'https://schulportal.hessen.de/nachrichten.php', color: '#0891b2', logo: 'fa fa-envelope-o', folders: ['Kommunikation'], target: '_self' },
  { name: 'Kalender', url: 'https://schulportal.hessen.de/kalender.php', color: '#dc2626', logo: 'fa fa-calendar-o', folders: ['Schule'], target: '_self' },
  { name: 'Vertretungsplan', url: 'https://schulportal.hessen.de/dsb.php', color: '#7c3aed', logo: 'fa fa-files-o', folders: ['Schule'], target: '_self' },
  { name: 'Klassenbuch', url: 'https://schulportal.hessen.de/klassenbuch.php', color: '#059669', logo: 'fa fa-files-o', folders: ['Schule'], target: '_blank' },
  { name: 'Stundenplan', url: 'https://schulportal.hessen.de/stundenplan.php', color: '#d97706', logo: 'fa fa-calendar-o', folders: ['Schule'], target: '_blank' },
  { name: 'Notenübersicht', url: 'https://schulportal.hessen.de/noten.php', color: '#be185d', logo: 'fa fa-files-o', folders: ['Leistung'], target: '_blank' },
  { name: 'Klausurplan', url: 'https://schulportal.hessen.de/klausuren.php', color: '#2563eb', logo: 'fa fa-files-o', folders: ['Leistung'], target: '_blank' },
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
  { id: 's1', title: 'Mathe-Klausur Q2', course: 'Mathematik GK', due_date: '2025-06-05T08:00:00', status: 'Anstehend', url: '' },
  { id: 's2', title: 'Faust Essay', course: 'Deutsch LK', due_date: '2025-06-12T23:59:00', status: 'Ausstehend', url: '' },
  { id: 's3', title: 'Hamlet Reading', course: 'Englisch GK', due_date: '2025-06-03T08:00:00', status: 'Abgegeben', url: '' },
  { id: 's4', title: 'Physik Berechnungen', course: 'Physik LK', due_date: '2025-06-08T08:00:00', status: 'Anstehend', url: '' },
  { id: 's5', title: 'Informatik BST', course: 'Informatik LK', due_date: '2025-06-15T23:59:00', status: 'Ausstehend', url: '' },
];

const mockCourseDetails: Record<string, any> = {
  'b1': {
    course_id: 'b1', course_name: 'Mathematik GK', semester: 'Q2/2. Halbjahr', teacher_short: 'Wb', teacher_full: 'Dr. Heinrich Weber',
    entries: [
      { entry_id: 'b1e1', date: daysAgo(0), hours: '1–2', thema: 'Analysis: Kurvendiskussion und Extremwertprobleme', homework: 'Aufgaben 1–5 auf Seite 142', homework_done: false, attendance: 'anwesend', files: [], content: 'Heute haben wir die Kurvendiskussion fortgesetzt. Schwerpunkte: Bestimmung von Extremwerten, Wendepunkten und das Verhalten im Unendlichen.' },
      { entry_id: 'b1e2', date: daysAgo(2), hours: '3–4', thema: 'Analysis: Ableitungen höherer Ordnung', homework: 'Arbeitsblatt 3 ausfüllen', homework_done: true, attendance: 'anwesend', files: [{ name: 'Arbeitsblatt_3.pdf', url: '/files/ab3.pdf' }], content: 'Einführung in Ableitungen höherer Ordnung und deren Anwendung bei der Kurvendiskussion.' },
      { entry_id: 'b1e3', date: daysAgo(4), hours: '1–2', thema: 'Analysis: Nullstellenberechnung', homework: '', homework_done: true, attendance: 'anwesend', files: [], content: 'Wiederholung der Nullstellenberechnung mit verschiedenen Verfahren.' },
      { entry_id: 'b1e4', date: daysAgo(7), hours: '5–6', thema: 'Analysis: Einführung Kurvendiskussion', homework: 'Seite 140 lesen', homework_done: true, attendance: 'anwesend', files: [], content: 'Erste Einführung in das Thema Kurvendiskussion.' },
    ],
    entry_count: 4,
    exams: ['Klausur am 05.06.2026: Analysis'],
    attendance_summary: { anwesend: '18', entschuldigt: '1', unentschuldigt: '0' },
  },
  'b2': {
    course_id: 'b2', course_name: 'Deutsch LK', semester: 'Q2/2. Halbjahr', teacher_short: 'Re', teacher_full: 'Prof. Anna Reinhardt',
    entries: [
      { entry_id: 'b2e1', date: daysAgo(1), hours: '1–3', thema: 'Faust I: Analyse des Osterspaziergangs', homework: 'Essay: Die Rolle des Erdgeists in Faust I', homework_done: true, attendance: 'anwesend', files: [], content: 'Ausführliche Analyse des Osterspaziergangs als Schlüsselszene.' },
      { entry_id: 'b2e2', date: daysAgo(3), hours: '4–5', thema: 'Faust I: Der Pakt mit Mephisto', homework: 'Szenenanalyse der Paktszene', homework_done: true, attendance: 'anwesend', files: [], content: 'Analyse der Paktszene zwischen Faust und Mephistopheles.' },
      { entry_id: 'b2e3', date: daysAgo(6), hours: '1–2', thema: 'Faust I: Einführung und Prolog', homework: 'Prolog im Himmel lesen', homework_done: true, attendance: 'anwesend', files: [{ name: 'Faust_Leseliste.pdf', url: '/files/faust.pdf' }], content: 'Einführung in die Lektüre. Besprechung des Prologs im Himmel.' },
    ],
    entry_count: 3,
    exams: ['Klausur am 18.06.2026: Faust I'],
    attendance_summary: { anwesend: '15', entschuldigt: '0', unentschuldigt: '0' },
  },
  'b3': {
    course_id: 'b3', course_name: 'Englisch GK', semester: 'Q2/2. Halbjahr', teacher_short: "O'C", teacher_full: "James O'Connor",
    entries: [
      { entry_id: 'b3e1', date: daysAgo(2), hours: '3–4', thema: 'Shakespeare: Hamlet Act III — To be or not to be', homework: 'Read Act IV, Scene 1–3', homework_done: false, attendance: 'anwesend', files: [], content: 'Analyse des berühmten Monologs. Diskussion über Hamlets inneren Konflikt.' },
      { entry_id: 'b3e2', date: daysAgo(5), hours: '3–4', thema: 'Shakespeare: Hamlet Act II', homework: 'Summary of Act II', homework_done: true, attendance: 'entschuldigt', files: [], content: '' },
    ],
    entry_count: 2,
    exams: [],
    attendance_summary: { anwesend: '20', entschuldigt: '2', unentschuldigt: '0' },
  },
  'b4': {
    course_id: 'b4', course_name: 'Physik LK', semester: 'Q2/2. Halbjahr', teacher_short: 'Kl', teacher_full: 'Dr. Sabine Keller',
    entries: [
      { entry_id: 'b4e1', date: daysAgo(3), hours: '1–2', thema: 'Quantenmechanik: Doppelspaltexperiment', homework: 'Berechnungen zum Doppelspaltexperiment', homework_done: false, attendance: 'anwesend', files: [], content: 'Durchführung und Analyse des Doppelspaltexperiments. Wellen-Teilchen-Dualismus.' },
      { entry_id: 'b4e2', date: daysAgo(6), hours: '5–6', thema: 'Quantenmechanik: Photoeffekt', homework: '', homework_done: true, attendance: 'anwesend', files: [{ name: 'Photoeffekt_Experiment.pdf', url: '/files/photo.pdf' }], content: 'Experimentelle Untersuchung des Photoeffekts.' },
    ],
    entry_count: 2,
    exams: ['Klausur am 25.06.2026: Quantenmechanik'],
    attendance_summary: { anwesend: '12', entschuldigt: '0', unentschuldigt: '1' },
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
};

const mockCalendarCategories = [
  { id: 1, name: 'Klausuren', color: '#dc2626', logo: 'fa-regular fa-file-lines' },
  { id: 2, name: 'Veranstaltungen', color: '#2563eb', logo: 'fa-regular fa-calendar' },
  { id: 3, name: 'Ferien', color: '#059669', logo: 'fa-regular fa-sun' },
  { id: 4, name: 'Abgaben', color: '#d97706', logo: 'fa-regular fa-clock' },
  { id: 5, name: 'Konferenzen', color: '#7c3aed', logo: 'fa-regular fa-users' },
];

const mockCalendarEvents = [
  { id: 'ev1', title: 'Mathe-Klausur Q2', category: '1', category_name: 'Klausuren', category_color: '#dc2626', description: 'Klausur Analysis', start: '2025-06-05T08:00:00', end: '2025-06-05T09:30:00', all_day: false, new: '0', editable: false, properties: {}, raw: {} },
  { id: 'ev2', title: 'Schulausflug Oberstufe', category: '2', category_name: 'Veranstaltungen', category_color: '#2563eb', description: 'Goethe-Haus + Senckenbergmuseum', start: '2025-06-20T08:00:00', end: '2025-06-20T16:00:00', all_day: true, new: '0', editable: false, properties: {}, raw: {} },
  { id: 'ev3', title: 'Faust Essay Abgabe', category: '4', category_name: 'Abgaben', category_color: '#d97706', description: 'Essay Faust I', start: '2025-06-12T23:59:00', end: '2025-06-12T23:59:00', all_day: true, new: '0', editable: false, properties: {}, raw: {} },
  { id: 'ev4', title: 'Sommerferien', category: '3', category_name: 'Ferien', category_color: '#059669', description: 'Sommerferien Hessen 2025', start: '2025-07-19T00:00:00', end: '2025-08-31T23:59:00', all_day: true, new: '0', editable: false, properties: {}, raw: {} },
  { id: 'ev5', title: 'Fachkonferenz Mathe', category: '5', category_name: 'Konferenzen', category_color: '#7c3aed', description: 'Fachkonferenz Mathematik', start: '2025-06-10T14:00:00', end: '2025-06-10T16:00:00', all_day: false, new: '1', editable: false, properties: {}, raw: {} },
  { id: 'ev6', title: 'Zeugnisausgabe', category: '2', category_name: 'Veranstaltungen', category_color: '#2563eb', description: 'Zeugnisausgabe in der Aula', start: '2025-07-18T10:00:00', end: '2025-07-18T11:00:00', all_day: false, new: '0', editable: false, properties: {}, raw: {} },
  { id: 'ev7', title: 'Physik LK Klausur', category: '1', category_name: 'Klausuren', category_color: '#dc2626', description: 'Quantenmechanik', start: '2025-06-25T08:00:00', end: '2025-06-25T09:30:00', all_day: false, new: '1', editable: false, properties: {}, raw: {} },
  { id: 'ev8', title: 'Elternsprechtag', category: '2', category_name: 'Veranstaltungen', category_color: '#2563eb', description: 'Elternsprechtag Q2', start: '2025-06-15T16:00:00', end: '2025-06-15T19:00:00', all_day: false, new: '0', editable: false, properties: {}, raw: {} },
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
  }],
};

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

  // Courses
  if (u === '/meinunterricht' && method === 'get') { return { status: 200, data: { success: true, entries: mockCourses, entry_count: mockCourses.length } }; }
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
    return { status: 200, data: { success: true, week: { start_date: '2025-06-02', entries: [
      { date: '2025-06-02', course: 'Mathematik GK', entry: 'Kurvendiskussion', url: '' },
      { date: '2025-06-03', course: 'Deutsch LK', entry: 'Faust I', url: '' },
      { date: '2025-06-03', course: 'Englisch GK', entry: 'Hamlet Act III', url: '' },
      { date: '2025-06-04', course: 'Physik LK', entry: 'Doppelspaltexperiment', url: '' },
      { date: '2025-06-05', course: 'Geschichte GK', entry: 'Weimarer Republik', url: '' },
      { date: '2025-06-05', course: 'Mathematik GK', entry: 'Klausur', url: '' },
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
    return { status: 200, data: { success: true, event: event ? { ...event } : {}, filters: { event_id: eventId || '', view_id: '' } } };
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
