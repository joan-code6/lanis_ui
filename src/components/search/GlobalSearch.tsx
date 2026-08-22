import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI, messagesAPI, calendarAPI, coursesAPI, appsAPI, searchAPI, studyGroupsAPI, timetableAPI } from '../../services/api';
import type { SemanticSearchResult } from '../../services/api';
import {
  MagnifyingGlassIcon,
  HomeIcon,
  ChatBubbleLeftRightIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  UserIcon,
  Cog6ToothIcon,
  ClipboardDocumentListIcon,
  ArrowPathIcon,
  ClockIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  action?: () => void;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Dashboard: HomeIcon,
  Nachrichten: ChatBubbleLeftRightIcon,
  Unterricht: AcademicCapIcon,
  Kalender: CalendarDaysIcon,
  Module: HomeIcon,
  Vertretungsplan: ClipboardDocumentListIcon,
  Stundenplan: ClockIcon,
  Lerngruppen: UserGroupIcon,
  Profil: UserIcon,
  Einstellungen: Cog6ToothIcon,
  Nutzer: UserIcon,
  Suche: MagnifyingGlassIcon,
};

function fuzzyMatch(query: string, text: string): boolean {
  if (!query || !text) return false;
  return text.toLowerCase().includes(query.toLowerCase().trim());
}

function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  const namedEntities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
  };
  let decoded = text.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (entity) => namedEntities[entity] || entity);
  decoded = decoded.replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)));
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
  return decoded;
}

function cleanHtmlText(text: string): string {
  return decodeHtmlEntities(text.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function normalizeClassCode(code: string): string {
  const match = code.match(/^0*(\d+)([A-Za-z])$/);
  if (!match) return code.toUpperCase();
  return `${match[1]}${match[2].toUpperCase()}`;
}

function extractClassCode(text: string): string | null {
  const bracket = text.match(/\((\d{1,2}[A-Za-z])\)/);
  if (bracket) return normalizeClassCode(bracket[1]);
  const inline = text.match(/\b(\d{1,2}[A-Za-z])\b/);
  if (inline) return normalizeClassCode(inline[1]);
  return null;
}

function recipientEntries(rawRecipients: unknown): string[] {
  if (Array.isArray(rawRecipients)) {
    return rawRecipients.map((entry) => cleanHtmlText(String(entry || ''))).filter(Boolean);
  }
  if (typeof rawRecipients === 'string' && rawRecipients.trim()) {
    const cleaned = cleanHtmlText(rawRecipients);
    const parts = cleaned
      .split(/(?<=\))\s*,\s*/g)
      .map((entry) => entry.trim())
      .filter(Boolean);
    return parts.length > 1 ? parts : [cleaned];
  }
  return [];
}

function summarizeRecipients(rawRecipients: unknown, usernameMap: Record<string, string>): { text: string; groupLabel?: string } {
  const entries = recipientEntries(rawRecipients).map((entry) => {
    const mapped = usernameMap[entry] || entry;
    return cleanHtmlText(mapped);
  }).filter(Boolean);

  if (entries.length === 0) return { text: '' };
  if (entries.length === 1) return { text: entries[0] };

  const classes = entries.map(extractClassCode).filter((code): code is string => Boolean(code));
  const uniqueClasses = [...new Set(classes)];

  if (entries.length >= 10 && uniqueClasses.length >= 8) {
    return { text: 'Ganze Schule', groupLabel: 'Ganze Schule' };
  }

  if (entries.length >= 6 && uniqueClasses.length > 0) {
    if (uniqueClasses.length === 1) {
      const label = `Klasse ${uniqueClasses[0]}`;
      return { text: label, groupLabel: label };
    }

    const grades = [...new Set(uniqueClasses.map((classCode) => classCode.match(/^(\d+)/)?.[1]).filter(Boolean))];
    if (grades.length === 1) {
      const label = `Jahrgangsstufe ${grades[0]}`;
      return { text: label, groupLabel: label };
    }
  }

  if (entries.length > 3) {
    return { text: `${entries.slice(0, 2).join(', ')} +${entries.length - 2} weitere` };
  }

  return { text: entries.join(', ') };
}

function resolveSenderName(message: any, usernameMap: Record<string, string>, recipientsGroupLabel?: string): string {
  const senderCandidates = [
    message?.SenderName,
    message?.sender_name,
    message?.username,
    message?.sender,
    message?.Sender,
  ];

  for (const candidate of senderCandidates) {
    const value = cleanHtmlText(String(candidate || ''));
    if (!value) continue;
    const mapped = cleanHtmlText(String(usernameMap[value] || value));
    if (mapped && !/^\d{4,}$/.test(mapped)) return mapped;
  }

  if (recipientsGroupLabel) return recipientsGroupLabel;
  return 'Unbekannt';
}

function loadUsernameMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem('username_cache');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const data = parsed?.data || parsed;
    if (!data || typeof data !== 'object') return {};
    const map: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      if (key === 'ts') continue;
      if (typeof value === 'string' && value.trim()) map[String(key)] = cleanHtmlText(value);
    }
    return map;
  } catch {
    return {};
  }
}

function collectTexts(obj: unknown, depth: number = 0): string {
  if (depth > 4) return '';
  if (typeof obj === 'string') return obj + ' ';
  if (typeof obj === 'number') return String(obj) + ' ';
  if (Array.isArray(obj)) {
    return obj.map(item => collectTexts(item, depth + 1)).join(' ');
  }
  if (obj && typeof obj === 'object') {
    return Object.values(obj).map(v => collectTexts(v, depth + 1)).join(' ');
  }
  return '';
}

function searchText(query: string, obj: unknown): boolean {
  return fuzzyMatch(query, collectTexts(obj));
}

function htmlToText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return new DOMParser().parseFromString(value, 'text/html').body.textContent?.replace(/\s+/g, ' ').trim() || '';
}

// ── Tier 1: cache search ──────────────────────────────────────────

function searchCacheData(query: string): SearchItem[] {
  if (!query || query.length < 1) return [];
  const results: SearchItem[] = [];
  const usernameMap = loadUsernameMap();

  try {
    const raw = localStorage.getItem('messages_cache');
    if (raw) {
      const msgs = JSON.parse(raw);
      if (Array.isArray(msgs)) {
        for (const m of msgs) {
          if (searchText(query, m)) {
            const subj = cleanHtmlText(String(m.Betreff || ''));
            const recipientSummary = summarizeRecipients(m.empf ?? m.WeitereEmpfaenger, usernameMap);
            const sender = resolveSenderName(m, usernameMap, recipientSummary.groupLabel);
            const empf = recipientSummary.text;
            let sub = sender ? `Von: ${sender}` : '';
            if (empf && empf !== sender) sub += sub ? `  An: ${empf}` : `An: ${empf}`;
            if (m.date) { try { sub += sub ? `  ${new Date(m.date).toLocaleDateString('de-DE')}` : new Date(m.date).toLocaleDateString('de-DE'); } catch {} }
            results.push({
              id: `msg-${m.Uniquid || m.Id || Math.random()}`,
              title: subj || 'Kein Betreff',
              subtitle: sub || 'Nachricht',
              category: 'Nachrichten',
              icon: ChatBubbleLeftRightIcon,
              href: `/messages?conversation=${encodeURIComponent(m.Uniquid || m.Id)}`,
            });
          }
        }
      }
    }
  } catch {}

  try {
    const raw = localStorage.getItem('courses_cache');
    if (raw) {
      const entries = JSON.parse(raw);
      if (Array.isArray(entries)) {
        for (const e of entries) {
          if (searchText(query, e)) {
            results.push({
              id: `course-${e.entry_id || e.book_id || e.name || Math.random()}`,
              title: e.name || e.thema || 'Unbekannter Kurs',
              subtitle: (e.teacher_full_name || e.teacher_short) ? `Lehrer: ${e.teacher_full_name || e.teacher_short}` : (e.thema || ''),
              category: 'Unterricht',
              icon: AcademicCapIcon,
              href: `/courses/${e.book_id}`,
            });
          }
        }
      }
    }
  } catch {}

  try {
    const raw = localStorage.getItem('modules_cache');
    if (raw) {
      const mods = JSON.parse(raw);
      if (Array.isArray(mods)) {
        for (const m of mods) {
          if (searchText(query, m)) {
            results.push({
              id: `mod-${m.url || m.name || Math.random()}`,
              title: m.name || '',
              subtitle: m.url || (Array.isArray(m.folders) ? m.folders.join(', ') : ''),
              category: 'Module',
              icon: HomeIcon,
              href: '/dashboard',
            });
          }
        }
      }
    }
  } catch {}

  try {
    const raw = localStorage.getItem('dsb_plan_cache');
    if (raw) {
      const data = JSON.parse(raw);
      for (const t of data?.tables || []) {
        if (searchText(query, t)) {
          results.push({
            id: `dsb-${t.caption || Math.random()}`,
            title: t.caption || 'Vertretungsplan',
            subtitle: 'Vertretungsplan Eintrag',
            category: 'Vertretungsplan',
            icon: ClipboardDocumentListIcon,
            href: '/dsb',
          });
        }
      }
    }
  } catch {}

  try {
    const raw = localStorage.getItem('username_cache');
    if (raw) {
      const p = JSON.parse(raw);
      const data = p?.data || p;
      for (const [k, v] of Object.entries(data)) {
        if (k === 'ts') continue;
        if (fuzzyMatch(query, k) || fuzzyMatch(query, v as string)) {
          results.push({
            id: `user-${k}`,
            title: (v as string) || k,
            subtitle: `Username: ${k}`,
            category: 'Nutzer',
            icon: UserIcon,
            href: '/messages',
          });
        }
      }
    }
  } catch {}

  try {
    const raw = localStorage.getItem('profile_cache');
    if (raw) {
      const profile = JSON.parse(raw);
      if (searchText(query, profile)) {
        const fv = typeof profile === 'object' ? Object.values(profile)[0] : '';
        results.push({
          id: 'profile',
          title: 'Dein Profil',
          subtitle: typeof fv === 'string' ? fv : '',
          category: 'Profil',
          icon: UserIcon,
          href: '/profile',
        });
      }
    }
  } catch {}

  const nav = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, cat: 'Dashboard' },
    { name: 'Nachrichten', href: '/messages', icon: ChatBubbleLeftRightIcon, cat: 'Nachrichten' },
    { name: 'Mein Unterricht', href: '/courses', icon: AcademicCapIcon, cat: 'Unterricht' },
    { name: 'Kalender', href: '/calendar', icon: CalendarDaysIcon, cat: 'Kalender' },
    { name: 'Stundenplan', href: '/timetable', icon: ClockIcon, cat: 'Stundenplan' },
    { name: 'Lerngruppen', href: '/study-groups', icon: UserGroupIcon, cat: 'Lerngruppen' },
    { name: 'Vertretungsplan', href: '/dsb', icon: ClipboardDocumentListIcon, cat: 'Vertretungsplan' },
    { name: 'Profil', href: '/profile', icon: UserIcon, cat: 'Profil' },
    { name: 'Einstellungen', href: '/settings', icon: Cog6ToothIcon, cat: 'Einstellungen' },
  ];
  for (const n of nav) {
    if (fuzzyMatch(query, n.name)) {
      results.push({ id: `nav-${n.name}`, title: n.name, subtitle: 'Seite', category: n.cat, icon: n.icon, href: n.href });
    }
  }

  results.sort((a, b) => (a.title.toLowerCase().startsWith(query.toLowerCase()) ? 0 : 1) - (b.title.toLowerCase().startsWith(query.toLowerCase()) ? 0 : 1));
  return results.slice(0, 30);
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const abortedRef = useRef(false);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tier, setTier] = useState<0 | 1 | 2 | 3>(0);
  const [apiResults, setApiResults] = useState<SearchItem[]>([]);
  const [semanticResults, setSemanticResults] = useState<SearchItem[]>([]);

  const cacheResults = useMemo(() => searchCacheData(query), [query]);

  const combinedResults = useMemo(() => {
    const seen = new Set<string>();
    const all: SearchItem[] = [];
    // First: keyword results (cache + API)
    for (const r of [...cacheResults, ...apiResults]) {
      const key = r.id + r.title;
      if (!seen.has(key)) { seen.add(key); all.push(r); }
    }
    // Second: semantic results that weren't already found by keyword
    for (const r of semanticResults) {
      const key = r.id + r.title;
      if (!seen.has(key)) { seen.add(key); all.push(r); }
    }
    return all;
  }, [cacheResults, apiResults, semanticResults]);

  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchItem[]> = {};
    for (const item of combinedResults) {
      (groups[item.category] ??= []).push(item);
    }
    return Object.entries(groups);
  }, [combinedResults]);

  // reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setApiResults([]);
      setSemanticResults([]);
      setTier(0);
      abortedRef.current = false;
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => { setSelectedIndex(0); }, [query]);

  // ── Tier 2: auto API search (debounced) ─────────────────────────

  useEffect(() => {
    if (!token || query.length < 1) {
      setTier(0);
      setApiResults([]);
      return;
    }
    setApiResults([]);
    setTier(1);
    const controller = new AbortController();

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (abortedRef.current || query.length < 1) return;
      setTier(2);
      setApiResults([]);

      const tasks: Array<Promise<SearchItem[]>> = [
        messagesAPI.searchRecipients(token, query, controller.signal).then(res =>
          !res.success ? [] : res.results.map(user => ({
            id: `api-usr-${user.id}`,
            title: user.name || user.username,
            subtitle: user.type ? `${user.type} · ${user.username}` : user.username,
            category: 'Nutzer', icon: UserIcon,
            href: `/messages?compose=1&recipient=${encodeURIComponent(user.id)}&recipientName=${encodeURIComponent(user.name || user.username)}&recipientUsername=${encodeURIComponent(user.username || '')}`,
          }))),
        messagesAPI.getMessageHeaders(token, 'All', 0, controller.signal).then(res =>
          !res.success ? [] : res.conversations.filter(message => searchText(query, message)).map(message => ({
            id: `api-msg-${message.Uniquid || message.Id}`,
            title: message.Betreff || 'Kein Betreff',
            subtitle: htmlToText(message.SenderName) || message.Sender || 'Nachricht',
            category: 'Nachrichten', icon: ChatBubbleLeftRightIcon,
            href: `/messages?conversation=${encodeURIComponent(message.Uniquid || message.Id)}`,
          }))),
        calendarAPI.getEvents(token, { search: query }, controller.signal).then(res =>
          !res.success ? [] : res.events.map(event => ({
            id: `api-ev-${event.id}`, title: event.title,
            subtitle: event.start ? new Date(event.start).toLocaleDateString('de-DE') : event.category_name || '',
            category: 'Kalender', icon: CalendarDaysIcon,
            href: `/calendar?event=${encodeURIComponent(event.id)}`,
          }))),
        coursesAPI.getCourses(token, controller.signal).then(res =>
          !res.success ? [] : res.entries.filter(entry => searchText(query, entry)).map(entry => ({
            id: `api-crs-${entry.entry_id || entry.book_id}`, title: entry.name,
            subtitle: entry.teacher_full_name || entry.teacher_short || entry.thema || '',
            category: 'Unterricht', icon: AcademicCapIcon, href: `/courses/${entry.book_id}`,
          }))),
        appsAPI.getModules(token, controller.signal).then(res =>
          !res.success ? [] : res.modules.filter(module => searchText(query, module)).map(module => ({
            id: `api-mod-${module.url}`, title: module.name, subtitle: module.folders?.join(' · ') || 'Modul',
            category: 'Module', icon: HomeIcon, href: '/dashboard',
          }))),
        timetableAPI.getTimetable(token, controller.signal).then(res => {
          if (!res.success) return [];
          const days = res.personal_days || res.days || [];
          return days.flatMap(day => day.lessons.filter(lesson => searchText(query, lesson)).map((lesson, index) => ({
            id: `api-lesson-${day.date}-${lesson.id || index}`,
            title: lesson.course_name || lesson.subject,
            subtitle: [day.name, lesson.start_time, lesson.room, lesson.teacher].filter(Boolean).join(' · '),
            category: 'Stundenplan', icon: ClockIcon,
            href: lesson.course_id ? `/courses/${lesson.course_id}` : '/timetable',
          })));
        }),
        studyGroupsAPI.getStudyGroups(token, controller.signal).then(res => {
          if (!res.success) return [];
          const groups = res.groups.filter(group => searchText(query, group)).map(group => ({
            id: `api-group-${group.id}`, title: group.course_name || 'Lerngruppe',
            subtitle: group.teachers.map(teacher => [teacher.first_name, teacher.last_name].filter(Boolean).join(' ') || teacher.krz).join(' · '),
            category: 'Lerngruppen', icon: UserGroupIcon, href: '/study-groups',
          }));
          const exams = res.exams.filter(exam => searchText(query, exam)).map(exam => ({
            id: `api-exam-${exam.id}`, title: exam.course_name || exam.type || 'Klausur',
            subtitle: [exam.date, exam.type, exam.hours].filter(Boolean).join(' · '),
            category: 'Lerngruppen', icon: UserGroupIcon, href: '/study-groups',
          }));
          return [...groups, ...exams];
        }),
        authAPI.getUserProfile(token, controller.signal).then(res => {
          if (!res.success || !searchText(query, res.data)) return [];
          return [{ id: 'api-profile', title: 'Dein Profil', subtitle: 'Profildaten', category: 'Profil', icon: UserIcon, href: '/profile' }];
        }),
      ];

      const settled = await Promise.allSettled(tasks);
      const r = settled.flatMap(result => result.status === 'fulfilled' ? result.value : []);

      if (!abortedRef.current && !controller.signal.aborted) {
        setApiResults(r);
        setTier(3);
        // at this point totalResults = cacheResults + apiResults
      }
    }, 400);

    return () => {
      controller.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, token]);

  // ── Semantic search (parallel to Tier 2) ────────────────────────

  const semanticTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!token || query.length < 2) {
      setSemanticResults([]);
      return;
    }

    if (semanticTimerRef.current) clearTimeout(semanticTimerRef.current);
    semanticTimerRef.current = setTimeout(async () => {
      if (abortedRef.current) return;
      try {
        const res = await searchAPI.semanticSearch(token, query, 15);
        if (!abortedRef.current && res.success && res.results) {
          const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
            ChatBubbleLeftRightIcon,
            AcademicCapIcon,
            CalendarDaysIcon,
            HomeIcon,
            ClipboardDocumentListIcon,
            UserIcon,
            Cog6ToothIcon,
            ClockIcon,
            UserGroupIcon,
          };
          const mapped: SearchItem[] = res.results.map((r: SemanticSearchResult) => ({
            id: r.id,
            title: r.title,
            subtitle: r.subtitle,
            category: r.category,
            icon: iconMap[r.icon] || MagnifyingGlassIcon,
            href: r.href,
          }));
          setSemanticResults(mapped);
        }
      } catch {
        // Semantic search is optional — fail silently
      }
    }, 600);

    return () => { if (semanticTimerRef.current) clearTimeout(semanticTimerRef.current); };
  }, [query, token]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      abortedRef.current = true;
      if (semanticTimerRef.current) clearTimeout(semanticTimerRef.current);
    };
  }, []);

  // ── actions ─────────────────────────────────────────────────────

  const executeAction = useCallback((item: SearchItem) => {
    onClose();
    if (item.href) navigate(item.href);
    item.action?.();
  }, [onClose, navigate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }

    const flat = [...combinedResults];

    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(prev => Math.min(prev + 1, flat.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(prev => Math.max(prev - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const sel = flat[selectedIndex];
      if (sel) executeAction(sel);
    }
  }, [onClose, combinedResults, selectedIndex, executeAction]);

  if (!isOpen) return null;

  const showLoading = tier === 2;
  const showEmpty = tier >= 3 && query.length >= 1 && combinedResults.length === 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] sm:pt-[20vh] px-4">
      <div className="fixed inset-0 bg-surface-950/50 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-xl backdrop-blur-xl bg-white/80 dark:bg-surface-900/80 rounded-2xl shadow-soft-lg border border-white/30 dark:border-surface-700/40 overflow-hidden animate-scale-in" style={{ boxShadow: '0 4px 40px -8px rgba(0, 0, 0, 0.12), 0 12px 50px -12px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.5)' }}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-100/80 dark:border-surface-800/60">
          <MagnifyingGlassIcon className="h-5 w-5 text-primary-500 dark:text-primary-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Suchen..."
            className="flex-1 bg-transparent text-surface-900 dark:text-surface-100 text-[15px] placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center justify-center min-w-[20px] h-[20px] px-1 rounded text-[11px] font-medium text-surface-400 bg-surface-100 dark:bg-surface-800/80 dark:text-surface-500 border border-surface-200/60 dark:border-surface-700/60">esc</kbd>
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {query.length === 0 && (
            <div className="py-12 text-center">
              <MagnifyingGlassIcon className="h-8 w-8 text-surface-300 dark:text-surface-600 mx-auto mb-3 opacity-60" />
              <p className="text-sm text-surface-400 dark:text-surface-500">Tippe um die Suche zu starten</p>
            </div>
          )}

          {showLoading && (
            <div className="flex items-center gap-3 px-4 py-4 text-sm text-surface-500 dark:text-surface-400">
              <ArrowPathIcon className="h-4 w-4 animate-spin text-primary-500" />
              Suche läuft...
            </div>
          )}

          {showEmpty && (
            <div className="py-12 text-center">
              <MagnifyingGlassIcon className="h-8 w-8 text-surface-300 dark:text-surface-600 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium text-surface-500 dark:text-surface-400">Keine Ergebnisse</p>
              <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">Versuche einen anderen Suchbegriff</p>
            </div>
          )}

          {groupedResults.map(([category, items]) => {
            const CatIcon = CATEGORY_ICONS[category] || MagnifyingGlassIcon;
            let before = 0;
            for (const g of groupedResults) {
              if (g[0] === category) break;
              before += g[1].length;
            }
            return (
              <div key={category} className="mb-1">
                <div className="flex items-center gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
                  <CatIcon className="h-3.5 w-3.5 text-primary-500 dark:text-primary-400" />
                  {category}
                  <span className="ml-auto text-[10px] opacity-60">{items.length}</span>
                </div>
                {items.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => executeAction(item)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 text-sm ${
                      before + idx === selectedIndex
                        ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 shadow-sm'
                        : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100/80 dark:hover:bg-surface-800/60'
                    }`}
                  >
                    <item.icon className={`h-[18px] w-[18px] flex-shrink-0 transition-colors ${
                      before + idx === selectedIndex ? 'text-primary-500 dark:text-primary-400' : 'text-surface-400 dark:text-surface-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{item.title}</div>
                      <div className="text-[13px] text-surface-400 dark:text-surface-500 mt-0.5 truncate leading-snug">{item.subtitle}</div>
                    </div>
                  </button>
                ))}
              </div>
            );
          })}

        </div>

        <div className="flex items-center justify-center gap-4 px-5 py-2 border-t border-surface-100/80 dark:border-surface-800/60 text-[11px] text-surface-400 dark:text-surface-500">
          <span className="flex items-center gap-1"><kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded text-[10px] font-medium bg-surface-100 dark:bg-surface-800/80 border border-surface-200/60 dark:border-surface-700/60">↑↓</kbd> navigieren</span>
          <span className="flex items-center gap-1"><kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded text-[10px] font-medium bg-surface-100 dark:bg-surface-800/80 border border-surface-200/60 dark:border-surface-700/60">↵</kbd> wählen</span>
          <span className="flex items-center gap-1"><kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded text-[10px] font-medium bg-surface-100 dark:bg-surface-800/80 border border-surface-200/60 dark:border-surface-700/60">esc</kbd> schließen</span>
        </div>
      </div>
    </div>
  );
}
