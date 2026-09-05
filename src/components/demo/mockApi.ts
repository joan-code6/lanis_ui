import { demoModules, demoUser } from './demoData';

const now = new Date();
const fmt = (d: Date) => d.toISOString();
const daysAgo = (n: number) => fmt(new Date(now.getTime() - n * 86400000));
const hoursAgo = (n: number) => fmt(new Date(now.getTime() - n * 3600000));
const daysFromNow = (n: number) => fmt(new Date(now.getTime() + n * 86400000));
const hoursFromNow = (n: number) => fmt(new Date(now.getTime() + n * 3600000));
const localDate = (daysOffset: number) => {
  const date = new Date(now);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + daysOffset);
  return date;
};
const formatLocalDate = (date: Date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-');
const relDate = (daysOffset: number) => formatLocalDate(localDate(daysOffset));
const relDateTime = (daysOffset: number, time: string) => relDate(daysOffset) + 'T' + time;
const schoolWeekStart = new Date(now);
schoolWeekStart.setHours(12, 0, 0, 0);
schoolWeekStart.setDate(schoolWeekStart.getDate() - ((schoolWeekStart.getDay() + 6) % 7));
const weekDate = (dayOffset: number) => {
  const date = new Date(schoolWeekStart);
  date.setDate(date.getDate() + dayOffset);
  return formatLocalDate(date);
};

const readMockStorage = (key: string): unknown => {
  if (typeof window === 'undefined') return undefined;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : undefined;
  } catch {
    return undefined;
  }
};

const writeMockStorage = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Demo mode still works when storage is blocked or unavailable.
  }
};

const defaultMockNotificationPreferences = {
  enabled: false,
  messages_enabled: true,
  vertretungsplan_enabled: false,
  vertretungsplan_class_mode: 'own',
  vertretungsplan_classes: [],
  start_time: '07:00',
  end_time: '21:00',
  poll_interval_minutes: 15,
  timezone: 'Europe/Berlin',
  show_preview: true,
};

let mockNotificationPreferences = { ...defaultMockNotificationPreferences };
const storedMockLessons = readMockStorage('lanis_demo_custom_lessons');
const storedMockClassLinks = readMockStorage('lanis_demo_class_link_overrides');
let mockCustomLessons: any[] = Array.isArray(storedMockLessons) ? storedMockLessons : [];
const mockClassLinkOverrides: Record<string, string> = storedMockClassLinks
  && typeof storedMockClassLinks === 'object'
  && !Array.isArray(storedMockClassLinks)
  ? storedMockClassLinks as Record<string, string>
  : {};

const persistMockOverrides = () => {
  writeMockStorage('lanis_demo_custom_lessons', mockCustomLessons);
  writeMockStorage('lanis_demo_class_link_overrides', mockClassLinkOverrides);
};

const mockDateispeicherNodes = {
  0: {
    success: true,
    folder_id: 0,
    folders: [
      { id: 1, name: 'Unterrichtsmaterialien', subfolders: 0, description: 'Arbeitsblätter und Zusammenfassungen' },
      { id: 2, name: 'Projekte', subfolders: 0, description: 'Gemeinsame Projektdateien' },
      { id: 3, name: 'Abgaben', subfolders: 0, description: 'Einreichungen für Unterricht und Projekte' },
      { id: 4, name: 'Schulorganisation', subfolders: 0, description: 'Wichtige Informationen rund um die Schule' },
    ],
    files: [
      { id: 101, name: 'Schuljahreskalender.pdf', changed: '28.08.2026', size: '248 KB', note: null, download_url: 'https://start.schulportal.hessen.de/dateispeicher.php?a=download&f=101' },
      { id: 105, name: 'Raumplan_9C.pdf', changed: '01.09.2026', size: '174 KB', note: 'Stand: September 2026', download_url: 'https://start.schulportal.hessen.de/dateispeicher.php?a=download&f=105' },
      { id: 106, name: 'Regeln_fuer_Projektarbeit.pdf', changed: '25.08.2026', size: '312 KB', note: null, download_url: 'https://start.schulportal.hessen.de/dateispeicher.php?a=download&f=106' },
    ],
    file_count: 3,
    folder_count: 4,
  },
  1: {
    success: true,
    folder_id: 1,
    folders: [],
    files: [
      { id: 102, name: 'Mathematik_Formelsammlung.pdf', changed: '26.08.2026', size: '1,2 MB', note: 'Für die Oberstufe', download_url: 'https://start.schulportal.hessen.de/dateispeicher.php?a=download&f=102' },
      { id: 103, name: 'Deutsch_Lektürehilfe.pdf', changed: '20.08.2026', size: '860 KB', note: null, download_url: 'https://start.schulportal.hessen.de/dateispeicher.php?a=download&f=103' },
      { id: 107, name: 'Biologie_See-Experiment.pdf', changed: '19.08.2026', size: '1,1 MB', note: 'Versuchsaufbau und Messwerte', download_url: 'https://start.schulportal.hessen.de/dateispeicher.php?a=download&f=107' },
      { id: 108, name: 'Englisch_Speech-Planner.pdf', changed: '15.08.2026', size: '426 KB', note: null, download_url: 'https://start.schulportal.hessen.de/dateispeicher.php?a=download&f=108' },
    ],
    file_count: 4,
    folder_count: 0,
  },
  2: {
    success: true,
    folder_id: 2,
    folders: [],
    files: [
      { id: 104, name: 'Projektplanung_Nachhaltigkeit.docx', changed: '18.08.2026', size: '92 KB', note: null, download_url: 'https://start.schulportal.hessen.de/dateispeicher.php?a=download&f=104' },
      { id: 109, name: 'Präsentation_Entwurf.pptx', changed: '17.08.2026', size: '2,4 MB', note: 'Gemeinsamer Entwurf der Gruppe', download_url: 'https://start.schulportal.hessen.de/dateispeicher.php?a=download&f=109' },
      { id: 110, name: 'Quellen_und_Notizen.odt', changed: '14.08.2026', size: '68 KB', note: null, download_url: 'https://start.schulportal.hessen.de/dateispeicher.php?a=download&f=110' },
    ],
    file_count: 3,
    folder_count: 0,
  },
  3: {
    success: true,
    folder_id: 3,
    folders: [],
    files: [
      { id: 111, name: 'Deutsch_Gedichtvergleich.docx', changed: '02.09.2026', size: '84 KB', note: 'Noch nicht abgegeben', download_url: 'https://start.schulportal.hessen.de/dateispeicher.php?a=download&f=111' },
      { id: 112, name: 'Informatik_Checkliste.html', changed: '29.08.2026', size: '12 KB', note: 'Projektdatei', download_url: 'https://start.schulportal.hessen.de/dateispeicher.php?a=download&f=112' },
    ],
    file_count: 2,
    folder_count: 0,
  },
  4: {
    success: true,
    folder_id: 4,
    folders: [],
    files: [
      { id: 113, name: 'Schulordnung_2026.pdf', changed: '22.08.2026', size: '518 KB', note: null, download_url: 'https://start.schulportal.hessen.de/dateispeicher.php?a=download&f=113' },
      { id: 114, name: 'Ansprechpartner_und_Sprechzeiten.pdf', changed: '21.08.2026', size: '205 KB', note: null, download_url: 'https://start.schulportal.hessen.de/dateispeicher.php?a=download&f=114' },
    ],
    file_count: 2,
    folder_count: 0,
  },
};

const mockMessageHeaders = [
  { Id: 'dm-1', Uniquid: 'uq-1', Sender: 'Frau Neumann', Betreff: 'Deutsch: Gedichtvergleich für Montag', Papierkorb: '0', private: 0, WeitereEmpfaenger: '', empf: [demoUser.username], unread: true, date: hoursAgo(8) },
  { Id: 'dm-2', Uniquid: 'uq-2', Sender: 'Herr Vogel', Betreff: 'Mathematik: Abgabe zum Funktionsgraphen', Papierkorb: '0', private: 0, WeitereEmpfaenger: '', empf: [demoUser.username], unread: true, date: daysAgo(1) },
  { Id: 'dm-3', Uniquid: 'uq-3', Sender: 'Frau Özdemir', Betreff: 'Biologie: Protokoll zum See-Experiment', Papierkorb: '0', private: 0, WeitereEmpfaenger: '', empf: [demoUser.username], unread: false, read: true, date: daysAgo(2) },
  { Id: 'dm-4', Uniquid: 'uq-4', Sender: 'Herr Brandt', Betreff: 'Klassenfahrt: Einverständniserklärung', Papierkorb: '0', private: 0, WeitereEmpfaenger: '', empf: [demoUser.username], unread: true, date: daysAgo(3) },
  { Id: 'dm-5', Uniquid: 'uq-5', Sender: 'Sekretariat', Betreff: 'Sprechzeiten im Herbst', Papierkorb: '0', private: 0, WeitereEmpfaenger: '', empf: [demoUser.username], unread: false, read: true, date: daysAgo(6) },
  { Id: 'dm-6', Uniquid: 'uq-6', Sender: 'Frau Winter', Betreff: 'Sportfest: Laufzettel und Zeiten', Papierkorb: '0', private: 0, WeitereEmpfaenger: '', empf: [demoUser.username], unread: false, read: true, date: daysAgo(8) },
  { Id: 'dm-7', Uniquid: 'uq-7', Sender: 'Schulbibliothek', Betreff: 'Neue Bücher im Leseraum', Papierkorb: '0', private: 0, WeitereEmpfaenger: '', empf: [demoUser.username], unread: true, date: daysAgo(10) },
  { Id: 'dm-8', Uniquid: 'uq-8', Sender: 'SV-Team', Betreff: 'Ideen für die Projektwoche', Papierkorb: '0', private: 0, WeitereEmpfaenger: '', empf: [demoUser.username], unread: false, read: true, date: daysAgo(12) },
];

const mockConversations: Record<string, { messages: any[] }> = {
  'uq-1': { messages: [
    { id: 'c1-1', sender: 'Frau Neumann', content: 'Hallo zusammen,\n\nbitte bringt für Montag euren Vergleich der beiden Gedichte mit. Markiert jeweils ein sprachliches Bild und erklärt kurz seine Wirkung.\n\nViele Grüße\nFrau Neumann', date: hoursAgo(8) },
    { id: 'c1-2', sender: 'Mia Keller', content: 'Guten Morgen Frau Neumann,\n\nich ergänze noch die Stelle mit dem Perspektivwechsel. Dann bringe ich die Tabelle am Montag mit.\n\nViele Grüße\nMia', date: hoursAgo(5) },
  ]},
  'uq-2': { messages: [
    { id: 'c2-1', sender: 'Herr Vogel', content: 'Liebe 9C,\n\nzeichnet den Graphen der linearen Funktion aus dem Arbeitsblatt sauber in euer Heft und notiert den Rechenweg für den Schnittpunkt mit der y-Achse.\n\nViele Grüße\nHerr Vogel', date: daysAgo(1) },
  ]},
  'uq-3': { messages: [
    { id: 'c3-1', sender: 'Frau Özdemir', content: 'Für die nächste Stunde: Ergänzt euer Protokoll zum See-Experiment um eine begründete Vermutung. Denkt an Beobachtung, Erklärung und ein kurzes Fazit.\n\nViele Grüße\nFrau Özdemir', date: daysAgo(2) },
  ]},
  'uq-4': { messages: [
    { id: 'c4-1', sender: 'Herr Brandt', content: 'Liebe 9C,\n\nfür die Klassenfahrt brauchen wir die unterschriebene Einverständniserklärung bis Ende der Woche. Gebt sie direkt bei eurer Klassenleitung ab.\n\nViele Grüße\nHerr Brandt', date: daysAgo(3) },
  ]},
  'uq-5': { messages: [
    { id: 'c5-1', sender: 'Sekretariat', content: 'Liebe Schülerinnen und Schüler,\n\ndie Sprechzeiten der Schulleitung und des Sekretariats für das neue Halbjahr hängen ab sofort im Eingangsbereich aus.\n\nViele Grüße\nDas Sekretariat', date: daysAgo(6) },
  ]},
  'uq-6': { messages: [
    { id: 'c6-1', sender: 'Frau Winter', content: 'Hallo 9C,\n\nfür das Sportfest findet ihr den Laufzettel ab heute im Dateispeicher. Die Startzeiten eurer Gruppe besprecht ihr bitte am Freitag in der ersten Stunde.\n\nViele Grüße\nFrau Winter', date: daysAgo(8) },
  ]},
  'uq-7': { messages: [
    { id: 'c7-1', sender: 'Schulbibliothek', content: 'Hallo Mia,\n\nim Leseraum sind neue Jugendromane und Sachbücher eingetroffen. Die Ausleihe ist montags und donnerstags in der großen Pause möglich.\n\nViele Grüße\nDas Bibliotheksteam', date: daysAgo(10) },
  ]},
  'uq-8': { messages: [
    { id: 'c8-1', sender: 'SV-Team', content: 'Hallo zusammen,\n\nfür die Projektwoche sammeln wir noch Ideen. Wenn ihr einen Workshop oder eine Aktion anbieten möchtet, tragt euren Vorschlag bitte bis Freitag in die Liste ein.\n\nViele Grüße\nEuer SV-Team', date: daysAgo(12) },
  ]},
};

const mockCourses = [
  { entry_id: 'e1', book_id: 'b1', name: 'Deutsch 9c', course_link: 'https://schulportal.hessen.de/courses/b1', teacher_full_name: 'Neumann, Clara (CN)', teacher_short: 'CN', teacher_message_link: '', thema: 'Gedichtvergleich: Stadt und Natur', datum: daysAgo(1), homework: 'Vergleichstabelle zu den beiden Gedichten vervollständigen', homework_done: false },
  { entry_id: 'e2', book_id: 'b2', name: 'Mathematik 9c', course_link: 'https://schulportal.hessen.de/courses/b2', teacher_full_name: 'Vogel, Martin (MV)', teacher_short: 'MV', teacher_message_link: '', thema: 'Lineare Funktionen und Steigung', datum: daysAgo(2), homework: 'Arbeitsblatt „Funktionsgraphen“: Nr. 4–7', homework_done: false },
  { entry_id: 'e3', book_id: 'b3', name: 'Englisch 9c', course_link: 'https://schulportal.hessen.de/courses/b3', teacher_full_name: 'Özdemir, Aylin (AO)', teacher_short: 'AO', teacher_message_link: '', thema: 'Writing a persuasive speech', datum: daysAgo(3), homework: 'Write an opening paragraph for your speech', homework_done: true },
  { entry_id: 'e4', book_id: 'b4', name: 'Biologie 9c', course_link: 'https://schulportal.hessen.de/courses/b4', teacher_full_name: 'Brandt, Felix (FB)', teacher_short: 'FB', teacher_message_link: '', thema: 'Ökosystem See', datum: daysAgo(1), homework: 'Versuchsprotokoll um die Auswertung ergänzen', homework_done: false },
  { entry_id: 'e5', book_id: 'b5', name: 'Geschichte 9c', course_link: 'https://schulportal.hessen.de/courses/b5', teacher_full_name: 'Seidel, Marie (MS)', teacher_short: 'MS', teacher_message_link: '', thema: 'Industrialisierung und soziale Frage', datum: daysAgo(4), homework: 'Quelle zur Fabrikarbeit mit drei Stichpunkten auswerten', homework_done: true },
  { entry_id: 'e6', book_id: 'b6', name: 'Informatik 9c', course_link: 'https://schulportal.hessen.de/courses/b6', teacher_full_name: 'Roth, Leonie (LR)', teacher_short: 'LR', teacher_message_link: '', thema: 'Barrierefreie Website', datum: daysAgo(2), homework: 'Alt-Texte für die Bilder im HTML-Dokument ergänzen', homework_done: false },
];

const mockSubmissions = [
  { id: 's1', title: 'Mathematik: Funktionsgraphen', course: 'Mathematik 9c', due_date: relDateTime(1, '23:59:00'), status: 'Ausstehend', url: '' },
  { id: 's2', title: 'Deutsch: Gedichtvergleich', course: 'Deutsch 9c', due_date: relDateTime(3, '09:40:00'), status: 'Anstehend', url: '' },
  { id: 's3', title: 'Biologie: See-Experiment', course: 'Biologie 9c', due_date: relDateTime(-1, '23:59:00'), status: 'Abgegeben', url: '' },
  { id: 's4', title: 'Englisch: Persuasive speech', course: 'Englisch 9c', due_date: relDateTime(4, '23:59:00'), status: 'Ausstehend', url: '' },
  { id: 's5', title: 'Geschichte: Fabrikarbeit im 19. Jahrhundert', course: 'Geschichte 9c', due_date: relDateTime(8, '23:59:00'), status: 'Ausstehend', url: '' },
  { id: 's6', title: 'Informatik: Barrierefreie Website', course: 'Informatik 9c', due_date: relDateTime(12, '09:40:00'), status: 'Anstehend', url: '' },
];

const mockAttendanceOverview = {
  success: true,
  source: 'schulportal',
  available: true,
  totals: { anwesend: 111, entschuldigt: 3, unentschuldigt: 0 },
  courses: [
    { course_id: 'b1', course_name: 'Deutsch 9c', teacher_short: 'CN', teacher_full: 'Clara Neumann', attendance_summary: { anwesend: 18, entschuldigt: 1, unentschuldigt: 0 } },
    { course_id: 'b2', course_name: 'Mathematik 9c', teacher_short: 'MV', teacher_full: 'Martin Vogel', attendance_summary: { anwesend: 19, entschuldigt: 0, unentschuldigt: 0 } },
    { course_id: 'b3', course_name: 'Englisch 9c', teacher_short: 'AO', teacher_full: 'Aylin Özdemir', attendance_summary: { anwesend: 20, entschuldigt: 0, unentschuldigt: 0 } },
    { course_id: 'b4', course_name: 'Biologie 9c', teacher_short: 'FB', teacher_full: 'Felix Brandt', attendance_summary: { anwesend: 21, entschuldigt: 1, unentschuldigt: 0 } },
    { course_id: 'b5', course_name: 'Geschichte 9c', teacher_short: 'MS', teacher_full: 'Marie Seidel', attendance_summary: { anwesend: 17, entschuldigt: 0, unentschuldigt: 0 } },
    { course_id: 'b6', course_name: 'Informatik 9c', teacher_short: 'LR', teacher_full: 'Leonie Roth', attendance_summary: { anwesend: 16, entschuldigt: 1, unentschuldigt: 0 } },
  ],
  course_count: 6,
  attendance_course_count: 6,
  failed_course_count: 0,
};

// The overview and detail views intentionally tell the same story. The old
// portal data is noisy and often stale, so the demo keeps a small, current
// slice of a fictional 9C school week that can be understood at a glance.
const mockCourseDetails: Record<string, any> = {
  b1: {
    course_id: 'b1', course_name: 'Deutsch 9c', semester: '1. Halbjahr 2026/2027', teacher_short: 'CN', teacher_full: 'Clara Neumann',
    entries: [
      { entry_id: 'b1e1', date: daysAgo(1), hours: '3–4', thema: 'Gedichtvergleich: Stadt und Natur', homework: 'Vergleichstabelle zu den beiden Gedichten vervollständigen', homework_done: false, attendance: 'anwesend', files: [{ name: 'Gedichtvergleich-Leitfaden.pdf', url: '/files/gedichtvergleich-leitfaden.pdf' }], content: 'Wir vergleichen Bildsprache, Rhythmus und die Perspektive der beiden Gedichte. Zum Schluss begründen wir, wie die Sprache die jeweilige Stimmung erzeugt.' },
      { entry_id: 'b1e2', date: daysAgo(5), hours: '1–2', thema: 'Sprachliche Bilder und Wirkung', homework: 'Drei Metaphern aus dem Text erklären', homework_done: true, attendance: 'anwesend', files: [], content: 'Wir unterscheiden Metapher, Vergleich und Personifikation und untersuchen ihre Wirkung im Gedicht.' },
      { entry_id: 'b1e3', date: daysAgo(9), hours: '3–4', thema: 'Eine Textdeutung strukturieren', homework: '', homework_done: true, attendance: 'anwesend', files: [], content: 'Wir haben eine Deutungshypothese formuliert und die passenden Belege im Text geordnet.' },
    ],
    entry_count: 3,
    marks: [
      { name: 'Gedichtvergleich', date: '02.09.2026', mark: '2+', comment: 'Klarer Vergleich und gut gewählte Textbelege.' },
      { name: 'Textdeutung', date: '21.08.2026', mark: '1−' },
    ],
    exams: [`${relDate(10)} Arbeit, 3., 4. Std.`],
    attendance_summary: { anwesend: '18', entschuldigt: '1', unentschuldigt: '0' },
  },
  b2: {
    course_id: 'b2', course_name: 'Mathematik 9c', semester: '1. Halbjahr 2026/2027', teacher_short: 'MV', teacher_full: 'Martin Vogel',
    entries: [
      { entry_id: 'b2e1', date: daysAgo(2), hours: '1–2', thema: 'Lineare Funktionen und Steigung', homework: 'Arbeitsblatt „Funktionsgraphen“: Nr. 4–7', homework_done: false, attendance: 'anwesend', files: [{ name: 'Funktionsgraphen-Arbeitsblatt.pdf', url: '/files/funktionsgraphen-arbeitsblatt.pdf' }], content: 'Wir lesen Steigung und y-Achsenabschnitt aus verschiedenen Darstellungen ab und zeichnen den passenden Graphen.' },
      { entry_id: 'b2e2', date: daysAgo(6), hours: '3–4', thema: 'Tabellen, Graphen und Terme', homework: 'Drei Darstellungen derselben Funktion zuordnen', homework_done: true, attendance: 'anwesend', files: [], content: 'Wir übertragen Werte aus einer Tabelle in ein Koordinatensystem und prüfen unsere Ergebnisse mit dem Funktionsterm.' },
      { entry_id: 'b2e3', date: daysAgo(10), hours: '1–2', thema: 'Koordinatensysteme sicher nutzen', homework: '', homework_done: true, attendance: 'anwesend', files: [], content: 'Wiederholung von Punkten, Achsenbeschriftung und sinnvollen Maßstäben.' },
    ],
    entry_count: 3,
    exams: [`${relDate(12)} Arbeit, 1., 2. Std. (60 Min.)`],
    attendance_summary: { anwesend: '19', entschuldigt: '0', unentschuldigt: '0' },
  },
  b3: {
    course_id: 'b3', course_name: 'Englisch 9c', semester: '1. Halbjahr 2026/2027', teacher_short: 'AO', teacher_full: 'Aylin Özdemir',
    entries: [
      { entry_id: 'b3e1', date: daysAgo(3), hours: '3–4', thema: 'Writing a persuasive speech', homework: 'Write an opening paragraph for your speech', homework_done: true, attendance: 'anwesend', files: [{ name: 'Speech-planner.pdf', url: '/files/speech-planner.pdf' }], content: 'We organise a short persuasive speech with a clear claim, a supporting example and a closing appeal to the audience.' },
      { entry_id: 'b3e2', date: daysAgo(7), hours: '1–2', thema: 'Linking ideas clearly', homework: 'Use five linking words in your draft', homework_done: true, attendance: 'anwesend', files: [], content: 'We practise linking words for contrast, cause and consequence so that an argument is easy to follow.' },
      { entry_id: 'b3e3', date: daysAgo(11), hours: '3–4', thema: 'Audience and purpose', homework: '', homework_done: true, attendance: 'anwesend', files: [], content: 'We compare how the target audience changes vocabulary, examples and tone.' },
    ],
    entry_count: 3,
    exams: [`${relDate(24)} Arbeit, 3., 4. Std. (90 Min.)`],
    attendance_summary: { anwesend: '20', entschuldigt: '0', unentschuldigt: '0' },
  },
  b4: {
    course_id: 'b4', course_name: 'Biologie 9c', semester: '1. Halbjahr 2026/2027', teacher_short: 'FB', teacher_full: 'Felix Brandt',
    entries: [
      { entry_id: 'b4e1', date: daysAgo(1), hours: '3–4', thema: 'Ökosystem See', homework: 'Versuchsprotokoll um die Auswertung ergänzen', homework_done: false, attendance: 'anwesend', files: [{ name: 'See-Experiment-Protokoll.pdf', url: '/files/see-experiment-protokoll.pdf' }], content: 'Wir untersuchen die Bedingungen für Algenwachstum und unterscheiden Beobachtung, Vermutung und Auswertung im Versuchsprotokoll.' },
      { entry_id: 'b4e2', date: daysAgo(5), hours: '1–2', thema: 'Nahrungsnetze und Energiefluss', homework: 'Nahrungsnetz mit Pfeilen ergänzen', homework_done: true, attendance: 'anwesend', files: [], content: 'Wir ordnen Produzenten, Konsumenten und Destruenten in einem Nahrungsnetz und verfolgen den Energiefluss.' },
      { entry_id: 'b4e3', date: daysAgo(9), hours: '3–4', thema: 'Anpassung an den Lebensraum', homework: '', homework_done: true, attendance: 'anwesend', files: [], content: 'Wir erklären, wie Körperbau und Verhalten verschiedener Arten zu ihrem Lebensraum passen.' },
    ],
    entry_count: 3,
    exams: [`${relDate(34)} Lernkontrolle, 3., 4. Std. (45 Min.)`],
    attendance_summary: { anwesend: '21', entschuldigt: '1', unentschuldigt: '0' },
  },
  b5: {
    course_id: 'b5', course_name: 'Geschichte 9c', semester: '1. Halbjahr 2026/2027', teacher_short: 'MS', teacher_full: 'Marie Seidel',
    entries: [
      { entry_id: 'b5e1', date: daysAgo(4), hours: '1–2', thema: 'Industrialisierung und soziale Frage', homework: 'Quelle zur Fabrikarbeit mit drei Stichpunkten auswerten', homework_done: true, attendance: 'anwesend', files: [{ name: 'Quellenblatt-Fabrikarbeit.pdf', url: '/files/quellenblatt-fabrikarbeit.pdf' }], content: 'Wir untersuchen, wie Fabrikarbeit den Alltag veränderte, und vergleichen zeitgenössische Perspektiven auf die Arbeitsbedingungen.' },
      { entry_id: 'b5e2', date: daysAgo(8), hours: '3–4', thema: 'Leben in der wachsenden Stadt', homework: 'Zwei Veränderungen für Familien notieren', homework_done: true, attendance: 'anwesend', files: [], content: 'Wir lesen eine historische Statistik und leiten daraus Veränderungen für Wohnen, Arbeit und Mobilität ab.' },
    ],
    entry_count: 2,
    exams: [`${relDate(42)} Arbeit, 1., 2. Std. (60 Min.)`],
    attendance_summary: { anwesend: '17', entschuldigt: '0', unentschuldigt: '0' },
  },
  b6: {
    course_id: 'b6', course_name: 'Informatik 9c', semester: '1. Halbjahr 2026/2027', teacher_short: 'LR', teacher_full: 'Leonie Roth',
    entries: [
      { entry_id: 'b6e1', date: daysAgo(2), hours: '3–4', thema: 'Barrierefreie Website', homework: 'Alt-Texte für die Bilder im HTML-Dokument ergänzen', homework_done: false, attendance: 'anwesend', files: [{ name: 'HTML-Checkliste.pdf', url: '/files/html-checkliste.pdf' }], content: 'Wir prüfen eine kleine Website mit einer Checkliste: Überschriften, Alternativtexte, Kontraste und verständliche Linktexte.' },
      { entry_id: 'b6e2', date: daysAgo(6), hours: '1–2', thema: 'HTML-Struktur und semantische Elemente', homework: 'Navigation mit einer ungeordneten Liste auszeichnen', homework_done: true, attendance: 'anwesend', files: [], content: 'Wir strukturieren Inhalte mit passenden HTML-Elementen und besprechen, warum Semantik die Orientierung verbessert.' },
    ],
    entry_count: 2,
    exams: [`${relDate(19)} Projektabgabe`],
    attendance_summary: { anwesend: '16', entschuldigt: '1', unentschuldigt: '0' },
  },
};

const mockEntryDetails: Record<string, any> = {
  b1e1: { id: 'b1e1', title: 'Gedichtvergleich: Stadt und Natur', content: '<p>Vergleiche Bildsprache und Stimmung der beiden Gedichte.</p><p><strong>Arbeitsauftrag:</strong> Belege deine Aussage mit je einer Textstelle und einem Fachbegriff.</p>', date: daysAgo(1), attachments: [{ name: 'Gedichtvergleich-Leitfaden.pdf', url: '/files/gedichtvergleich-leitfaden.pdf' }] },
  b2e1: { id: 'b2e1', title: 'Lineare Funktionen und Steigung', content: '<p>Lies Steigung und y-Achsenabschnitt aus dem Graphen ab und zeichne die Funktion.</p><p><strong>Arbeitsauftrag:</strong> Notiere jeden Rechenschritt und prüfe einen Punkt durch Einsetzen.</p>', date: daysAgo(2), attachments: [{ name: 'Funktionsgraphen-Arbeitsblatt.pdf', url: '/files/funktionsgraphen-arbeitsblatt.pdf' }] },
  b3e1: { id: 'b3e1', title: 'Writing a persuasive speech', content: '<p>Write an opening paragraph with a clear claim and a concrete example.</p><p><strong>Remember:</strong> Address your audience directly and finish with a short appeal.</p>', date: daysAgo(3), attachments: [{ name: 'Speech-planner.pdf', url: '/files/speech-planner.pdf' }] },
  b4e1: { id: 'b4e1', title: 'Ökosystem See', content: '<p>Ergänze dein Protokoll um eine begründete Auswertung des Algenwachstums.</p><p>Trenne dabei klar zwischen Beobachtung, Erklärung und Fazit.</p>', date: daysAgo(1), attachments: [{ name: 'See-Experiment-Protokoll.pdf', url: '/files/see-experiment-protokoll.pdf' }] },
  b5e1: { id: 'b5e1', title: 'Industrialisierung und soziale Frage', content: '<p>Werte die Quelle zur Fabrikarbeit aus und ordne sie in ihren historischen Zusammenhang ein.</p><p><strong>Arbeitsauftrag:</strong> Formuliere drei Aussagen mit Quellenbeleg.</p>', date: daysAgo(4), attachments: [{ name: 'Quellenblatt-Fabrikarbeit.pdf', url: '/files/quellenblatt-fabrikarbeit.pdf' }] },
  b6e1: { id: 'b6e1', title: 'Barrierefreie Website', content: '<p>Prüfe deine Website mit der Checkliste und verbessere die Stellen, die die Orientierung erschweren.</p><p>Beginne mit Überschriften, Alternativtexten, Kontrasten und Linktexten.</p>', date: daysAgo(2), attachments: [{ name: 'HTML-Checkliste.pdf', url: '/files/html-checkliste.pdf' }] },
};

const mockCalendarCategories = [
  { id: 1, name: 'Klausuren', color: '#dc2626', logo: 'fa-regular fa-file-lines' },
  { id: 2, name: 'Sonstige Termine', color: '#2563eb', logo: 'fa-regular fa-calendar' },
  { id: 3, name: 'Ferien & freie Tage', color: '#059669', logo: 'fa-regular fa-sun' },
  { id: 4, name: 'Abgaben', color: '#d97706', logo: 'fa-regular fa-clock' },
  { id: 5, name: 'Klassen & Schule', color: '#7c3aed', logo: 'fa-regular fa-users' },
  { id: 6, name: 'Schulwochen', color: '#0f766e', logo: 'fa-regular fa-calendar' },
];

const mockCalendarEvents: any[] = [
  { id: 'ev1', title: 'A-Woche', category: '6', category_name: 'Schulwochen', category_color: '#0f766e', description: '<p>Diese Woche ist eine <strong>A-Woche</strong>.</p><p>Der Stundenplan folgt der A-Woche.</p>', start: weekDate(0), end: weekDate(5), all_day: true, new: '0', editable: false, properties: { 'Woche': 'A' }, raw: {} },
  { id: 'ev2', title: 'Klassensprecher-Runde', category: '5', category_name: 'Klassen & Schule', category_color: '#7c3aed', description: '<p>Kurze Runde der Klassensprecherinnen und Klassensprecher.</p><p>Der reguläre Unterricht findet ansonsten statt.</p>', start: relDateTime(1, '08:35:00'), end: relDateTime(1, '09:20:00'), all_day: false, new: '1', editable: false, properties: { 'Ort': 'Raum B204' }, raw: {} },
  { id: 'ev3', title: 'Klassenfahrt: Infoabend', category: '5', category_name: 'Klassen & Schule', category_color: '#7c3aed', description: '<p>Informationsabend für die geplante Klassenfahrt.</p><p>Bitte Fragen und die Einverständniserklärung mitbringen.</p>', start: relDateTime(6, '18:00:00'), end: relDateTime(6, '19:00:00'), all_day: false, new: '0', editable: false, properties: { 'Klasse': demoUser.klasse, 'Ort': 'Aula' }, raw: {} },
  { id: 'ev4', title: 'Deutsch-Arbeit', category: '1', category_name: 'Klausuren', category_color: '#dc2626', description: '<p>Schriftlicher Gedichtvergleich.</p><p>Bitte Schreibmaterial und das Wörterbuch mitbringen.</p>', start: relDateTime(10, '09:40:00'), end: relDateTime(10, '11:10:00'), all_day: false, new: '1', editable: false, properties: { 'Fach': 'Deutsch 9c', 'Lehrkraft': 'CN', 'Raum': 'B204', 'Dauer': '90 Minuten' }, raw: {} },
  { id: 'ev5', title: 'Mathematik-Arbeit', category: '1', category_name: 'Klausuren', category_color: '#dc2626', description: '<p>Leistungskontrolle zu linearen Funktionen und Graphen.</p>', start: relDateTime(12, '07:50:00'), end: relDateTime(12, '09:20:00'), all_day: false, new: '0', editable: false, properties: { 'Fach': 'Mathematik 9c', 'Lehrkraft': 'MV', 'Raum': 'B204', 'Dauer': '60 Minuten' }, raw: {} },
  { id: 'ev6', title: 'Biologie-Protokoll', category: '4', category_name: 'Abgaben', category_color: '#d97706', description: '<p>Abgabe des Protokolls zum See-Experiment.</p><p>Beobachtung, Erklärung und Fazit bitte getrennt ausweisen.</p>', start: relDateTime(4, '23:59:00'), end: relDateTime(4, '23:59:00'), all_day: true, new: '0', editable: false, properties: { 'Fach': 'Biologie 9c', 'Lehrkraft': 'FB', 'Abgabeweg': 'Kursordner' }, raw: {} },
  { id: 'ev7', title: 'SV-Treffen', category: '5', category_name: 'Klassen & Schule', category_color: '#7c3aed', description: '<p>Treffen der Schülervertretung zur Planung der nächsten Aktion.</p>', start: relDateTime(4, '13:30:00'), end: relDateTime(4, '15:00:00'), all_day: false, new: '0', editable: false, properties: { 'Ort': 'Raum 215' }, raw: {} },
  { id: 'ev8', title: 'Herbstferien', category: '3', category_name: 'Ferien & freie Tage', category_color: '#059669', description: '<p>Unterrichtsfreie Zeit in Hessen.</p>', start: relDate(32), end: relDate(45), all_day: true, new: '0', editable: false, properties: { 'Bundesland': 'Hessen' }, raw: {} },
  { id: 'ev9', title: 'Englisch-Präsentation', category: '4', category_name: 'Abgaben', category_color: '#d97706', description: '<p>Kurze persuasive speech im Englischkurs.</p><p>Bitte den Speech-planner und eure Stichpunkte mitbringen.</p>', start: relDateTime(8, '23:59:00'), end: relDateTime(8, '23:59:00'), all_day: true, new: '1', editable: false, properties: { 'Fach': 'Englisch 9c', 'Lehrkraft': 'AO', 'Abgabeweg': 'Kursordner' }, raw: {} },
  { id: 'ev10', title: 'Elternabend 9C', category: '5', category_name: 'Klassen & Schule', category_color: '#7c3aed', description: '<p>Elternabend mit Informationen zum zweiten Halbjahr.</p>', start: relDateTime(9, '18:30:00'), end: relDateTime(9, '20:00:00'), all_day: false, new: '0', editable: false, properties: { 'Klasse': demoUser.klasse, 'Ort': 'Raum B204' }, raw: {} },
  { id: 'ev11', title: 'Projektwoche', category: '2', category_name: 'Sonstige Termine', category_color: '#2563eb', description: '<p>Gemeinsame Projektwoche der Jahrgänge 9 und 10.</p><p>Der genaue Workshop-Plan folgt im Dateispeicher.</p>', start: relDate(17), end: relDate(19), all_day: true, new: '0', editable: false, properties: { 'Jahrgang': '9–10' }, raw: {} },
  { id: 'ev12', title: 'Informatik-Projektabgabe', category: '4', category_name: 'Abgaben', category_color: '#d97706', description: '<p>Abgabe der barrierefreien Website und der kurzen Dokumentation.</p>', start: relDateTime(19, '23:59:00'), end: relDateTime(19, '23:59:00'), all_day: true, new: '0', editable: false, properties: { 'Fach': 'Informatik 9c', 'Lehrkraft': 'LR', 'Abgabeweg': 'Kursordner' }, raw: {} },
];

const mockVertretungsplan = {
  success: true,
  source: 'schulportal',
  available: true,
  mode: 'ajax',
  last_updated: new Date().toISOString(),
  days: [
    {
      date: weekDate(3),
      substitutions: [
        { tag: weekDate(3), tag_en: weekDate(3), stunde: '3 - 4', fach: 'Mathematik', klasse: demoUser.klasse, lehrer: 'MV', vertreter: '---', raum: 'B204', art: 'Raumänderung', hinweis: 'Der Unterricht findet in Raum B204 statt.' },
        { tag: weekDate(3), tag_en: weekDate(3), stunde: '5 - 6', fach: 'Biologie', klasse: demoUser.klasse, lehrer: 'FB', vertreter: null, raum: 'C106', art: 'Entfall', hinweis: 'Der Unterricht entfällt.' },
      ],
      infos: [{ header: 'Hinweis', values: ['Bitte Änderungen bis zum Unterrichtsbeginn beachten.'] }],
    },
    {
      date: weekDate(4),
      substitutions: [
        { tag: weekDate(4), tag_en: weekDate(4), stunde: '1 - 2', fach: 'Englisch', klasse: demoUser.klasse, lehrer: 'AO', vertreter: 'Frau Winter', raum: 'B204', art: 'Vertretung' },
        { tag: weekDate(4), tag_en: weekDate(4), stunde: '5 - 6', fach: 'Kunst', klasse: demoUser.klasse, lehrer: 'KH', vertreter: '---', raum: 'K3', art: 'Raumänderung', hinweis: 'Bitte direkt in den Kunstraum gehen.' },
      ],
    },
    {
      date: weekDate(7),
      substitutions: [
        { tag: weekDate(7), tag_en: weekDate(7), stunde: '3 - 4', fach: 'Geschichte', klasse: demoUser.klasse, lehrer: 'MS', vertreter: 'Herr Yilmaz', raum: 'B204', art: 'Vertretung', hinweis: 'Arbeitsauftrag liegt im Kursordner.' },
      ],
    },
  ],
  count: 5,
  raw_html: null,
};

const mockDsbData = {
  menuItems: ['Heute', 'Morgen'],
  planUrls: ['/plan/heute', '/plan/morgen'],
  tables: [{
    caption: `Klasse ${demoUser.klasse} — Vertretungsplan`,
    headers: ['Stunde', 'Fach', 'Lehrkraft', 'Vertretung', 'Raum', 'Info'],
    rows: [
      { Stunde: '1–2', Fach: 'Mathematik', Lehrkraft: 'MV', Vertretung: '---', Raum: 'B204', Info: '' },
      { Stunde: '3–4', Fach: 'Englisch', Lehrkraft: 'AO', Vertretung: 'Frau Winter', Raum: 'B204', Info: 'Vertretung' },
      { Stunde: '5–6', Fach: 'Biologie', Lehrkraft: 'FB', Vertretung: '---', Raum: 'C106', Info: 'Entfall' },
      { Stunde: '7–8', Fach: 'Informatik', Lehrkraft: 'LR', Vertretung: '---', Raum: 'C101', Info: 'Projektarbeit' },
      { Stunde: '9–10', Fach: 'Kunst', Lehrkraft: 'KH', Vertretung: '---', Raum: 'K3', Info: 'Raumänderung' },
      { Stunde: '11–12', Fach: 'Sport', Lehrkraft: 'SW', Vertretung: '---', Raum: 'TH1', Info: 'Bitte Sportsachen mitbringen' },
    ],
    date: relDate(0),
  }],
};

type DemoLesson = {
  id: string;
  period: string;
  start_time: string;
  end_time: string;
  subject: string;
  teacher: string;
  room: string;
  course_id?: string;
  course_name: string;
  homework?: Array<{ entry_id: string; text: string; done: boolean; assigned_date: string }>;
  info?: string;
};

type DemoTimetableDay = {
  date: string;
  name: string;
  lessons: DemoLesson[];
};

const mockTimetable: DemoTimetableDay[] = [
  { date: weekDate(0), name: 'Montag', lessons: [
    { id: 'mo-1', period: '1–2', start_time: '07:50', end_time: '09:20', subject: 'Deutsch', teacher: 'CN', room: 'B204', course_id: 'b1', course_name: 'Deutsch 9c', homework: [{ entry_id: 'e1', text: mockCourses[0].homework, done: false, assigned_date: mockCourses[0].datum.slice(0, 10) }] },
    { id: 'mo-2', period: '3–4', start_time: '09:40', end_time: '11:10', subject: 'Mathematik', teacher: 'MV', room: 'B204', course_id: 'b2', course_name: 'Mathematik 9c', homework: [{ entry_id: 'e2', text: mockCourses[1].homework, done: false, assigned_date: mockCourses[1].datum.slice(0, 10) }] },
    { id: 'mo-3', period: '5–6', start_time: '11:30', end_time: '13:00', subject: 'Englisch', teacher: 'AO', room: 'B204', course_id: 'b3', course_name: 'Englisch 9c' },
    { id: 'mo-4', period: '7–8', start_time: '13:30', end_time: '15:00', subject: 'Informatik', teacher: 'LR', room: 'C101', course_id: 'b6', course_name: 'Informatik 9c', info: 'Projektarbeit' },
  ] },
  { date: weekDate(1), name: 'Dienstag', lessons: [
    { id: 'di-1', period: '1–2', start_time: '07:50', end_time: '09:20', subject: 'Biologie', teacher: 'FB', room: 'C106', course_id: 'b4', course_name: 'Biologie 9c', homework: [{ entry_id: 'e4', text: mockCourses[3].homework, done: false, assigned_date: mockCourses[3].datum.slice(0, 10) }] },
    { id: 'di-2', period: '3–4', start_time: '09:40', end_time: '11:10', subject: 'Geschichte', teacher: 'MS', room: 'B204', course_id: 'b5', course_name: 'Geschichte 9c', homework: [{ entry_id: 'e5', text: mockCourses[4].homework, done: true, assigned_date: mockCourses[4].datum.slice(0, 10) }] },
    { id: 'di-3', period: '5–6', start_time: '11:30', end_time: '13:00', subject: 'Mathematik', teacher: 'MV', room: 'B204', course_id: 'b2', course_name: 'Mathematik 9c' },
  ] },
  { date: weekDate(2), name: 'Mittwoch', lessons: [
    { id: 'mi-1', period: '1–2', start_time: '07:50', end_time: '09:20', subject: 'Englisch', teacher: 'AO', room: 'B204', course_id: 'b3', course_name: 'Englisch 9c', homework: [{ entry_id: 'e3', text: mockCourses[2].homework, done: true, assigned_date: mockCourses[2].datum.slice(0, 10) }] },
    { id: 'mi-2', period: '3–4', start_time: '09:40', end_time: '11:10', subject: 'Deutsch', teacher: 'CN', room: 'B204', course_id: 'b1', course_name: 'Deutsch 9c' },
    { id: 'mi-3', period: '5–6', start_time: '11:30', end_time: '13:00', subject: 'Biologie', teacher: 'FB', room: 'C106', course_id: 'b4', course_name: 'Biologie 9c' },
    { id: 'mi-4', period: '7–8', start_time: '13:30', end_time: '15:00', subject: 'Sport', teacher: 'SW', room: 'TH1', course_name: 'Sport 9c' },
  ] },
  { date: weekDate(3), name: 'Donnerstag', lessons: [
    { id: 'do-1', period: '1–2', start_time: '07:50', end_time: '09:20', subject: 'Geschichte', teacher: 'MS', room: 'B204', course_id: 'b5', course_name: 'Geschichte 9c' },
    { id: 'do-2', period: '3–4', start_time: '09:40', end_time: '11:10', subject: 'Informatik', teacher: 'LR', room: 'C101', course_id: 'b6', course_name: 'Informatik 9c', info: 'Projektarbeit' },
    { id: 'do-3', period: '5–6', start_time: '11:30', end_time: '13:00', subject: 'Kunst', teacher: 'KH', room: 'K3', course_name: 'Kunst 9c' },
  ] },
  { date: weekDate(4), name: 'Freitag', lessons: [
    { id: 'fr-1', period: '1–2', start_time: '07:50', end_time: '09:20', subject: 'Mathematik', teacher: 'MV', room: 'B204', course_id: 'b2', course_name: 'Mathematik 9c' },
    { id: 'fr-2', period: '3–4', start_time: '09:40', end_time: '11:10', subject: 'Deutsch', teacher: 'CN', room: 'B204', course_id: 'b1', course_name: 'Deutsch 9c' },
    { id: 'fr-3', period: '5–6', start_time: '11:30', end_time: '13:00', subject: 'Biologie', teacher: 'FB', room: 'C106', course_id: 'b4', course_name: 'Biologie 9c' },
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
  { id: 'exam-1', course_id: 'group-1', course_name: 'Deutsch 9c', course_sys_id: '9C-DEU', date: relDate(10), type: 'Arbeit', duration_label: '90 Min.', hours: '3.–4. Stunde' },
  { id: 'exam-2', course_id: 'group-2', course_name: 'Mathematik 9c', course_sys_id: '9C-MAT', date: relDate(12), type: 'Arbeit', duration_label: '60 Min.', hours: '1.–2. Stunde' },
  { id: 'exam-3', course_id: 'group-3', course_name: 'Englisch 9c', course_sys_id: '9C-ENG', date: relDate(24), type: 'Arbeit', duration_label: '90 Min.', hours: '3.–4. Stunde' },
  { id: 'exam-4', course_id: 'group-4', course_name: 'Biologie 9c', course_sys_id: '9C-BIO', date: relDate(34), type: 'Lernkontrolle', duration_label: '45 Min.', hours: '3.–4. Stunde' },
  { id: 'exam-5', course_id: 'group-5', course_name: 'Geschichte 9c', course_sys_id: '9C-GES', date: relDate(42), type: 'Arbeit', duration_label: '60 Min.', hours: '1.–2. Stunde' },
  { id: 'exam-6', course_id: 'group-6', course_name: 'Informatik 9c', course_sys_id: '9C-INF', date: relDate(19), type: 'Projektabgabe', duration_label: '—', hours: 'Abgabe bis 23:59 Uhr' },
];

const mockStudyGroups = [
  { id: 'group-1', semester: '1. Halbjahr 2026/2027', course_name: 'Deutsch 9c', course_sys_id: '9C-DEU', teachers: [{ krz: 'CN', first_name: 'Clara', last_name: 'Neumann', email: null, recipient_id: 'l-1001' }], exams: [mockStudyGroupExams[0]] },
  { id: 'group-2', semester: '1. Halbjahr 2026/2027', course_name: 'Mathematik 9c', course_sys_id: '9C-MAT', teachers: [{ krz: 'MV', first_name: 'Martin', last_name: 'Vogel', email: null, recipient_id: 'l-1002' }], exams: [mockStudyGroupExams[1]] },
  { id: 'group-3', semester: '1. Halbjahr 2026/2027', course_name: 'Englisch 9c', course_sys_id: '9C-ENG', teachers: [{ krz: 'AO', first_name: 'Aylin', last_name: 'Özdemir', email: null, recipient_id: 'l-1003' }], exams: [mockStudyGroupExams[2]] },
  { id: 'group-4', semester: '1. Halbjahr 2026/2027', course_name: 'Biologie 9c', course_sys_id: '9C-BIO', teachers: [{ krz: 'FB', first_name: 'Felix', last_name: 'Brandt', email: null, recipient_id: 'l-1004' }], exams: [mockStudyGroupExams[3]] },
  { id: 'group-5', semester: '1. Halbjahr 2026/2027', course_name: 'Geschichte 9c', course_sys_id: '9C-GES', teachers: [{ krz: 'MS', first_name: 'Marie', last_name: 'Seidel', email: null, recipient_id: 'l-1005' }], exams: [mockStudyGroupExams[4]] },
  { id: 'group-6', semester: '1. Halbjahr 2026/2027', course_name: 'Informatik 9c', course_sys_id: '9C-INF', teachers: [{ krz: 'LR', first_name: 'Leonie', last_name: 'Roth', email: null, recipient_id: 'l-1006' }], exams: [mockStudyGroupExams[5]] },
];

function urlMatches(pattern: string, url: string): boolean {
  const regex = new RegExp('^' + pattern.replace(/:\w+/g, '[^/]+').replace(/\*/g, '.*') + '$');
  return regex.test(url);
}

export function getMockResponse(url: string, method: string, config: any): { data: any; status: number } {
  const u = (url || '').replace(config?.baseURL || '', '').split('?')[0];

  // Auth
  if (u === '/benutzer' && method === 'get') { return { status: 200, data: { success: true, data: demoUser } }; }
  if (u === '/health' && method === 'get') { return { status: 200, data: { status: 'ok' } }; }

  // Modules
  if (u === '/modules' && method === 'get') { return { status: 200, data: { success: true, modules: demoModules } }; }

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
      { id: 'r1', name: 'Clara Neumann', username: 'cn', type: 'Lehrkraft' },
      { id: 'r2', name: 'Martin Vogel', username: 'mv', type: 'Lehrkraft' },
      { id: 'r3', name: 'Aylin Özdemir', username: 'ao', type: 'Lehrkraft' },
      { id: 'r5', name: 'Felix Brandt', username: 'fb', type: 'Lehrkraft' },
      { id: 'r6', name: 'Frau Winter', username: 'sw', type: 'Lehrkraft' },
      { id: 'r4', name: 'Mia Keller', username: demoUser.username, type: 'Schüler/in' },
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
  if (u === '/notifications/vertretungsplan/options' && method === 'get') {
    return {
      status: 200,
      data: {
        success: true,
        own_class: demoUser.klasse,
        available_classes: ['9A', '9B', '9C'],
      },
    };
  }
  if (u === '/whatsapp/status' && method === 'get') {
    return {
      status: 200,
      data: {
        success: true,
        configured: false,
        linked: false,
        phone_suffix: '',
        linked_at: null,
        show_message_previews: false,
      },
    };
  }
  if (u === '/vertretungsplan/options' && method === 'get') {
    return {
      status: 200,
      data: {
        success: true,
        own_class: demoUser.klasse,
        available_classes: ['9A', '9B', '9C'],
      },
    };
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
    persistMockOverrides();
    return { status: 200, data: { success: true, link: { course_id: body?.course_id, url: body?.url || '', overridden: true } } };
  }
  if (u === '/settings/class-links' && method === 'delete') {
    delete mockClassLinkOverrides[config?.params?.course_id];
    persistMockOverrides();
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
  if (u === '/meinunterricht/attendance' && method === 'get') { return { status: 200, data: mockAttendanceOverview }; }
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
    return { status: 200, data: { success: true, week: { start_date: weekDate(0), entries: [
      { date: weekDate(0), course: 'Deutsch 9c', entry: 'Gedichtvergleich: Stadt und Natur', url: '' },
      { date: weekDate(0), course: 'Mathematik 9c', entry: 'Lineare Funktionen und Steigung', url: '' },
      { date: weekDate(1), course: 'Biologie 9c', entry: 'Ökosystem See', url: '' },
      { date: weekDate(2), course: 'Englisch 9c', entry: 'Writing a persuasive speech', url: '' },
      { date: weekDate(3), course: 'Geschichte 9c', entry: 'Industrialisierung und soziale Frage', url: '' },
      { date: weekDate(4), course: 'Informatik 9c', entry: 'Barrierefreie Website', url: '' },
    ] } } };
  }
  if (u === '/meinunterricht/submissions' && method === 'get') { return { status: 200, data: { success: true, submissions: mockSubmissions } }; }
  if (u === '/meinunterricht/homework-done' && method === 'post') { return { status: 200, data: { success: true } }; }

  // Calendar
  if (u === '/kalender' && method === 'get') {
    return { status: 200, data: {
      success: true,
      page_title: 'Kalender',
      calendar: { first_id: '0', new_events_count: '2', can_write: false, key: '', public_view: false, institution: 'Elisabeth-Selbert-Schule', is_admin: false },
      categories: mockCalendarCategories,
      groups: [{ id: 1, name: demoUser.klasse }],
      export_links: [],
    } };
  }
  if (u === '/kalender/events' && method === 'get') {
    return { status: 200, data: {
      success: true,
      events: mockCalendarEvents,
      count: mockCalendarEvents.length,
      categories: mockCalendarCategories,
      groups: [{ id: 1, name: demoUser.klasse }],
      filters: { year: now.getFullYear(), start: 'year', category: '', search: '', target: '', view_id: '' },
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
    persistMockOverrides();
    return { status: 200, data: { success: true, lesson: { ...body, is_custom: true } } };
  }
  if (u === '/settings/timetable/lessons' && method === 'delete') {
    mockCustomLessons = mockCustomLessons.filter(lesson => !(lesson.date === config?.params?.date && lesson.period === config?.params?.period));
    persistMockOverrides();
    return { status: 200, data: { success: true } };
  }

  // Timetable
  if (u === '/stundenplan' && method === 'get') {
    const days = getMockTimetable();
    return { status: 200, data: { success: true, week_start: days[0].date, week_end: days[4].date, active_week: 'A', days, custom_lessons: mockCustomLessons } };
  }
  if (u === '/dateispeicher' && method === 'get') {
    const folderId = Number(config?.params?.folder_id || 0);
    return { status: 200, data: mockDateispeicherNodes[folderId as keyof typeof mockDateispeicherNodes] || { success: true, folder_id: folderId, folders: [], files: [], file_count: 0, folder_count: 0 } };
  }
  if (u === '/dateispeicher/search' && method === 'get') {
    const query = String(config?.params?.q || '').toLowerCase();
    const allFiles = Object.values(mockDateispeicherNodes).flatMap(node => node.files);
    const allFolders = Object.values(mockDateispeicherNodes).flatMap(node => node.folders);
    return { status: 200, data: { success: true, query, source: 'server', results: {
      files: allFiles.filter(file => file.name.toLowerCase().includes(query)),
      folders: allFolders.filter(folder => folder.name.toLowerCase().includes(query)),
    } } };
  }
  if (u.startsWith('/dateispeicher/file/') && method === 'get') {
    const fileId = u.split('/').pop();
    return { status: 200, data: new Blob([`Demo-Datei ${fileId}`], { type: 'text/plain' }) };
  }
  if (u === '/vertretungsplan' && method === 'get') { return { status: 200, data: mockVertretungsplan }; }
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
