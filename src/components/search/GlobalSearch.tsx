import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { messagesAPI, calendarAPI, coursesAPI, appsAPI } from '../../services/api';
import {
  MagnifyingGlassIcon,
  HomeIcon,
  ChatBubbleLeftRightIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  UserIcon,
  Cog6ToothIcon,
  ClipboardDocumentListIcon,
  ArrowRightIcon,
  ArrowPathIcon,
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
  Profil: UserIcon,
  Einstellungen: Cog6ToothIcon,
  Nutzer: UserIcon,
  Suche: MagnifyingGlassIcon,
};

function fuzzyMatch(query: string, text: string): boolean {
  if (!query || !text) return false;
  return text.toLowerCase().includes(query.toLowerCase().trim());
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

// ── Tier 1: cache search ──────────────────────────────────────────

function searchCacheData(query: string): SearchItem[] {
  if (!query || query.length < 1) return [];
  const results: SearchItem[] = [];

  try {
    const raw = localStorage.getItem('messages_cache');
    if (raw) {
      const msgs = JSON.parse(raw);
      if (Array.isArray(msgs)) {
        for (const m of msgs) {
          if (searchText(query, m)) {
            const subj = m.Betreff || '';
            const sender = m.Sender || '';
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
  const deepTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const abortedRef = useRef(false);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tier, setTier] = useState<0 | 1 | 2 | 3>(0); // 0=idle 1=cache 2=api-loading 3=api-done
  const [apiResults, setApiResults] = useState<SearchItem[]>([]);
  const [deepResults, setDeepResults] = useState<SearchItem[]>([]);
  const [isDeepSearching, setIsDeepSearching] = useState(false);

  const cacheResults = useMemo(() => searchCacheData(query), [query]);

  const combinedResults = useMemo(() => {
    const seen = new Set<string>();
    const all: SearchItem[] = [];
    for (const r of [...cacheResults, ...apiResults, ...deepResults]) {
      const key = r.id + r.title;
      if (!seen.has(key)) { seen.add(key); all.push(r); }
    }
    return all;
  }, [cacheResults, apiResults, deepResults]);

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
      setDeepResults([]);
      setTier(0);
      setIsDeepSearching(false);
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
      setDeepResults([]);
      return;
    }
    // cache is always searched synchronously via useMemo
    setApiResults([]);
    setDeepResults([]);
    setTier(cacheResults.length > 0 ? 1 : 1); // cache results already set

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (abortedRef.current || query.length < 1) return;
      setIsDeepSearching(false);
      setTier(2);
      setApiResults([]);
      setDeepResults([]);

      abortedRef.current = false;
      const r: SearchItem[] = [];

      // search recipients
      try {
        const res = await messagesAPI.searchRecipients(token, query);
        if (!abortedRef.current && res.success && res.results) {
          for (const u of res.results) {
            if (abortedRef.current) return;
            r.push({ id: `api-usr-${u.id}`, title: u.name || u.username, subtitle: u.type ? `${u.type}  ${u.username}` : u.username, category: 'Nutzer', icon: UserIcon, href: '/messages' });
          }
        }
      } catch {}

      // calendar events
      try {
        const res = await calendarAPI.getEvents(token, { search: query });
        if (!abortedRef.current && res.success && res.events) {
          for (const e of res.events) {
            if (abortedRef.current) return;
            r.push({ id: `api-ev-${e.id}`, title: e.title, subtitle: e.start ? new Date(e.start).toLocaleDateString('de-DE') : e.category_name || '', category: 'Kalender', icon: CalendarDaysIcon, href: `/calendar?event=${encodeURIComponent(e.id)}` });
          }
        }
      } catch {}

      // courses
      try {
        const res = await coursesAPI.getCourses(token);
        if (!abortedRef.current && res.success && res.entries) {
          for (const e of res.entries) {
            if (abortedRef.current) return;
            if (fuzzyMatch(query, e.name) || fuzzyMatch(query, e.thema || '') || fuzzyMatch(query, e.teacher_full_name || '') || fuzzyMatch(query, e.teacher_short || '')) {
              r.push({ id: `api-crs-${e.entry_id || e.book_id}`, title: e.name, subtitle: e.teacher_full_name || e.teacher_short || e.thema || '', category: 'Unterricht', icon: AcademicCapIcon, href: e.course_link ? `/courses/${e.book_id}` : '/courses' });
            }
          }
        }
      } catch {}

      // modules
      try {
        const res = await appsAPI.getModules(token);
        if (!abortedRef.current && res.success && res.modules) {
          for (const m of res.modules) {
            if (abortedRef.current) return;
            if (fuzzyMatch(query, m.name) || fuzzyMatch(query, m.url) || (m.folders && m.folders.some((f: string) => fuzzyMatch(query, f)))) {
              r.push({ id: `api-mod-${m.url}`, title: m.name, subtitle: m.url || 'Modul', category: 'Module', icon: HomeIcon, href: '/dashboard' });
            }
          }
        }
      } catch {}

      if (!abortedRef.current) {
        setApiResults(r);
        setTier(3);
        // at this point totalResults = cacheResults + apiResults
      }
    }, 400);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, token]);

  // ── Tier 3: deep search (auto when tier-2 yields nothing) ────────

  const totalBeforeDeep = cacheResults.length + apiResults.length;

  useEffect(() => {
    if (tier !== 3 || !token || query.length < 1) return;
    if (totalBeforeDeep >= 3) return; // enough results, don't go deeper automatically

    if (deepTimerRef.current) clearTimeout(deepTimerRef.current);
    deepTimerRef.current = setTimeout(async () => {
      if (abortedRef.current) return;
      setIsDeepSearching(true);

      const r: SearchItem[] = [];

      // ── search inside message bodies ──
      try {
        const headersRes = await messagesAPI.getMessageHeaders(token, 'All', 0);
        if (!abortedRef.current && headersRes.success && headersRes.conversations) {
          const conversations = headersRes.conversations;
          // load up to 10 conversations in parallel batches of 3
          const batchSize = 3;
          for (let i = 0; i < Math.min(conversations.length, 10); i += batchSize) {
            if (abortedRef.current) return;
            const batch = conversations.slice(i, i + batchSize);
            const batchResults = await Promise.allSettled(
              batch.map(c =>
                messagesAPI.getConversation(token, c.Id || c.Uniquid || c.id, 0)
                  .then(convRes => {
                    if (convRes.success && convRes.messages) {
                      for (const msg of convRes.messages) {
                        if (fuzzyMatch(query, msg.content || '') || fuzzyMatch(query, msg.sender || '')) {
                          return {
                            id: `deep-msg-${msg.id || Math.random()}`,
                            title: msg.sender || 'Nachricht',
                            subtitle: (msg.content || '').slice(0, 120),
                            category: 'Nachrichten',
                            icon: ChatBubbleLeftRightIcon,
                            href: `/messages?conversation=${encodeURIComponent(c.Id || c.Uniquid || c.id)}`,
                          } as SearchItem;
                        }
                      }
                    }
                    return null;
                  })
                  .catch(() => null)
              )
            );
            for (const result of batchResults) {
              if (result.status === 'fulfilled' && result.value) r.push(result.value);
            }
          }
        }
      } catch {}

      // ── search inside course entries (details) ──
      try {
        const coursesRes = await coursesAPI.getCourses(token);
        if (!abortedRef.current && coursesRes.success && coursesRes.entries) {
          const courseIds = [...new Set(coursesRes.entries.map(e => e.book_id).filter(Boolean))];
          const batchSize = 2;
          for (let i = 0; i < Math.min(courseIds.length, 6); i += batchSize) {
            if (abortedRef.current) return;
            const batch = courseIds.slice(i, i + batchSize);
            const batchResults = await Promise.allSettled(
              batch.map(id =>
                coursesAPI.getCourseDetails(token, id as string)
                  .then(detailsRes => {
                    if (detailsRes.success && detailsRes.entries) {
                      for (const entry of detailsRes.entries) {
                        if (fuzzyMatch(query, entry.thema || '') || fuzzyMatch(query, entry.homework || '') || fuzzyMatch(query, entry.content || '')) {
                          return {
                            id: `deep-crs-${entry.entry_id}`,
                            title: entry.thema || 'Eintrag',
                            subtitle: (entry.homework || entry.content || '').slice(0, 120),
                            category: 'Unterricht',
                            icon: AcademicCapIcon,
                            href: `/courses/${id}`,
                          } as SearchItem;
                        }
                      }
                    }
                    return null;
                  })
                  .catch(() => null)
              )
            );
            for (const result of batchResults) {
              if (result.status === 'fulfilled' && result.value) r.push(result.value);
            }
          }
        }
      } catch {}

      if (!abortedRef.current) {
        setDeepResults(r);
        setIsDeepSearching(false);
      }
    }, 600);
    return () => { if (deepTimerRef.current) clearTimeout(deepTimerRef.current); };
  }, [tier, totalBeforeDeep, token, query]);

  // cleanup on unmount
  useEffect(() => {
    return () => { abortedRef.current = true; };
  }, []);

  // ── actions ─────────────────────────────────────────────────────

  const triggerDeepSearch = useCallback(async () => {
    if (!token || query.length < 1 || isDeepSearching) return;
    // manually force deep search even if tier-2 already had results
    abortedRef.current = false;
    setIsDeepSearching(true);

    const r: SearchItem[] = [];

    try {
      const headersRes = await messagesAPI.getMessageHeaders(token, 'All', 0);
      if (!abortedRef.current && headersRes.success && headersRes.conversations) {
        const conversations = headersRes.conversations;
        const batchSize = 3;
        for (let i = 0; i < Math.min(conversations.length, 10); i += batchSize) {
          if (abortedRef.current) return;
          const batch = conversations.slice(i, i + batchSize);
          const batchResults = await Promise.allSettled(
            batch.map(c =>
              messagesAPI.getConversation(token, c.Id || c.Uniquid || c.id, 0)
                .then(convRes => {
                  if (convRes.success && convRes.messages) {
                    for (const msg of convRes.messages) {
                      if (fuzzyMatch(query, msg.content || '') || fuzzyMatch(query, msg.sender || '')) {
                        return {
                          id: `deep-msg-${msg.id || Math.random()}`,
                          title: msg.sender || 'Nachricht',
                          subtitle: (msg.content || '').slice(0, 120),
                          category: 'Nachrichten',
                          icon: ChatBubbleLeftRightIcon,
                          href: '/messages',
                        } as SearchItem;
                      }
                    }
                  }
                  return null;
                })
                .catch(() => null)
            )
          );
          for (const result of batchResults) {
            if (result.status === 'fulfilled' && result.value) r.push(result.value);
          }
        }
      }
    } catch {}

    try {
      const coursesRes = await coursesAPI.getCourses(token);
      if (!abortedRef.current && coursesRes.success && coursesRes.entries) {
        const courseIds = [...new Set(coursesRes.entries.map(e => e.book_id).filter(Boolean))];
        const batchSize = 2;
        for (let i = 0; i < Math.min(courseIds.length, 6); i += batchSize) {
          if (abortedRef.current) return;
          const batch = courseIds.slice(i, i + batchSize);
          const batchResults = await Promise.allSettled(
            batch.map(id =>
              coursesAPI.getCourseDetails(token, id as string)
                .then(detailsRes => {
                  if (detailsRes.success && detailsRes.entries) {
                    for (const entry of detailsRes.entries) {
                      if (fuzzyMatch(query, entry.thema || '') || fuzzyMatch(query, entry.homework || '') || fuzzyMatch(query, entry.content || '')) {
                        return {
                          id: `deep-crs-${entry.entry_id}`,
                          title: entry.thema || 'Eintrag',
                          subtitle: (entry.homework || entry.content || '').slice(0, 120),
                          category: 'Unterricht',
                          icon: AcademicCapIcon,
                          href: '/courses',
                        } as SearchItem;
                      }
                    }
                  }
                  return null;
                })
                .catch(() => null)
            )
          );
          for (const result of batchResults) {
            if (result.status === 'fulfilled' && result.value) r.push(result.value);
          }
        }
      }
    } catch {}

    if (!abortedRef.current) {
      setDeepResults(prev => [...prev, ...r]);
      setIsDeepSearching(false);
    }
  }, [token, query, isDeepSearching]);

  const executeAction = useCallback((item: SearchItem) => {
    onClose();
    if (item.href) navigate(item.href);
    item.action?.();
  }, [onClose, navigate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }

    const flat: (SearchItem & { isAction?: boolean })[] = [];

    // "Tiefer suchen" button if API is done and we're not already deep searching
    if (tier >= 3 && !isDeepSearching && query.length >= 1) {
      flat.push({
        id: 'deep-trigger',
        title: `\u201e${query}\u201c tiefer durchsuchen\u2026`,
        subtitle: 'Durchsucht Nachrichteninhalte und Kursdetails',
        category: 'Suche',
        icon: MagnifyingGlassIcon,
        action: triggerDeepSearch,
        isAction: true,
      });
    }

    for (const r of combinedResults) flat.push(r);

    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(prev => Math.min(prev + 1, flat.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(prev => Math.max(prev - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const sel = flat[selectedIndex];
      if (sel) executeAction(sel);
    }
  }, [onClose, query, combinedResults, selectedIndex, executeAction, tier, isDeepSearching, triggerDeepSearch]);

  if (!isOpen) return null;

  const showDeepTrigger = tier >= 3 && !isDeepSearching && query.length >= 1;
  const hasAny = combinedResults.length > 0;
  const showLoading = tier === 2 || isDeepSearching;
  const showEmpty = tier >= 3 && !isDeepSearching && query.length >= 1 && combinedResults.length === 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] sm:pt-[20vh] px-4">
      <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white dark:bg-surface-900 rounded-2xl shadow-2xl border border-surface-200 dark:border-surface-700 overflow-hidden animate-scale-in">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-100 dark:border-surface-800">
          <MagnifyingGlassIcon className="h-5 w-5 text-surface-400 dark:text-surface-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Suche nach Nachrichten, Kursen, Terminen..."
            className="flex-1 bg-transparent text-surface-900 dark:text-surface-100 text-base placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-surface-400 bg-surface-100 dark:bg-surface-800 dark:text-surface-500 border border-surface-200 dark:border-surface-700">ESC</kbd>
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {query.length === 0 && (
            <div className="py-8 text-center text-sm text-surface-400 dark:text-surface-500">Tippe um die Suche zu starten...</div>
          )}

          {showLoading && (
            <div className="flex items-center gap-3 px-3 py-4 text-sm text-surface-500 dark:text-surface-400">
              <ArrowPathIcon className="h-5 w-5 animate-spin text-primary-500" />
              Suche l\u00e4uft...
            </div>
          )}

          {showEmpty && (
            <div className="py-8 text-center">
              <MagnifyingGlassIcon className="h-8 w-8 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
              <p className="text-sm text-surface-500 dark:text-surface-400">Keine Ergebnisse gefunden</p>
              <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">Versuche einen anderen Suchbegriff</p>
            </div>
          )}

          {groupedResults.map(([category, items]) => {
            const CatIcon = CATEGORY_ICONS[category] || MagnifyingGlassIcon;
            let before = showDeepTrigger ? 1 : 0;
            for (const g of groupedResults) {
              if (g[0] === category) break;
              before += g[1].length;
            }
            return (
              <div key={category} className="mb-1">
                <div className="flex items-center gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
                  <CatIcon className="h-3.5 w-3.5" />
                  {category}
                  <span className="ml-auto text-[10px]">{items.length}</span>
                </div>
                {items.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => executeAction(item)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors text-sm ${
                      before + idx === selectedIndex
                        ? 'bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300'
                        : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
                    }`}
                  >
                    <item.icon className={`h-5 w-5 flex-shrink-0 ${
                      before + idx === selectedIndex ? 'text-primary-500 dark:text-primary-400' : 'text-surface-400 dark:text-surface-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{item.title}</div>
                      <div className="text-xs text-surface-400 dark:text-surface-500 mt-0.5 truncate">{item.subtitle}</div>
                    </div>
                  </button>
                ))}
              </div>
            );
          })}

          {showDeepTrigger && (
            <div className={hasAny ? 'border-t border-surface-100 dark:border-surface-800 mt-1 pt-1' : ''}>
              <button
                onClick={triggerDeepSearch}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-left transition-colors hover:bg-surface-100 dark:hover:bg-surface-800 text-primary-600 dark:text-primary-400 font-medium ${
                  selectedIndex === 0 ? 'bg-primary-50 dark:bg-primary-950' : ''
                }`}
              >
                <MagnifyingGlassIcon className={`h-5 w-5 flex-shrink-0 ${selectedIndex === 0 ? 'text-primary-500 dark:text-primary-400' : ''}`} />
                <div className="flex-1 min-w-0">
                  <div className="truncate">&bdquo;{query}&rdquo; tiefer durchsuchen&hellip;</div>
                  <div className="text-xs text-surface-400 dark:text-surface-500 mt-0.5">Durchsucht Nachrichteninhalte und Kursdetails</div>
                </div>
                <ArrowRightIcon className="h-4 w-4 flex-shrink-0" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 px-5 py-2.5 border-t border-surface-100 dark:border-surface-800 text-[10px] text-surface-400 dark:text-surface-500">
          <span className="flex items-center gap-1"><kbd className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">{'\u2191\u2193'}</kbd> navigieren</span>
          <span className="flex items-center gap-1"><kbd className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">{'\u21b5'}</kbd> ausw\u00e4hlen</span>
          <span className="flex items-center gap-1"><kbd className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">ESC</kbd> schlie\u00dfen</span>
        </div>
      </div>
    </div>
  );
}
