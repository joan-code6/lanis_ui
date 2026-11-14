/** Shared matching and ordering for local and live global-search results. */
export function normalizeSearchText(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  return String(value).toLocaleLowerCase('de-DE')
    .replace(/ä|ae/g, 'a').replace(/ö|oe/g, 'o').replace(/ü|ue/g, 'u').replace(/ß/g, 'ss')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

// One insertion, deletion, substitution, or swapped pair; short queries stay exact.
function isNearWord(query: string, word: string): boolean {
  if (query.length < 5 || /\d/.test(query + word) || Math.abs(query.length - word.length) > 1) return false;
  let index = 0;
  while (index < query.length && query[index] === word[index]) index++;
  if (query.length === word.length) {
    return query.slice(index + 1) === word.slice(index + 1)
      || (query[index] === word[index + 1] && query[index + 1] === word[index]
        && query.slice(index + 2) === word.slice(index + 2));
  }
  return query.length > word.length
    ? query.slice(index + 1) === word.slice(index)
    : query.slice(index) === word.slice(index + 1);
}

export function searchScore(query: string, value: unknown): number {
  const needle = normalizeSearchText(query);
  const text = normalizeSearchText(value);
  if (!needle || !text) return 0;
  if (needle === text) return 100;
  if (text.startsWith(needle)) return 90;
  if (text.includes(needle)) return 80;
  const words = text.split(' ');
  let score = 70;
  for (const token of needle.split(' ')) {
    if (words.some(word => word.includes(token))) continue;
    if (!words.some(word => isNearWord(token, word))) return 0;
    score = 40;
  }
  return score;
}

function collectTexts(value: unknown, depth = 0): string {
  if (depth > 4 || value == null) return '';
  if (typeof value === 'string') return value.replace(/<[^>]*>/g, ' ');
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(item => collectTexts(item, depth + 1)).join(' ');
  if (typeof value === 'object') return Object.entries(value)
    .filter(([key]) => !/^(id|uniquid|url|direct_url|href|logo|color|token|ts|timestamp|private|papierkorb|unread|read)$/i.test(key) && !/(?:_id|Id)$/.test(key))
    .map(([, item]) => collectTexts(item, depth + 1)).join(' ');
  return '';
}

export function searchText(query: string, value: unknown): boolean {
  return searchScore(query, collectTexts(value)) > 0;
}

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  href?: string;
}

export function rankSearchResults<T extends SearchResult>(query: string, keyword: T[], semantic: T[]): T[] {
  const seen = new Set<string>();
  const unique = (items: T[]) => items.filter(item => {
    // Sources use different ID prefixes for the same entity. Keep distinct lessons,
    // exams and groups even when they share a page and title.
    const entity = item.id.replace(/^(?:api-|sem-)/, '').replace(/^course-/, 'crs-').replace(/^user-/, 'usr-');
    const key = /^(?:msg-|crs-)/.test(entity) || entity === 'profile'
      ? `${item.category}:${item.href}`
      : entity.startsWith('mod-')
        ? `${item.category}:${item.href}:${normalizeSearchText(item.title)}`
        : `${item.category}:${entity}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const ranked = unique(keyword).sort((a, b) => {
    const score = (item: T) => searchScore(query, item.title) * 100 + searchScore(query, item.subtitle);
    return score(b) - score(a);
  });
  return [...ranked, ...unique(semantic)].slice(0, 60);
}

/** Resolve the sender without exposing internal numeric identifiers as names. */
export function messageSearchData(message: Record<string, unknown>, names: Record<string, string> = {}, usernames: Record<string, string> = {}) {
  const readable = (value: unknown): string => {
    const text = typeof value === 'string' ? value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').trim() : '';
    return /^\d+$/.test(text) ? '' : text;
  };
  const identifiers = [message.SenderId, message.Sender, message.sender, message.SenderName];
  const sender = identifiers.map(id => readable(names[String(id)])).find(Boolean)
    || readable(message.SenderName) || readable(message.sender) || readable(message.Sender);
  return {
    subject: typeof message.Betreff === 'string' ? message.Betreff : '',
    sender,
    username: identifiers.map(id => usernames[String(id)]).find(Boolean) || readable(message.Sender) || readable(message.sender),
    recipients: [message.empf, message.WeitereEmpfaenger].flat().map(readable).filter(Boolean),
    content: message.content || message.Inhalt || '',
  };
}

/** Keep the initial list small and prevent one source from filling the dialog. */
export function compactSearchResults<T extends SearchResult>(items: T[], expanded = false): T[] {
  if (expanded) return items.slice(0, 30);
  const counts = new Map<string, number>();
  return items.filter(item => {
    const count = counts.get(item.category) || 0;
    counts.set(item.category, count + 1);
    return count < 3;
  }).slice(0, 8);
}
