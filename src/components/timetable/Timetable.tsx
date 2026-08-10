import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { addDays, format, isToday, startOfWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { timetableAPI } from '../../services/api';
import { TimetableDay, TimetableLesson, TimetableResponse } from '../../types';
import SEO from '../seo/SEO';

const Timetable: React.FC = () => {
  const { token } = useAuth();
  const [weekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [days, setDays] = useState<TimetableDay[]>([]);
  const [personalDays, setPersonalDays] = useState<TimetableDay[]>([]);
  const [allDays, setAllDays] = useState<TimetableDay[]>([]);
  const [timeSlots, setTimeSlots] = useState<NonNullable<TimetableResponse['time_slots']>>([]);
  const [activeWeek, setActiveWeek] = useState<'A' | 'B' | undefined>();
  const [planMode, setPlanMode] = useState<'personal' | 'all'>('personal');
  const [weekMode, setWeekMode] = useState<'current' | 'all'>('current');
  const [viewMode, setViewMode] = useState<'cards' | 'timeline'>('cards');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');

    timetableAPI.getTimetable(token, controller.signal)
      .then(response => {
        if (!response.success) throw new Error(response.message || 'Der Stundenplan konnte nicht geladen werden.');
        setDays(response.days || []);
        setPersonalDays(response.personal_days || response.days || []);
        setAllDays(response.all_days || response.days || []);
        setTimeSlots(response.time_slots || []);
        setActiveWeek(response.active_week);
      })
      .catch(err => {
        if (axios.isCancel(err)) return;
        setError(err.response?.data?.detail || err.message || 'Der Stundenplan konnte nicht geladen werden.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [token, reloadKey]);

  const visibleDays = useMemo(() => {
    const selected = planMode === 'all' ? allDays : personalDays;
    if (weekMode === 'all' || !activeWeek) return selected;
    return selected.map(day => ({
      ...day,
      lessons: day.lessons.filter(lesson => !lesson.week_type || lesson.week_type === activeWeek),
    }));
  }, [activeWeek, allDays, personalDays, planMode, weekMode]);
  const lessonCount = useMemo(() => visibleDays.reduce((total, day) => total + day.lessons.length, 0), [visibleDays]);

  return (
    <div className="min-h-full px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <SEO title="Stundenplan" description="Dein persönlicher Stundenplan im Schulportal Hessen." />
      <div className="mx-auto max-w-7xl">
        <header className="mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-white sm:text-3xl">Stundenplan</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-surface-500 dark:text-surface-400">
              <span>{format(weekStart, "d. MMMM", { locale: de })} – {format(addDays(weekStart, 4), "d. MMMM yyyy", { locale: de })}</span>
              {activeWeek && <span className="badge badge-primary">{activeWeek}-Woche</span>}
            </div>
          </div>

        </header>

        <div className="mb-4 flex flex-wrap gap-2" aria-label="Stundenplanansicht">
          <SegmentedControl
            label="Plan"
            options={[['personal', 'Persönlich'], ['all', 'Gesamtplan']]}
            value={planMode}
            onChange={value => setPlanMode(value as 'personal' | 'all')}
          />
          <SegmentedControl
            label="Wochen"
            options={[['current', activeWeek ? `${activeWeek}-Woche` : 'Aktuell'], ['all', 'Alle Wochen']]}
            value={weekMode}
            onChange={value => setWeekMode(value as 'current' | 'all')}
          />
          <SegmentedControl
            label="Darstellung"
            options={[['cards', 'Karten'], ['timeline', 'Zeitachse']]}
            value={viewMode}
            onChange={value => setViewMode(value as 'cards' | 'timeline')}
          />
        </div>

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
        ) : viewMode === 'timeline' && timeSlots.length ? (
          <TimelineView days={visibleDays} timeSlots={timeSlots} activeWeek={activeWeek} />
        ) : (
          <div className="scrollbar-hide -mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 md:gap-4 xl:grid-cols-5">
            {visibleDays.map(day => {
              const date = new Date(`${day.date}T12:00:00`);
              const today = isToday(date);
              return (
                <section key={day.date} className={`card min-w-[84vw] snap-start !p-0 overflow-hidden sm:min-w-0 ${today ? '!border-primary-300 dark:!border-primary-700 ring-2 ring-primary-500/10' : ''}`}>
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
                          <div className="flex shrink-0 items-center gap-1.5">
                            {lesson.week_type && <WeekBadge week={lesson.week_type} />}
                            {lesson.period != null && <span className="badge badge-surface">{lesson.period}{typeof lesson.period === 'number' ? '.' : ''} Std.</span>}
                          </div>
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

const SegmentedControl: React.FC<{
  label: string;
  options: Array<[string, string]>;
  value: string;
  onChange: (value: string) => void;
}> = ({ label, options, value, onChange }) => (
  <div className="flex shrink-0 items-center rounded-xl border border-surface-200 bg-surface-100 p-1 dark:border-surface-700 dark:bg-surface-900" aria-label={label}>
    {options.map(([optionValue, optionLabel]) => (
      <button
        key={optionValue}
        type="button"
        className={`min-h-9 rounded-lg px-3 text-xs font-medium transition-colors sm:text-sm ${value === optionValue ? 'bg-white text-surface-900 shadow-sm dark:bg-surface-700 dark:text-white' : 'text-surface-500 hover:text-surface-800 dark:text-surface-400 dark:hover:text-white'}`}
        aria-pressed={value === optionValue}
        onClick={() => onChange(optionValue)}
      >
        {optionLabel}
      </button>
    ))}
  </div>
);

const WeekBadge: React.FC<{ week: 'A' | 'B'; compact?: boolean }> = ({ week, compact = false }) => (
  <span className={`${week === 'A' ? 'badge badge-primary' : 'badge border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300'} ${compact ? '!px-1 !py-0 text-[8px] sm:!px-2.5 sm:!py-0.5 sm:text-xs' : ''}`}>
    {compact ? week : `${week}-Woche`}
  </span>
);

const TimelineView: React.FC<{
  days: TimetableDay[];
  timeSlots: NonNullable<TimetableResponse['time_slots']>;
  activeWeek?: 'A' | 'B';
}> = ({ days, timeSlots, activeWeek }) => {
  const lessonsStartingAt = (day: TimetableDay, period: number): TimetableLesson[] =>
    day.lessons.filter(lesson => Number(lesson.period?.toString().split('–')[0]) === period);
  const isCovered = (day: TimetableDay, period: number): boolean => day.lessons.some(lesson => {
    const start = Number(lesson.period?.toString().split('–')[0]);
    return start < period && start + (lesson.duration || 1) > period;
  });
  const usedTimeSlots = timeSlots.filter(slot => days.some(day => day.lessons.some(lesson => {
    const start = Number(lesson.period?.toString().split('–')[0]);
    return start <= slot.period && start + (lesson.duration || 1) > slot.period;
  })));

  return (
    <div className="overflow-hidden rounded-xl border border-surface-200 bg-white sm:overflow-x-auto sm:rounded-2xl dark:border-surface-800 dark:bg-surface-900">
      <table className="w-full min-w-0 table-fixed border-collapse sm:min-w-[760px]">
        <thead>
          <tr>
            <th className="w-14 border-b border-r bg-surface-50 px-1 py-2 text-left text-[9px] font-medium text-surface-500 sm:w-28 sm:px-3 sm:py-3 sm:text-xs dark:bg-surface-800/60 dark:text-surface-400">Zeit</th>
            {days.map(day => {
              const date = new Date(`${day.date}T12:00:00`);
              return <th key={day.date} className="border-b px-1 py-2 text-center text-[10px] font-semibold sm:px-3 sm:py-3 sm:text-left sm:text-sm">
                <span className="sm:hidden">{day.name?.slice(0, 2)}</span><span className="hidden sm:inline">{day.name}</span>
                <span className="mt-0.5 block text-[9px] font-normal text-surface-500 sm:text-xs"><span className="sm:hidden">{format(date, 'dd.MM.')}</span><span className="hidden sm:inline">{format(date, 'd. MMMM', { locale: de })}</span></span>
              </th>;
            })}
          </tr>
        </thead>
        <tbody>
          {usedTimeSlots.map(slot => (
            <tr key={slot.period}>
              <th className="border-r border-t bg-surface-50 px-1 py-2 align-top text-center sm:px-3 sm:py-3 sm:text-left dark:bg-surface-800/40">
                <span className="block text-[10px] font-semibold sm:text-sm">{slot.period}.</span>
                <span className="mt-0.5 block text-[8px] font-normal leading-tight text-surface-500 sm:mt-1 sm:text-xs sm:leading-normal">{slot.start_time}<br />{slot.end_time}</span>
              </th>
              {days.map(day => {
                if (isCovered(day, slot.period)) return null;
                const lessons = lessonsStartingAt(day, slot.period);
                const span = Math.max(1, ...lessons.map(lesson => lesson.duration || 1));
                return (
                  <td key={`${day.date}-${slot.period}`} rowSpan={span} className="relative border-t p-0.5 align-top sm:p-1.5">
                    <div
                      className={lessons.length ? 'absolute inset-0.5 grid gap-0.5 sm:inset-1.5 sm:gap-1.5' : 'grid gap-0.5 sm:gap-1.5'}
                      style={lessons.length ? { gridTemplateColumns: `repeat(${Math.min(lessons.length, 2)}, minmax(0, 1fr))` } : undefined}
                    >
                      {lessons.map((lesson, index) => (
                        <div key={lesson.id || index} className="relative flex min-h-0 flex-col justify-center overflow-hidden rounded-md border border-surface-200 bg-surface-50 p-1 sm:rounded-xl sm:p-2.5 dark:border-surface-700 dark:bg-surface-950">
                          <div className="flex items-start justify-between gap-0.5 sm:gap-2">
                            <span className="break-words text-[10px] font-semibold leading-tight sm:text-sm">{lesson.subject}</span>
                            {lesson.week_type && <WeekBadge week={lesson.week_type} compact />}
                          </div>
                          <div className="mt-1 space-y-0.5 text-[9px] leading-tight text-surface-500 sm:mt-2 sm:space-y-1 sm:text-sm sm:leading-normal dark:text-surface-400">
                            {lesson.teacher && <p>{lesson.teacher}</p>}
                            {lesson.room && <p>{lesson.room}</p>}
                          </div>
                        </div>
                      ))}
                      {!lessons.length && <div className="h-10 rounded bg-surface-50 sm:h-12 sm:rounded-lg dark:bg-surface-800/30" />}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Timetable;
