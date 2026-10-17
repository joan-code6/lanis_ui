import { useEffect, useState } from 'react';
import SEO from '../seo/SEO';
import { DEFAULT_API_BASE_URL } from '../../utils/backendConfig';
import { fetchDirectory, parseDirectory, schoolPath, type SchoolListItem } from './schoolData';

function bootstrap(): SchoolListItem[] {
  if (typeof document === 'undefined') return [];
  try {
    const text = document.getElementById('school-directory-data')?.textContent;
    return text ? parseDirectory(JSON.parse(text)) : [];
  } catch { return []; }
}

export default function SchoolDirectoryPage({ initialSchools }: { initialSchools?: SchoolListItem[] }) {
  const [schools, setSchools] = useState(initialSchools ?? bootstrap);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (schools.length) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    let active = true;
    setError(false);
    fetchDirectory(DEFAULT_API_BASE_URL, controller.signal).then((value) => {
      if (active) setSchools(value);
    }).catch(() => { if (active) setError(true); })
      .finally(() => window.clearTimeout(timeout));
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); };
  }, [schools.length, revision]);
  return <main className="mx-auto max-w-5xl px-6 py-12">
    <SEO title="Schulen im Schulportal Hessen" description="Finde deine Schule im Schulportal Hessen und öffne ihre Lanis-Seite für Login, Stundenplan und Vertretungsplan." path="/schulen" />
    <a href="/" className="text-primary-600">Lanis</a>
    <h1 className="mt-8 text-3xl font-bold">Schulen im Schulportal Hessen</h1>
    <p className="mt-3">Wähle deine Schule, um ihre Schulportal-Seite mit Lanis zu öffnen.</p>
    {error && <p role="alert" className="mt-6">Das Schulverzeichnis ist gerade nicht erreichbar. <button className="underline" onClick={() => setRevision((value) => value + 1)}>Erneut versuchen</button></p>}
    {!schools.length && !error && <p role="status" className="mt-6">Schulen werden geladen…</p>}
    <ul className="mt-8 grid gap-3 sm:grid-cols-2">
      {schools.map((school) => <li key={school.school_id}>
        <a className="block rounded-xl border border-surface-200 p-4 hover:border-primary-500 dark:border-surface-700" href={schoolPath(school.school_id)}>
          <strong>{school.name}</strong><span className="mt-1 block text-sm text-surface-500">{school.city}</span>
        </a>
      </li>)}
    </ul>
  </main>;
}
