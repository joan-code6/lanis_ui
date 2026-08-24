import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  LinkIcon,
  PencilSquareIcon,
  ArrowUturnLeftIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { settingsAPI } from '../../services/api';
import { ClassLink } from '../../types';

const portalUrl = (url: string) => {
  const clean = url.trim();
  if (!clean) return '';
  if (/^https?:\/\//i.test(clean)) return clean;
  return `https://start.schulportal.hessen.de/${clean.replace(/^\//, '')}`;
};

const ClassLinksSettings: React.FC = () => {
  const { token } = useAuth();
  const [links, setLinks] = useState<ClassLink[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async (signal?: AbortSignal) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await settingsAPI.getClassLinks(token, signal);
      if (signal?.aborted) return;
      if (!response.success) throw new Error('Klassenlinks konnten nicht geladen werden.');
      setLinks(response.links || []);
      setDrafts(Object.fromEntries((response.links || []).map(link => [link.course_id, link.url])));
    } catch (loadError) {
      if (axios.isCancel(loadError)) return;
      setError(loadError instanceof Error ? loadError.message : 'Klassenlinks konnten nicht geladen werden.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [token]);

  const save = async (link: ClassLink) => {
    if (!token) return;
    setSavingId(link.course_id);
    setError('');
    setMessage('');
    try {
      const response = await settingsAPI.saveClassLink(token, link.course_id, drafts[link.course_id] || '');
      if (!response.success) throw new Error('Klassenlink konnte nicht gespeichert werden.');
      setLinks(previous => previous.map(item => item.course_id === link.course_id
        ? { ...item, url: drafts[link.course_id] || '', overridden: true }
        : item));
      setMessage(`Link für ${link.name || 'den Kurs'} gespeichert.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Klassenlink konnte nicht gespeichert werden.');
    } finally {
      setSavingId(null);
    }
  };

  const reset = async (link: ClassLink) => {
    if (!token || !link.overridden) return;
    setSavingId(link.course_id);
    setError('');
    setMessage('');
    try {
      const response = await settingsAPI.deleteClassLink(token, link.course_id);
      if (!response.success) throw new Error('Eigener Klassenlink konnte nicht entfernt werden.');
      setMessage(`Portal-Link für ${link.name || 'den Kurs'} wiederhergestellt.`);
      await load();
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Eigener Klassenlink konnte nicht entfernt werden.');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="card flex min-h-64 items-center justify-center">
        <div className="text-center text-sm text-surface-500">
          <ArrowPathIcon className="mx-auto mb-3 h-7 w-7 animate-spin text-primary-500" />
          Klassen werden geladen …
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-900 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300">
            <LinkIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-surface-900 dark:text-white">Links zu deinen Klassen</h2>
            <p className="mt-1 text-sm leading-relaxed text-surface-500">
              Korrigiere einen fehlerhaften Portal-Link oder hinterlege einen direkten Einstieg. Ein leerer Link bleibt absichtlich leer.
            </p>
          </div>
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
      {message && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{message}</p>}

      {links.length === 0 ? (
        <div className="card py-12 text-center">
          <LinkIcon className="mx-auto mb-3 h-9 w-9 text-surface-300" />
          <h2 className="font-semibold text-surface-900 dark:text-white">Keine Klassen gefunden</h2>
          <p className="mt-1 text-sm text-surface-500">Sobald das Schulportal deine Klassen liefert, kannst du ihre Links hier anpassen.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map(link => {
            const currentUrl = drafts[link.course_id] || '';
            const previewUrl = portalUrl(currentUrl);
            const isSaving = savingId === link.course_id;
            return (
              <article key={link.course_id} className="card !p-4 sm:!p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300">
                    <PencilSquareIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-surface-900 dark:text-white">{link.name || 'Unbenannter Kurs'}</h3>
                      {link.overridden && <span className="rounded-full bg-primary-100 px-2 py-1 text-[10px] font-medium text-primary-700 dark:bg-primary-900/60 dark:text-primary-200">Eigener Link</span>}
                    </div>
                    {link.teacher && <p className="mt-0.5 text-sm text-surface-500">{link.teacher}</p>}
                  </div>
                  {previewUrl && (
                    <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost h-9 shrink-0 px-2 text-xs" title="Klassenlink öffnen" aria-label={`${link.name} öffnen`}>
                      <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                    </a>
                  )}
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input
                    className="input min-w-0 flex-1 font-mono text-xs"
                    value={currentUrl}
                    onChange={event => setDrafts(previous => ({ ...previous, [link.course_id]: event.target.value }))}
                    placeholder="https://… oder portal-relative Adresse"
                    aria-label={`Link für ${link.name || 'Kurs'}`}
                  />
                  <button type="button" className="btn btn-primary shrink-0" onClick={() => save(link)} disabled={isSaving}>
                    {isSaving ? <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" /> : <CheckIcon className="mr-2 h-4 w-4" />}
                    Speichern
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-xs text-surface-400" title={currentUrl}>{currentUrl || 'Kein Link hinterlegt'}</p>
                  {link.overridden && (
                    <button type="button" className="btn btn-ghost h-8 shrink-0 px-2 text-xs" onClick={() => reset(link)} disabled={isSaving}>
                      <ArrowUturnLeftIcon className="mr-1.5 h-3.5 w-3.5" />
                      Portal-Link nutzen
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClassLinksSettings;
