/** Closed, coarse attribution. Raw inputs are classified locally and never persisted. */
export const sources = ['google', 'bing', 'other_search', 'social', 'referring_website', 'unknown'] as const;
export const entries = ['homepage', 'school_page', 'status', 'shared_link', 'other'] as const;
// Only links controlled by LANIS may use this vocabulary. Do not add school/person identifiers.
export const campaigns = ['school_directory', 'community', 'release_notes'] as const;
export const campaignSources = ['lanis', 'community'] as const;
export const campaignMedia = ['link', 'social'] as const;
type Touch = { source: string; entry: string; campaign?: string; campaign_source?: string; campaign_medium?: string };
const FIRST = 'lanis_analytics_first_v1';
const SESSION = 'lanis_analytics_session_v1';
const IDLE = 30 * 60 * 1000;
let current: Touch | undefined;
let boundary = false;

export function classifyArrival(href: string, referrer: string): Touch {
  const touch: Touch = { source: 'unknown', entry: 'other' };
  try {
    const url = new URL(href);
    touch.entry = url.pathname === '/' ? 'homepage' : /^\/schule\/[^/]+\/?$/.test(url.pathname) || url.pathname === '/schulen' ? 'school_page' : url.pathname === '/status' ? 'status' : 'other';
    // Only a complete accepted tuple is tagged. Arbitrary/duplicate UTM values are ignored.
    const campaign = url.searchParams.get('utm_campaign') || '';
    const source = url.searchParams.get('utm_source') || '';
    const medium = url.searchParams.get('utm_medium') || '';
    if (campaigns.includes(campaign as typeof campaigns[number]) && campaignSources.includes(source as typeof campaignSources[number]) && campaignMedia.includes(medium as typeof campaignMedia[number])
      && ['utm_campaign', 'utm_source', 'utm_medium'].every(key => url.searchParams.getAll(key).length === 1)) {
      touch.campaign = campaign; touch.campaign_source = source; touch.campaign_medium = medium;
      touch.entry = 'shared_link';
    }
    if (referrer) {
      const ref = new URL(referrer);
      if (!['http:', 'https:'].includes(ref.protocol) || ref.origin === url.origin) return touch;
      const host = ref.hostname.toLowerCase();
      const matches = (domains: string[]) => domains.some(domain => host === domain || host.endsWith('.' + domain));
      touch.source = matches(['google.com', 'google.de', 'google.co.uk']) ? 'google'
        : matches(['bing.com']) ? 'bing'
        : matches(['duckduckgo.com', 'search.yahoo.com', 'ecosia.org', 'search.brave.com', 'startpage.com']) ? 'other_search'
        : matches(['facebook.com', 'instagram.com', 'reddit.com', 't.co', 'x.com', 'linkedin.com', 'youtube.com', 'mastodon.social']) ? 'social' : 'referring_website';
    }
  } catch { /* Missing/invalid input remains unknown. */ }
  return touch;
}
function validTouch(value: unknown): value is Touch {
  if (!value || typeof value !== 'object') return false;
  const v = value as Touch;
  return sources.includes(v.source as typeof sources[number]) && entries.includes(v.entry as typeof entries[number])
    && (v.campaign === undefined || campaigns.includes(v.campaign as typeof campaigns[number]))
    && (v.campaign_source === undefined || campaignSources.includes(v.campaign_source as typeof campaignSources[number]))
    && (v.campaign_medium === undefined || campaignMedia.includes(v.campaign_medium as typeof campaignMedia[number]));
}
function copyTouch(v: Touch): Touch {
  return { source: v.source, entry: v.entry, ...(v.campaign ? { campaign: v.campaign } : {}), ...(v.campaign_source ? { campaign_source: v.campaign_source } : {}), ...(v.campaign_medium ? { campaign_medium: v.campaign_medium } : {}) };
}
/** Called exclusively behind the client's consent/demo/production gate. */
export function attributionProperties(): Record<string, string> {
  try {
    const now = Date.now();
    const session = JSON.parse(sessionStorage.getItem(SESSION) || 'null');
    if (!current) {
      current = session && validTouch(session.touch) && typeof session.at === 'number' && now >= session.at && now - session.at < IDLE
        ? copyTouch(session.touch) : boundary ? { source: 'unknown', entry: 'other' } : classifyArrival(window.location.href, document.referrer);
    } else if (session && now - session.at >= IDLE) current = { source: 'unknown', entry: 'other' };
    const storedFirst = JSON.parse(localStorage.getItem(FIRST) || 'null');
    const first = validTouch(storedFirst) ? copyTouch(storedFirst) : current;
    localStorage.setItem(FIRST, JSON.stringify(first));
    sessionStorage.setItem(SESSION, JSON.stringify({ touch: current, at: now }));
    return Object.fromEntries([['first', first], ['session', current]].flatMap(([prefix, touch]) => Object.entries(touch).map(([key, value]) => [`${prefix}_${key}`, value]))) as Record<string, string>;
  } catch { return {}; } // Storage unavailable: no attribution; never interrupt the app.
}
export function clearAttribution(): void {
  current = undefined;
  boundary = true; // Do not reattribute the next account to the previous document arrival.
  try { localStorage.removeItem(FIRST); sessionStorage.removeItem(SESSION); } catch { /* Best effort. */ }
}
