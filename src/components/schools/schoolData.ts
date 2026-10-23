export interface SchoolListItem { school_id: string; name: string; city: string }
export interface SchoolProfile extends SchoolListItem {
  palette: { primary: string | null };
  assets: { logo: string | null; campus: Record<'xs' | 'sm' | 'md' | 'lg', string | null> };
}

export const schoolPath = (id: string) => `/schule/${id}`;
export const isSchoolId = (value: string) => /^[0-9]{1,10}$/.test(value);

export function parseDirectory(value: unknown): SchoolListItem[] {
  const payload = value as { success?: boolean; schools?: SchoolListItem[] };
  if (!payload?.success || !Array.isArray(payload.schools) || !payload.schools.length || payload.schools.length > 10000) {
    throw new Error('Invalid school directory');
  }
  const ids = new Set<string>();
  return payload.schools.map((school) => {
    if (!school || typeof school.school_id !== 'string' || !isSchoolId(school.school_id)
      || ids.has(school.school_id) || typeof school.name !== 'string' || !school.name.trim()
      || school.name.length > 500 || typeof school.city !== 'string' || school.city.length > 500) {
      throw new Error('Invalid school directory entry');
    }
    ids.add(school.school_id);
    return { school_id: school.school_id, name: school.name.trim(), city: school.city.trim() };
  }).sort((a, b) => a.name.localeCompare(b.name, 'de') || a.city.localeCompare(b.city, 'de') || a.school_id.localeCompare(b.school_id, 'en'));
}

export function parseProfile(value: unknown, id: string, apiBase: string): SchoolProfile {
  const school = value as SchoolProfile;
  if (!isSchoolId(id) || school?.school_id !== id || typeof school.name !== 'string'
    || !school.name.trim() || school.name.length > 500 || typeof school.city !== 'string' || school.city.length > 500) {
    throw new Error('Invalid school profile');
  }
  // Images always go through lanis_api. Never embed an upstream/third-party URL.
  const asset = (value: unknown, suffix: string) => {
    const expected = `${apiBase}/schools/${id}/${suffix}`;
    return value === expected ? expected : null;
  };
  const primary = school.palette?.primary;
  return {
    school_id: id, name: school.name.trim(), city: school.city.trim(),
    palette: { primary: typeof primary === 'string' && /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(primary) ? primary : null },
    assets: {
      logo: asset(school.assets?.logo, 'logo'),
      campus: {
        xs: asset(school.assets?.campus?.xs, 'campus?size=xs'),
        sm: asset(school.assets?.campus?.sm, 'campus?size=sm'),
        md: asset(school.assets?.campus?.md, 'campus?size=md'),
        lg: asset(school.assets?.campus?.lg, 'campus?size=lg'),
      },
    },
  };
}

export const directoryProfile = (school: SchoolListItem): SchoolProfile => ({
  ...school, palette: { primary: null },
  assets: { logo: null, campus: { xs: null, sm: null, md: null, lg: null } },
});

const slugify = (value: string) => value.toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export async function fetchDirectory(apiBase: string, signal: AbortSignal) {
  const response = await fetch(`${apiBase}/schools`, { signal, credentials: 'omit' });
  if (!response.ok) throw new Error('School directory unavailable');
  return parseDirectory(await response.json());
}

export async function loadSchool(value: string, apiBase: string, signal: AbortSignal): Promise<SchoolProfile | null> {
  let id = value;
  if (!isSchoolId(id)) {
    // Keep old POC name URLs working; published canonical URLs use stable IDs.
    const directory = await fetchDirectory(apiBase, signal);
    const matches = directory.filter((school) => slugify(school.name) === value.toLowerCase()
      || slugify(`${school.name} ${school.city}`) === value.toLowerCase());
    if (matches.length !== 1) return null;
    id = matches[0].school_id;
  }
  const response = await fetch(`${apiBase}/schools/${id}/data`, { signal, credentials: 'omit' });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('School profile unavailable');
  const payload = await response.json();
  if (!payload.success) throw new Error('School profile unavailable');
  return parseProfile(payload.school, id, apiBase);
}

export function readSchoolBootstrap(id: string, apiBase: string): SchoolProfile | null {
  if (typeof document === 'undefined') return null;
  try {
    const value = document.getElementById('school-page-data')?.textContent;
    return value ? parseProfile(JSON.parse(value), id, apiBase) : null;
  } catch { return null; }
}
