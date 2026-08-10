import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { addDays, addWeeks, format, isToday, startOfWeek, subWeeks } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  MapPinIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { timetableAPI } from '../../services/api';
import { TimetableDay } from '../../types';
import SEO from '../seo/SEO';

const Timetable: React.FC = () => {
  const { token } = useAuth();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [days, setDays] = useState<TimetableDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const weekKey = format(weekStart, 'yyyy-MM-dd');
  const currentWeekKey = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');

    timetableAPI.getTimetable(token, weekKey, controller.signal)
      .then(response => {
        if (!response.success) throw new Error(response.message || 'Der Stundenplan konnte nicht geladen werden.');
        setDays(response.days || []);
      })
      .catch(err => {
        if (axios.isCancel(err)) return;
        setError(err.response?.data?.detail || err.message || 'Der Stundenplan konnte nicht geladen werden.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [token, weekKey, reloadKey]);

  const lessonCount = useMemo(() => days.reduce((total, day) => total + day.lessons.length, 0), [days]);

  return (
    <div className="min-h-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <SEO title="Stundenplan" description="Dein persönlicher Stundenplan im Schulportal Hessen." />
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400">
              <CalendarDaysIcon className="h-4 w-4" />
              Deine Schulwoche
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-white sm:text-3xl">Stundenplan</h1>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
              {format(weekStart, "d. MMMM", { locale: de })} – {format(addDays(weekStart, 4), "d. MMMM yyyy", { locale: de })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button className="btn btn-secondary !px-3" onClick={() => setWeekStart(value => subWeeks(value, 1))} aria-label="Vorherige Woche">
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <button className="btn btn-secondary min-w-24" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} disabled={weekKey === currentWeekKey}>
              Heute
            </button>
            <button className="btn btn-secondary !px-3" onClick={() => setWeekStart(value => addWeeks(value, 1))} aria-label="Nächste Woche">
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </header>

        {loading ? (
          <div className="card flex min-h-64 items-center justify-center">
            <div className="text-center text-surface-500"><ArrowPathIcon className="mx-auto mb-3 h-7 w-7 animate-spin text-primary-500" />Stundenplan wird geladen …</div>
          </div>
        ) : error ? (
          <div className="card flex min-h-64 flex-col items-center justify-center text-center">
            <CalendarDaysIcon className="mb-3 h-10 w-10 text-red-400" />
            <h2 className="font-semibold text-surface-900 dark:text-white">Stundenplan nicht verfügbar</h2>
            <p className="mt-1 max-w-md text-sm text-surface-500">{error}</p>
            <button className="btn btn-secondary mt-4" onClick={() => setReloadKey(value => value + 1)}>Erneut versuchen</button>
          </div>
        ) : lessonCount === 0 ? (
          <div className="card flex min-h-64 flex-col items-center justify-center text-center">
            <CalendarDaysIcon className="mb-3 h-10 w-10 text-surface-300" />
            <h2 className="font-semibold text-surface-900 dark:text-white">Keine Stunden eingetragen</h2>
            <p className="mt-1 text-sm text-surface-500">Für diese Woche wurden keine Unterrichtsstunden gefunden.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {days.map(day => {
              const date = new Date(`${day.date}T12:00:00`);
              const today = isToday(date);
              return (
                <section key={day.date} className={`card !p-0 overflow-hidden ${today ? '!border-primary-300 dark:!border-primary-700 ring-2 ring-primary-500/10' : ''}`}>
                  <div className={`border-b px-4 py-3 ${today ? 'bg-primary-50 dark:bg-primary-950/60' : 'bg-surface-50 dark:bg-surface-800/50'}`}>
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-surface-900 dark:text-white">{day.name || format(date, 'EEEE', { locale: de })}</h2>
                      {today && <span className="badge badge-primary">Heute</span>}
                    </div>
                    <p className="mt-0.5 text-xs text-surface-500">{format(date, 'd. MMMM', { locale: de })}</p>
                  </div>
                  <div className="space-y-2 p-3">
                    {day.lessons.length === 0 ? <p className="py-8 text-center text-sm text-surface-400">Unterrichtsfrei</p> : day.lessons.map((lesson, index) => (
                      <article key={lesson.id || `${day.date}-${index}`} className={`rounded-xl border p-3 ${lesson.cancelled ? 'border-red-200 bg-red-50/70 opacity-75 dark:border-red-900 dark:bg-red-950/30' : 'bg-white dark:bg-surface-900'}`}>
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div>
                            <p className={`font-semibold text-surface-900 dark:text-white ${lesson.cancelled ? 'line-through' : ''}`}>{lesson.subject}</p>
                            {lesson.class_name && <p className="text-xs text-surface-500">{lesson.class_name}</p>}
                          </div>
                          {lesson.period != null && <span className="badge badge-surface shrink-0">{lesson.period}{typeof lesson.period === 'number' ? '.' : ''} Std.</span>}
                        </div>
                        <div className="space-y-1 text-xs text-surface-500 dark:text-surface-400">
                          {(lesson.start_time || lesson.end_time) && <p className="flex items-center gap-1.5"><ClockIcon className="h-3.5 w-3.5" />{lesson.start_time}{lesson.end_time ? ` – ${lesson.end_time}` : ''}</p>}
                          {lesson.teacher && <p className="flex items-center gap-1.5"><UserIcon className="h-3.5 w-3.5" />{lesson.teacher}</p>}
                          {lesson.room && <p className="flex items-center gap-1.5"><MapPinIcon className="h-3.5 w-3.5" />{lesson.room}</p>}
                        </div>
                        {lesson.info && <p className="mt-2 border-t pt-2 text-xs text-primary-700 dark:text-primary-300">{lesson.info}</p>}
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Timetable;
