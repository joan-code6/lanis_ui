import { searchText, rankSearchResults, messageSearchData, compactSearchResults } from '../../utils/search';
import { resultCountBucket, searchCategory } from '../../analytics/policy';
import { capture } from '../../analytics/client';
import { readPersonalCache } from '../../utils/accountDataWrites';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI, messagesAPI, calendarAPI, coursesAPI, appsAPI, searchAPI, studyGroupsAPI, timetableAPI, dateiverteilungAPI } from '../../services/api';
import type { SemanticSearchResult } from '../../services/api';
import { readModulesCache } from '../../utils/moduleCache';
import type { CachedModule } from '../../utils/moduleCache';
import { normalizeCourseList } from '../../utils/courseNormalization';
import {
  MagnifyingGlassIcon,
  HomeIcon,
  ChatBubbleLeftRightIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  UserIcon,
  Cog6ToothIcon,
  ClipboardDocumentListIcon,
  FolderIcon,
  DocumentDuplicateIcon,
  ClockIcon,
  UserGroupIcon,
  VideoCameraIcon,
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
  basePath?: string;
  hasNativeDateispeicher?: boolean;
  hasNativeDateiverteilung?: boolean;
  hasNativeSubstitutionPlan?: boolean;
  hasDsbModule?: boolean;
  hasVideokonferenzModule?: boolean;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  cat: string;
}

interface ModuleLinkSource {
  name?: string;
  url?: string;
  direct_url?: string;
}

function moduleInAppHref(
  module: ModuleLinkSource,
  planNavigation: NavigationItem[],
  basePath: string,
): string | undefined {
  const moduleLinks = `${module.url || ''} ${module.direct_url || ''}`.toLowerCase();
  const moduleName = String(module.name || '').toLowerCase();
  const nativePages = [
    ['nachrichten', 'messages'], ['meinunterricht', 'courses'], ['kalender', 'calendar'],
    ['stundenplan', 'timetable'], ['lerngruppen', 'study-groups'],
  ];
  for (const [applet, route] of nativePages) {
    if (moduleLinks.includes(`/${applet}.php`) || moduleName.replace(/\s+/g, '').includes(applet)) {
      return `${basePath}/${route}`;
    }
  }
  const isDateispeicher = moduleName.includes('dateispeicher') || moduleLinks.includes('/dateispeicher.php');
  const isDateiverteilung = moduleName.includes('dateiverteilung') || moduleLinks.includes('/dateiverteilung.php');
  const isVideokonferenz = moduleName.includes('videokonferenz') || moduleLinks.includes('/videokonferenz.php');
  const isWahlen = moduleName.includes('wahlen') || moduleLinks.includes('/oberstufenwahl.php');
  const isDsbModule = moduleName.includes('dsb') || moduleLinks.includes('dsb');
  const isNativeSubstitutionPlan = !isDsbModule && (
    moduleLinks.includes('/vertretungsplan.php') || moduleName.includes('vertretungsplan')
  );
  const nativePlanHref = planNavigation.find(item => item.href.endsWith('/vertretungsplan'))?.href;
  const dsbHref = planNavigation.find(item => item.href.endsWith('/dsb'))?.href;
  const dateispeicherHref = planNavigation.find(item => item.href.endsWith('/dateispeicher'))?.href;
  const dateiverteilungHref = planNavigation.find(item => item.href.endsWith('/dateiverteilung'))?.href;
  const wahlenHref = `${basePath}/wahlen`;
  return (isDateispeicher && (dateispeicherHref || `${basePath}/dateispeicher`))
    || (isDateiverteilung && (dateiverteilungHref || `${basePath}/dateiverteilung`))
    || (isVideokonferenz && `${basePath}/videokonferenz`)
    || (isWahlen && wahlenHref)
    || (isNativeSubstitutionPlan && (nativePlanHref || `${basePath}/vertretungsplan`))
    || (isDsbModule && (dsbHref || `${basePath}/dsb`))
    || undefined;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Dashboard: HomeIcon,
  Nachrichten: ChatBubbleLeftRightIcon,
  Unterricht: AcademicCapIcon,
  Kalender: CalendarDaysIcon,
  Module: HomeIcon,
  Dateiverteilung: DocumentDuplicateIcon,
  Vertretungsplan: ClipboardDocumentListIcon,
  Stundenplan: ClockIcon,
  Lerngruppen: UserGroupIcon,
  Profil: UserIcon,
  Einstellungen: Cog6ToothIcon,
  Nutzer: UserIcon,
  Suche: MagnifyingGlassIcon,
};

function htmlToText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return new DOMParser().parseFromString(value, 'text/html').body.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function readSenderNames(basePath: string): Record<string, string> {
  if (basePath === '/demo') return {};
  try {
    const parsed = JSON.parse(readPersonalCache('username_cache') || '{}');
    const data = parsed?.data || parsed;
    return Object.fromEntries(Object.entries(data).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
  } catch { return {}; }
}

// ── Tier 1: cache search ──────────────────────────────────────────

function searchCacheData(
  query: string,
  planNavigation: NavigationItem[],
  basePath: string,
  cachedModules: CachedModule[],
): SearchItem[] {
  if (!query || query.length < 1) return [];
  const results: SearchItem[] = [];
  const senderNames = readSenderNames(basePath);

  try {
    const raw = basePath === '/demo' ? null : readPersonalCache('messages_cache_v2');
    if (raw) {
      const msgs = JSON.parse(raw);
      if (Array.isArray(msgs)) {
        for (const m of msgs) {
          const fields = messageSearchData(m, senderNames);
          if (searchText(query, fields)) {
            const subj = htmlToText(fields.subject);
            const sender = htmlToText(fields.sender);
            const empf = Array.isArray(m.empf) ? m.empf.join(', ') : '';
            let sub = sender ? `Von: ${sender}` : '';
            if (empf) sub += sub ? `  An: ${empf}` : `An: ${empf}`;
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
    const raw = basePath === '/demo' ? null : readPersonalCache('courses_cache');
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

  for (const module of cachedModules) {
    if (searchText(query, module)) {
      results.push({
        id: `mod-${module.url || module.name}`,
        title: module.name,
        subtitle: module.folders?.join(' · ') || 'Modul',
        category: 'Module',
        icon: HomeIcon,
        href: moduleInAppHref(module, planNavigation, basePath) || '/dashboard',
      });
    }
  }

  try {
    const raw = basePath === '/demo' ? null : readPersonalCache('dsb_plan_cache_v2');
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
    const raw = basePath === '/demo' ? null : readPersonalCache('username_cache');
    if (raw) {
      const p = JSON.parse(raw);
      const data = p?.data || p;
      for (const [k, v] of Object.entries(data)) {
        if (k === 'ts' || typeof v !== 'string') continue;
        if (searchText(query, [/^\d+$/.test(k) ? '' : k, v])) {
          results.push({
            id: `user-${k}`,
            title: (v as string) || k,
            subtitle: /^\d+$/.test(k) ? 'Nutzer' : `Username: ${k}`,
            category: 'Nutzer',
            icon: UserIcon,
            href: '/messages',
          });
        }
      }
    }
  } catch {}

  try {
    const raw = basePath === '/demo' ? null : readPersonalCache('profile_cache');
    if (raw) {
      const profile = JSON.parse(raw);
      if (searchText(query, profile)) {
        const fv = typeof profile === 'object' ? Object.values(profile)[0] : '';
        results.push({
          id: 'profile',
          title: 'Dein Profil',
          subtitle: typeof fv === 'string' && !/^\d+$/.test(fv) ? fv : 'Profildaten',
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
    ...planNavigation,
    { name: 'Profil', href: '/profile', icon: UserIcon, cat: 'Profil' },
    { name: 'Einstellungen', href: '/settings', icon: Cog6ToothIcon, cat: 'Einstellungen' },
  ];
  for (const n of nav) {
    if (searchText(query, n.name)) {
      results.push({ id: `nav-${n.name}`, title: n.name, subtitle: 'Seite', category: n.cat, icon: n.icon, href: n.href });
    }
  }

  return results;
}

export default function GlobalSearch({
  isOpen,
  onClose,
  basePath = '',
  hasNativeDateispeicher = false,
  hasNativeDateiverteilung = false,
  hasNativeSubstitutionPlan = false,
  hasDsbModule = false,
  hasVideokonferenzModule = false,
}: GlobalSearchProps) {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const abortedRef = useRef(false);
  const senderNamesRef = useRef<Record<string, string>>({});

  const [input, setQuery] = useState('');
  const query = input.trim().replace(/\s+/g, ' ');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tier, setTier] = useState<0 | 1 | 2 | 3>(0);
  const [apiResults, setApiResults] = useState<SearchItem[]>([]);
  const [semanticResults, setSemanticResults] = useState<SearchItem[]>([]);
  const [semanticLoading, setSemanticLoading] = useState(false);
  const [relatedQuery, setRelatedQuery] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const planNavigation = useMemo<NavigationItem[]>(() => {
    const moduleItems: NavigationItem[] = [
      ...(hasNativeDateispeicher ? [{ name: 'Dateispeicher', href: `${basePath}/dateispeicher`, icon: FolderIcon, cat: 'Module' }] : []),
      ...(hasNativeDateiverteilung ? [{ name: 'Dateiverteilung', href: `${basePath}/dateiverteilung`, icon: DocumentDuplicateIcon, cat: 'Module' }] : []),
    ];
    if (hasVideokonferenzModule) {
      moduleItems.push({ name: 'Videokonferenz', href: `${basePath}/videokonferenz`, icon: VideoCameraIcon, cat: 'Module' });
    }
    if (hasNativeSubstitutionPlan) {
      return [
        ...moduleItems,
        { name: 'Vertretungsplan', href: `${basePath}/vertretungsplan`, icon: ClipboardDocumentListIcon, cat: 'Vertretungsplan' },
        ...(hasDsbModule ? [{ name: 'DSBmobile', href: `${basePath}/dsb`, icon: ClipboardDocumentListIcon, cat: 'Vertretungsplan' }] : []),
      ];
    }
    return hasDsbModule
      ? [...moduleItems, { name: 'Vertretungsplan', href: `${basePath}/dsb`, icon: ClipboardDocumentListIcon, cat: 'Vertretungsplan' }]
      : moduleItems;
  }, [basePath, hasDsbModule, hasNativeDateispeicher, hasNativeDateiverteilung, hasNativeSubstitutionPlan, hasVideokonferenzModule]);

  const cachedModules = useMemo(
    () => basePath === '/demo' || !isOpen ? [] : readModulesCache(user),
    [basePath, user, isOpen],
  );
  const cacheResults = useMemo(
    () => searchCacheData(query, planNavigation, basePath, cachedModules),
    [basePath, cachedModules, planNavigation, query],
  );

  const combinedResults = useMemo(
    () => rankSearchResults(query, [...apiResults, ...cacheResults], semanticResults),
    [query, cacheResults, apiResults, semanticResults],
  );

  const visibleResults = useMemo(() => compactSearchResults(combinedResults, expanded), [combinedResults, expanded]);

  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchItem[]> = {};
    for (const item of visibleResults) {
      (groups[item.category] ??= []).push(item);
    }
    return Object.entries(groups);
  }, [visibleResults]);

  // Keyboard navigation must use the same order as the category groups on screen.
  const displayedResults = useMemo(() => groupedResults.flatMap(([, items]) => items), [groupedResults]);
  useEffect(() => {
    setSelectedIndex(index => Math.min(index, Math.max(0, displayedResults.length - 1)));
  }, [displayedResults.length]);
  useEffect(() => {
    if (isOpen) listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, selectedIndex]);

  // reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setRelatedQuery(null);
      setExpanded(false);
      setSelectedIndex(0);
      setApiResults([]);
      setSemanticResults([]);
      setTier(0);
      abortedRef.current = false;
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
    setExpanded(false);
    setRelatedQuery(null);
  }, [query]);

  // ── Tier 2: auto API search (debounced) ─────────────────────────

  useEffect(() => {
    if (!isOpen || !token || query.length < 1) {
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

      const recipientRequest = messagesAPI.searchRecipients(token, query, controller.signal);
      const senderNames = readSenderNames(basePath);
      senderNamesRef.current = senderNames;
      const tasks: Array<Promise<SearchItem[]>> = [
        recipientRequest.then(res =>
          !res.success ? [] : res.results.filter(user => searchText(query, [user.name, user.username])).map(user => ({
            id: `api-usr-${user.id}`,
            title: user.name || user.username,
            subtitle: user.type ? `${user.type} · ${user.username}` : user.username,
            category: 'Nutzer', icon: UserIcon,
            href: `/messages?compose=1&recipient=${encodeURIComponent(user.id)}&recipientName=${encodeURIComponent(user.name || user.username)}&recipientUsername=${encodeURIComponent(user.username || '')}`,
          }))),
        Promise.all([
          messagesAPI.getMessageHeaders(token, 'All', 0, controller.signal),
          recipientRequest.catch(() => null),
        ]).then(([res, recipients]) => {
          const senderUsernames: Record<string, string> = {};
          for (const person of recipients?.success ? recipients.results : []) {
            senderUsernames[person.id] = person.username;
            const name = person.name || person.username;
            if (name) { senderNames[person.id] = name; senderNames[person.username] = name; }
          }
          if (!res.success) return [];
          return res.conversations.flatMap(message => {
            const fields = messageSearchData(message, senderNames, senderUsernames);
            if (!searchText(query, fields)) return [];
            return [{
              id: `api-msg-${message.Uniquid || message.Id}`,
              title: htmlToText(fields.subject) || 'Kein Betreff',
              subtitle: htmlToText(fields.sender) ? `Von: ${htmlToText(fields.sender)}` : 'Nachricht · Absender unbekannt',
              category: 'Nachrichten', icon: ChatBubbleLeftRightIcon,
              href: `/messages?conversation=${encodeURIComponent(message.Uniquid || message.Id)}`,
            }];
          });
        }),
        calendarAPI.getEvents(token, {}, controller.signal).then(res =>
          !res.success ? [] : res.events.filter(event => searchText(query, event)).map(event => ({
            id: `api-ev-${event.id}`, title: event.title,
            subtitle: event.start ? new Date(event.start).toLocaleDateString('de-DE') : event.category_name || '',
            category: 'Kalender', icon: CalendarDaysIcon,
            href: `/calendar?event=${encodeURIComponent(event.id)}`,
          }))),
        coursesAPI.getCourses(token, controller.signal).then(res =>
          !res.success ? [] : normalizeCourseList(res).filter(entry => searchText(query, entry)).map(entry => ({
            id: `api-crs-${entry.entry_id || entry.book_id}`, title: entry.name,
            subtitle: entry.teacher_full_name || entry.teacher_short || entry.thema || '',
            category: 'Unterricht', icon: AcademicCapIcon, href: `/courses/${entry.book_id}`,
          }))),
        appsAPI.getModules(token, controller.signal).then(res =>
          !res.success ? [] : res.modules.filter(module => searchText(query, module)).map(module => ({
            id: `api-mod-${module.url}`, title: module.name, subtitle: module.folders?.join(' · ') || 'Modul',
            category: 'Module', icon: HomeIcon, href: moduleInAppHref(module, planNavigation, basePath) || '/dashboard',
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
        ...(hasNativeDateiverteilung ? [dateiverteilungAPI.getOverview(token, false, controller.signal).then(res => (
          !res.success ? [] : res.distributions.filter(distribution => searchText(query, distribution)).map(distribution => ({
            id: `api-distribution-${distribution.id}`,
            title: distribution.title,
            subtitle: [distribution.source, distribution.created_at].filter(Boolean).join(' · '),
            category: 'Dateiverteilung',
            icon: DocumentDuplicateIcon,
            href: `${basePath}/dateiverteilung`,
          }))
        ))] : []),
        authAPI.getUserProfile(token, controller.signal).then(res => {
          if (!res.success || !searchText(query, res.data)) return [];
          return [{ id: 'api-profile', title: 'Dein Profil', subtitle: 'Profildaten', category: 'Profil', icon: UserIcon, href: '/profile' }];
        }),
      ];

      await Promise.allSettled(tasks.map(async task => {
        const results = await task;
        if (!abortedRef.current && !controller.signal.aborted) {
          setApiResults(previous => [...previous, ...results]);
        }
      }));

      if (!abortedRef.current && !controller.signal.aborted) {
        setTier(3);
        // at this point totalResults = cacheResults + apiResults
      }
    }, 400);

    return () => {
      controller.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOpen, basePath, hasNativeDateiverteilung, planNavigation, query, token]);

  // ── Related content (requested explicitly) ────────────────────────

  const semanticTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!isOpen || !token || query.length < 3 || relatedQuery !== query) {
      setSemanticResults([]);
      setSemanticLoading(false);
      return;
    }

    setSemanticResults([]);
    setSemanticLoading(true);
    const controller = new AbortController();
    if (semanticTimerRef.current) clearTimeout(semanticTimerRef.current);
    semanticTimerRef.current = setTimeout(async () => {
      if (abortedRef.current) return;
      try {
        const res = await searchAPI.semanticSearch(token, query, 15, controller.signal);
        if (!abortedRef.current && !controller.signal.aborted && res.success && res.results) {
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
            subtitle: r.category === 'Nachrichten' && /^(?:Von:\s*)?\d+$/i.test(r.subtitle.trim())
              ? (senderNamesRef.current[r.subtitle.replace(/\D/g, '')] ? `Von: ${senderNamesRef.current[r.subtitle.replace(/\D/g, '')]}` : 'Nachricht · Absender unbekannt')
              : htmlToText(r.subtitle),
            category: r.category,
            icon: iconMap[r.icon] || MagnifyingGlassIcon,
            href: r.category === 'Module' ? moduleInAppHref({ name: r.title }, planNavigation, basePath) || r.href : r.href,
          }));
          setSemanticResults(mapped);
        }
      } catch {
        // Semantic search is optional — fail silently
      } finally {
        if (!controller.signal.aborted) setSemanticLoading(false);
      }
    }, 600);

    return () => {
      controller.abort();
      if (semanticTimerRef.current) clearTimeout(semanticTimerRef.current);
    };
  }, [isOpen, query, token, planNavigation, basePath, relatedQuery]);

  const wasOpen = useRef(false);
  const reportedSearch = useRef(false);
  const reportSearch = (outcome: 'selected' | 'dismissed') => {
    if (reportedSearch.current || !query.trim()) return;
    reportedSearch.current = true;
    void capture('search_session_completed', {
      outcome, result_count: resultCountBucket(combinedResults.length),
      keyword_state: tier === 3 ? 'complete' : token ? 'pending' : 'not_requested',
    });
  };
  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      reportedSearch.current = false;
      void capture('search_opened');
    } else if (!isOpen && wasOpen.current) reportSearch('dismissed');
    wasOpen.current = isOpen;
  }, [isOpen]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      abortedRef.current = true;
      if (semanticTimerRef.current) clearTimeout(semanticTimerRef.current);
    };
  }, []);

  // ── actions ─────────────────────────────────────────────────────

  const executeAction = useCallback((item: SearchItem) => {
    reportSearch('selected');
    void capture('search_result_selected', { category: searchCategory(item.category) });
    onClose();
    if (item.href) navigate(basePath && !item.href.startsWith(`${basePath}/`) ? `${basePath}${item.href}` : item.href);
    item.action?.();
  }, [onClose, navigate, basePath, query, combinedResults.length, tier, token]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }

    const flat = displayedResults;

    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(prev => Math.max(0, Math.min(prev + 1, flat.length - 1))); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(prev => Math.max(prev - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const sel = flat[selectedIndex];
      if (sel) executeAction(sel);
    }
  }, [onClose, displayedResults, selectedIndex, executeAction]);

  if (!isOpen) return null;

  const showLoading = tier === 1 || tier === 2 || semanticLoading;
  const showEmpty = !showLoading && (!token || tier >= 3) && query.length >= 1 && combinedResults.length === 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] sm:pt-[20vh] px-4">
      <div className="fixed inset-0 bg-surface-950/50 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-xl backdrop-blur-xl bg-white/80 dark:bg-surface-900/80 rounded-2xl shadow-soft-lg border border-white/30 dark:border-surface-700/40 overflow-hidden animate-scale-in" style={{ boxShadow: '0 4px 40px -8px rgba(0, 0, 0, 0.12), 0 12px 50px -12px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.5)' }}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-100/80 dark:border-surface-800/60">
          <MagnifyingGlassIcon className="h-5 w-5 text-primary-500 dark:text-primary-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-label="LANIS durchsuchen"
            aria-expanded="true"
            aria-controls="global-search-results"
            aria-activedescendant={displayedResults[selectedIndex] ? `global-search-result-${selectedIndex}` : undefined}
            autoComplete="off"
            value={input}
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

          {showLoading && combinedResults.length === 0 && (
            <div role="status" aria-busy="true" aria-label="Suchergebnisse werden geladen">
              {[0, 1, 2].map(i => <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5" aria-hidden="true"><div className="skeleton h-8 w-8 shrink-0 rounded-lg" /><div className="min-w-0 flex-1"><div className="skeleton h-5 w-3/4" /><div className="skeleton mt-1 h-4 w-1/2" /></div></div>)}
            </div>
          )}

          {showLoading && combinedResults.length > 0 && (
            <p role="status" className="px-3 py-2 text-xs text-surface-500">Weitere Ergebnisse werden gesucht…</p>
          )}

          {showEmpty && (
            <div className="py-12 text-center">
              <MagnifyingGlassIcon className="h-8 w-8 text-surface-300 dark:text-surface-600 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium text-surface-500 dark:text-surface-400">Keine Ergebnisse</p>
              <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">Versuche einen anderen Suchbegriff</p>
            </div>
          )}

          <div id="global-search-results" role="listbox" aria-label="Suchergebnisse">
            {groupedResults.map(([category, items], groupIndex) => {
              const CatIcon = CATEGORY_ICONS[category] || MagnifyingGlassIcon;
              let before = 0;
              for (const g of groupedResults) {
                if (g[0] === category) break;
                before += g[1].length;
              }
              return (
                <div key={category} role="group" aria-labelledby={`global-search-category-${groupIndex}`} className="mb-1">
                  <div id={`global-search-category-${groupIndex}`} className="flex items-center gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
                    <CatIcon className="h-3.5 w-3.5 text-primary-500 dark:text-primary-400" />
                    {category}
                    <span className="ml-auto text-[10px] opacity-60">{items.length}</span>
                  </div>
                  {items.map((item, idx) => (
                    <button
                      key={item.id}
                      id={`global-search-result-${before + idx}`}
                      role="option"
                      tabIndex={-1}
                      aria-selected={before + idx === selectedIndex}
                      onMouseEnter={() => setSelectedIndex(before + idx)}
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

        </div>

        {query && (combinedResults.length > visibleResults.length || (token && query.length >= 3)) && (
          <div className="flex flex-wrap items-center justify-center gap-3 px-4 py-2 border-t border-surface-100/80 dark:border-surface-800/60">
            {combinedResults.length > visibleResults.length && !expanded && (
              <button type="button" onClick={() => setExpanded(true)} className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
                Weitere Treffer anzeigen
              </button>
            )}
            {token && query.length >= 3 && relatedQuery !== query && (
              <button type="button" onClick={() => setRelatedQuery(query)} className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
                Ähnliche Inhalte suchen
              </button>
            )}
            {relatedQuery === query && !semanticLoading && (
              <span role="status" className="text-xs text-surface-500">Suche nach ähnlichen Inhalten abgeschlossen</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-center gap-4 px-5 py-2 border-t border-surface-100/80 dark:border-surface-800/60 text-[11px] text-surface-400 dark:text-surface-500">
          <span className="flex items-center gap-1"><kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded text-[10px] font-medium bg-surface-100 dark:bg-surface-800/80 border border-surface-200/60 dark:border-surface-700/60">↑↓</kbd> navigieren</span>
          <span className="flex items-center gap-1"><kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded text-[10px] font-medium bg-surface-100 dark:bg-surface-800/80 border border-surface-200/60 dark:border-surface-700/60">↵</kbd> wählen</span>
          <span className="flex items-center gap-1"><kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded text-[10px] font-medium bg-surface-100 dark:bg-surface-800/80 border border-surface-200/60 dark:border-surface-700/60">esc</kbd> schließen</span>
        </div>
      </div>
    </div>
  );
}
