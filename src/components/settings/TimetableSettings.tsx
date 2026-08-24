import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  CheckIcon,
  EyeSlashIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { settingsAPI, timetableAPI } from '../../services/api';
import { ClassLink, CustomLesson, TimetableLesson, TimetableResponse } from '../../types';

interface EditableEntry {
  key: string;
  date: string;
  period: string;
  lesson?: TimetableLesson;
  custom?: CustomLesson;
}

const periodStart = (period: string) => Number(period.match(/\d+/)?.[0] || 999);

const normalisePeriod = (value: string) => {
  const match = value.trim().match(/^(\d{1,2})(?:\s*[-–—]\s*(\d{1,2}))?$/);
  if (!match) return value.trim();
  const start = Number(match[1]);
  const end = Number(match[2] || start);
  return end === start ? String(start) : `${start}–${end}`;
};

const makeDraft = (date: string): CustomLesson => ({
  date,
  period: '1',
  subject: '',
  teacher: '',
  room: '',
  class_name: '',
  info: '',
  start_time: '',
  end_time: '',
  duration: 1,
  removed: false,
});

const formatDay = (value: string) => {
  try {
    return format(parseISO(value), 'EEEE, d. MMMM', { locale: de });
  } catch {
    return value;
  }
};

const draftFromEntry = (entry: EditableEntry): CustomLesson => {
  const lesson = entry.lesson;
  const custom = entry.custom;
  return {
    date: entry.date,
    period: entry.period,
    subject: custom?.subject ?? lesson?.subject ?? '',
    teacher: custom?.teacher ?? lesson?.teacher ?? '',
    room: custom?.room ?? lesson?.room ?? '',
    class_name: custom?.class_name ?? lesson?.class_name ?? '',
    info: custom?.info ?? lesson?.info ?? '',
    start_time: custom?.start_time ?? lesson?.start_time ?? '',
    end_time: custom?.end_time ?? lesson?.end_time ?? '',
    duration: custom?.duration ?? lesson?.duration ?? 1,
    week_type: custom?.week_type ?? lesson?.week_type,
    course_id: custom?.course_id ?? lesson?.course_id,
    removed: custom?.removed ?? false,
  };
};

interface LoadedTimetable {
  timetable: TimetableResponse;
  customLessons: CustomLesson[];
  classLinks: ClassLink[];
}

const buildEntries = (timetable: TimetableResponse | null, customLessons: CustomLesson[]): EditableEntry[] => {
  const byKey = new Map<string, EditableEntry>();
  const days = timetable?.days || [];
  days.forEach(day => {
    day.lessons.forEach(lesson => {
      const period = normalisePeriod(String(lesson.period ?? ''));
      const key = `${day.date}:${period}`;
      byKey.set(key, { key, date: day.date, period, lesson });
    });
  });
  customLessons.forEach(custom => {
    const period = normalisePeriod(String(custom.period || ''));
    const key = `${custom.date}:${period}`;
    const existing = byKey.get(key);
    byKey.set(key, {
      key,
      date: custom.date,
      period,
      lesson: existing?.lesson,
      custom,
    });
  });
  return [...byKey.values()].sort((left, right) => (
    left.date.localeCompare(right.date) || periodStart(left.period) - periodStart(right.period)
  ));
};

const TimetableSettings: React.FC = () => {
  const { token } = useAuth();
  const [timetable, setTimetable] = useState<TimetableResponse | null>(null);
  const [customLessons, setCustomLessons] = useState<CustomLesson[]>([]);
  const [classLinks, setClassLinks] = useState<ClassLink[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [draft, setDraft] = useState<CustomLesson>(() => makeDraft(new Date().toISOString().slice(0, 10)));
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async (signal?: AbortSignal): Promise<LoadedTimetable | null> => {
    if (!token) return null;
    setLoading(true);
    setError('');
    try {
      const [timetableResponse, customResponse, classLinksResponse] = await Promise.all([
        timetableAPI.getTimetable(token, signal),
        settingsAPI.getCustomLessons(token, signal),
        settingsAPI.getClassLinks(token, signal),
      ]);
      if (signal?.aborted) return null;
      if (!timetableResponse.success) throw new Error(timetableResponse.message || 'Der Stundenplan konnte nicht geladen werden.');
      if (!customResponse.success) throw new Error('Eigene Stundenplanänderungen konnten nicht geladen werden.');
      if (!classLinksResponse.success) throw new Error('Kurse konnten nicht geladen werden.');
      const loaded = {
        timetable: timetableResponse,
        customLessons: customResponse.lessons || [],
        classLinks: classLinksResponse.links || [],
      };
      setTimetable(loaded.timetable);
      setCustomLessons(loaded.customLessons);
      setClassLinks(loaded.classLinks);
      return loaded;
    } catch (loadError) {
      if (axios.isCancel(loadError)) return null;
      setError(loadError instanceof Error ? loadError.message : 'Stundenplanänderungen konnten nicht geladen werden.');
      return null;
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [token]);

  const entries = useMemo(() => buildEntries(timetable, customLessons), [customLessons, timetable]);
  const selectedClass = useMemo(
    () => classLinks.find(link => link.course_id === draft.course_id),
    [classLinks, draft.course_id],
  );

  useEffect(() => {
    if (selectedKey || !entries.length) return;
    const first = entries[0];
    setSelectedKey(first.key);
    setDraft(draftFromEntry(first));
  }, [entries, selectedKey]);

  const selectEntry = (entry: EditableEntry) => {
    setSelectedKey(entry.key);
    setDraft(draftFromEntry(entry));
    setIsNew(false);
    setMessage('');
    setError('');
  };

  const selectNewLesson = () => {
    const firstDate = timetable?.days?.[0]?.date || new Date().toISOString().slice(0, 10);
    const newDraft = makeDraft(firstDate);
    setSelectedKey('new');
    setDraft(newDraft);
    setIsNew(true);
    setMessage('');
    setError('');
  };

  const updateDraft = <K extends keyof CustomLesson>(key: K, value: CustomLesson[K]) => {
    setDraft(previous => ({ ...previous, [key]: value }));
    setMessage('');
  };

  const selectCourse = (courseId: string) => {
    const course = classLinks.find(link => link.course_id === courseId);
    setDraft(previous => ({
      ...previous,
      course_id: course?.course_id || null,
      class_name: course?.name || '',
    }));
    setMessage('');
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    if (!draft.date || !draft.period.trim()) {
      setError('Datum und Stunde werden benötigt.');
      return;
    }
    if (!draft.removed && !draft.subject?.trim()) {
      setError('Gib ein Fach ein oder blende die Stunde aus.');
      return;
    }
    const period = normalisePeriod(draft.period);
    const previousOverride = !isNew
      ? customLessons.find(lesson => `${lesson.date}:${normalisePeriod(lesson.period)}` === selectedKey)
      : undefined;
    const destinationOverride = customLessons.find(lesson => (
      `${lesson.date}:${normalisePeriod(lesson.period)}` === `${draft.date}:${period}`
      && `${lesson.date}:${normalisePeriod(lesson.period)}` !== selectedKey
    ));
    if (destinationOverride) {
      setError('Für diesen Slot gibt es bereits eine eigene Korrektur. Setze sie zuerst zurück oder wähle einen anderen Slot.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await settingsAPI.saveCustomLesson(token, {
        ...draft,
        period,
        subject: draft.subject?.trim() || '',
        duration: Math.max(1, Number(draft.duration) || 1),
      });
      if (!response.success) throw new Error('Änderung konnte nicht gespeichert werden.');
      if (previousOverride && (previousOverride.date !== draft.date || normalisePeriod(previousOverride.period) !== period)) {
        await settingsAPI.deleteCustomLesson(token, previousOverride.date, previousOverride.period);
      }
      const savedLesson = response.lesson;
      setIsNew(false);
      setSelectedKey(`${savedLesson.date}:${savedLesson.period}`);
      setDraft(previous => ({ ...previous, ...savedLesson }));
      setMessage('Stundenplanänderung gespeichert.');
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Änderung konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!token || isNew) return;
    const resetDate = draft.date;
    const resetPeriod = normalisePeriod(draft.period);
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await settingsAPI.deleteCustomLesson(token, resetDate, resetPeriod);
      if (!response.success) throw new Error('Eigene Änderung konnte nicht zurückgesetzt werden.');
      setMessage('Portalversion wiederhergestellt.');
      const refreshed = await load();
      if (!refreshed) return;
      const entry = buildEntries(refreshed.timetable, refreshed.customLessons).find(item => item.date === resetDate && normalisePeriod(item.period) === resetPeriod);
      if (entry?.lesson) {
        setSelectedKey(entry.key);
        setIsNew(false);
        setDraft(draftFromEntry({ ...entry, custom: undefined }));
      } else {
        setSelectedKey('new');
        setIsNew(true);
        setDraft(makeDraft(resetDate));
      }
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Änderung konnte nicht zurückgesetzt werden.');
    } finally {
      setSaving(false);
    }
  };

  const hasOverride = !isNew && customLessons.some(
    lesson => lesson.date === draft.date && normalisePeriod(lesson.period) === normalisePeriod(draft.period),
  );

  if (loading) {
    return (
      <div className="card flex min-h-72 items-center justify-center">
        <div className="text-center text-sm text-surface-500">
          <ArrowPathIcon className="mx-auto mb-3 h-7 w-7 animate-spin text-primary-500" />
          Stundenplan wird vorbereitet …
        </div>
      </div>
    );
  }

  if (error && !timetable) {
    return (
      <div className="card flex min-h-72 flex-col items-center justify-center text-center">
        <CalendarDaysIcon className="mb-3 h-10 w-10 text-red-400" />
        <h2 className="font-semibold text-surface-900 dark:text-white">Stundenplan nicht verfügbar</h2>
        <p className="mt-1 max-w-md text-sm text-surface-500">{error}</p>
        <button type="button" className="btn btn-secondary mt-4" onClick={() => load()}>
          Erneut versuchen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
      {message && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{message}</p>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <section className="card !p-0">
          <div className="flex items-center justify-between border-b border-surface-100 px-4 py-4 dark:border-surface-800 sm:px-5">
            <h3 className="font-semibold text-surface-900 dark:text-white">Stundenplan</h3>
            <button type="button" className="btn btn-primary h-9 px-3 text-xs" onClick={selectNewLesson}>
              <PlusIcon className="mr-1.5 h-4 w-4" />
              Neue Stunde
            </button>
          </div>
          <div className="max-h-[31rem] overflow-y-auto p-3 sm:p-4">
            {entries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-surface-300 p-6 text-center dark:border-surface-700">
                <CalendarDaysIcon className="mx-auto mb-2 h-7 w-7 text-surface-400" />
                <p className="text-sm text-surface-500">Noch keine Stunden gefunden.</p>
                <button type="button" className="btn btn-secondary mt-4 text-xs" onClick={selectNewLesson}>Erste Stunde anlegen</button>
              </div>
            ) : (
              <div className="space-y-2">
                {entries.map(entry => {
                  const isSelected = selectedKey === entry.key;
                  const isRemoved = entry.custom?.removed;
                  return (
                    <button
                      type="button"
                      key={entry.key}
                      onClick={() => selectEntry(entry)}
                      className={`w-full rounded-xl border p-3 text-left transition-colors ${isSelected
                        ? 'border-primary-400 bg-primary-50/70 dark:border-primary-600 dark:bg-primary-950/30'
                        : 'border-surface-200 bg-white hover:border-primary-200 hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-900 dark:hover:border-primary-800 dark:hover:bg-surface-800'}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 min-w-10 rounded-lg bg-surface-100 px-2 py-1 text-center text-xs font-semibold text-surface-600 dark:bg-surface-800 dark:text-surface-300">
                          {entry.period || '—'}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs text-surface-500">{formatDay(entry.date)}</span>
                          <span className={`mt-0.5 block truncate text-sm font-semibold ${isRemoved ? 'text-surface-400 line-through' : 'text-surface-900 dark:text-white'}`}>
                            {isRemoved ? 'Stunde ausgeblendet' : entry.custom?.subject || entry.lesson?.subject || 'Neue Stunde'}
                          </span>
                          {!isRemoved && (entry.custom?.room || entry.lesson?.room) && (
                            <span className="mt-0.5 block truncate text-xs text-surface-500">{entry.custom?.room || entry.lesson?.room}</span>
                          )}
                        </span>
                        {entry.custom && <span className="shrink-0 rounded-full bg-primary-100 px-2 py-1 text-[10px] font-medium text-primary-700 dark:bg-primary-900/60 dark:text-primary-200">Eigen</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="card">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
                {isNew ? 'Neue Stunde' : draft.subject || 'Stunde bearbeiten'}
              </h3>
            </div>
            {draft.removed && <EyeSlashIcon className="h-6 w-6 shrink-0 text-surface-400" />}
          </div>

          <form className="space-y-4" onSubmit={save}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="custom-lesson-date">Datum</label>
                <input id="custom-lesson-date" type="date" className="input" value={draft.date} onChange={event => updateDraft('date', event.target.value)} required />
              </div>
              <div>
                <label className="label" htmlFor="custom-lesson-period">Stunde / Bereich</label>
                <input id="custom-lesson-period" className="input" value={draft.period} onChange={event => updateDraft('period', event.target.value)} placeholder="z. B. 1 oder 1–2" required />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="custom-lesson-subject">Fach</label>
              <input id="custom-lesson-subject" className="input" value={draft.subject || ''} onChange={event => updateDraft('subject', event.target.value)} placeholder="z. B. Mathematik" disabled={draft.removed} required={!draft.removed} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="custom-lesson-teacher">Lehrkraft</label>
                <input id="custom-lesson-teacher" className="input" value={draft.teacher || ''} onChange={event => updateDraft('teacher', event.target.value)} disabled={draft.removed} />
              </div>
              <div>
                <label className="label" htmlFor="custom-lesson-room">Raum</label>
                <input id="custom-lesson-room" className="input" value={draft.room || ''} onChange={event => updateDraft('room', event.target.value)} disabled={draft.removed} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="custom-lesson-start">Beginn</label>
                <input id="custom-lesson-start" type="time" className="input" value={draft.start_time || ''} onChange={event => updateDraft('start_time', event.target.value)} disabled={draft.removed} />
              </div>
              <div>
                <label className="label" htmlFor="custom-lesson-end">Ende</label>
                <input id="custom-lesson-end" type="time" className="input" value={draft.end_time || ''} onChange={event => updateDraft('end_time', event.target.value)} disabled={draft.removed} />
              </div>
              <div>
                <label className="label" htmlFor="custom-lesson-duration">Dauer (Stunden)</label>
                <input id="custom-lesson-duration" type="number" min="1" max="12" className="input" value={draft.duration || 1} onChange={event => updateDraft('duration', Number(event.target.value))} disabled={draft.removed} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="custom-lesson-week">Woche</label>
                <select id="custom-lesson-week" className="input" value={draft.week_type || ''} onChange={event => updateDraft('week_type', (event.target.value || undefined) as CustomLesson['week_type'])} disabled={draft.removed}>
                  <option value="">Jede Woche</option>
                  <option value="A">A-Woche</option>
                  <option value="B">B-Woche</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="custom-lesson-class">Kurs verknüpfen</label>
                <select id="custom-lesson-class" className="input" value={draft.course_id || ''} onChange={event => selectCourse(event.target.value)} disabled={draft.removed}>
                  <option value="">Kein Kurs</option>
                  {draft.course_id && !selectedClass && (
                    <option value={draft.course_id}>{draft.class_name || draft.course_id}</option>
                  )}
                  {classLinks.map(link => (
                    <option key={link.course_id} value={link.course_id}>{link.name || 'Unbenannter Kurs'}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="custom-lesson-info">Notiz</label>
              <input id="custom-lesson-info" className="input" value={draft.info || ''} onChange={event => updateDraft('info', event.target.value)} placeholder="Optionaler Hinweis" disabled={draft.removed} />
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-surface-200 p-3 dark:border-surface-700">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500" checked={Boolean(draft.removed)} onChange={event => updateDraft('removed', event.target.checked)} />
              <span>
                <span className="block text-sm font-medium text-surface-800 dark:text-surface-200">Diese Stunde ausblenden</span>
                <span className="mt-0.5 block text-xs text-surface-500">Praktisch, wenn das Portal eine ausgefallene Stunde trotzdem anzeigt.</span>
              </span>
            </label>

            <div className="flex flex-col-reverse gap-2 border-t border-surface-100 pt-4 dark:border-surface-800 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" className="btn btn-ghost justify-start px-0 text-xs text-red-600 hover:bg-transparent hover:text-red-700 dark:text-red-400" onClick={reset} disabled={!hasOverride || saving}>
                <TrashIcon className="mr-1.5 h-4 w-4" />
                Portalversion wiederherstellen
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" /> : <CheckIcon className="mr-2 h-4 w-4" />}
                Änderung speichern
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default TimetableSettings;
