import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { format, isToday } from 'date-fns';
import { de } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import {
  ArrowPathIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  MapPinIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useBasePath } from '../../contexts/BasePathContext';
import { timetableAPI } from '../../services/api';
import { TimetableDay, TimetableLesson, TimetableResponse } from '../../types';
import {
  getStoredTimetableViewMode,
  projectTimetableDays,
  weekTypeForDate,
} from '../../utils/timetableView';
import SEO from '../seo/SEO';

const Timetable: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const basePath = useBasePath();
  const [personalDays, setPersonalDays] = useState<TimetableDay[]>([]);
  const [allDays, setAllDays] = useState<TimetableDay[]>([]);
  const [activeWeek, setActiveWeek] = useState<'A' | 'B' | undefined>();
  const [referenceWeekStart, setReferenceWeekStart] = useState<string>();
  const [customLessons, setCustomLessons] = useState<NonNullable<TimetableResponse['custom_lessons']>>([]);
  const [timetableViewMode] = useState(getStoredTimetableViewMode);
  const [planMode, setPlanMode] = useState<'personal' | 'all'>('personal');
  const [selectedWeek, setSelectedWeek] = useState<'A' | 'B' | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const dayScrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');

    timetableAPI.getTimetable(token, controller.signal)
      .then(response => {
        if (!response.success) throw new Error(response.message || 'Der Stundenplan konnte nicht geladen werden.');
        setPersonalDays(response.personal_days || response.days || []);
        setAllDays(response.all_days || response.days || []);
        setActiveWeek(response.active_week);
        setReferenceWeekStart(response.week_start);
        setCustomLessons(response.custom_lessons || []);
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

  const selectedDays = planMode === 'all' ? allDays : personalDays;
  const hasAlternatingWeeks = useMemo(() => {
    const weekTypes = new Set([
      ...selectedDays.flatMap(day => day.lessons.map(lesson => lesson.week_type)),
      ...customLessons.map(lesson => lesson.week_type),
    ]);
    return weekTypes.has('A') && weekTypes.has('B');
  }, [customLessons, selectedDays]);
  const weekOverride = timetableViewMode === 'week' && hasAlternatingWeeks
    ? selectedWeek || (activeWeek ? undefined : 'A')
    : undefined;
  const visibleDays = useMemo(() => {
    return projectTimetableDays(
      selectedDays,
      activeWeek,
      referenceWeekStart,
      timetableViewMode,
      customLessons,
      new Date(),
      weekOverride,
    );
  }, [activeWeek, customLessons, referenceWeekStart, selectedDays, timetableViewMode, weekOverride]);
  const lessonCount = useMemo(() => visibleDays.reduce((total, day) => total + day.lessons.length, 0), [visibleDays]);
  const firstVisibleDate = visibleDays[0]?.date ? new Date(`${visibleDays[0].date}T12:00:00`) : undefined;
  const lastVisibleDay = visibleDays[visibleDays.length - 1];
  const lastVisibleDate = lastVisibleDay?.date ? new Date(`${lastVisibleDay.date}T12:00:00`) : undefined;
  const displayedWeekTypes = useMemo(() => {
    if (weekOverride) return [weekOverride];
    if (!activeWeek || !referenceWeekStart) return [];
    const referenceMonday = new Date(`${referenceWeekStart}T12:00:00`);
    return [...new Set(visibleDays.map(day => (
      weekTypeForDate(new Date(`${day.date}T12:00:00`), referenceMonday, activeWeek)
    )).filter((week): week is 'A' | 'B' => Boolean(week)))];
  }, [activeWeek, referenceWeekStart, visibleDays, weekOverride]);

  useLayoutEffect(() => {
    if (loading || !window.matchMedia('(max-width: 639px)').matches) return;
    const today = dayScrollerRef.current?.querySelector<HTMLElement>('[data-today="true"]');
    today?.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'start' });
  }, [loading, planMode, visibleDays]);

  const openCourse = (lesson: TimetableLesson) => {
    if (lesson.course_id) navigate(`${basePath}/courses/${lesson.course_id}`);
  };

  return (
    <div className="min-h-full px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <SEO title="Stundenplan" description="Dein persönlicher Stundenplan im Schulportal Hessen." />
      <div className="mx-auto max-w-7xl">
        <header className="mb-4 sm:mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-white sm:text-3xl">Stundenplan</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-surface-500 dark:text-surface-400">
            {firstVisibleDate && lastVisibleDate && (
              <span>{format(firstVisibleDate, "d. MMMM", { locale: de })} – {format(lastVisibleDate, "d. MMMM yyyy", { locale: de })}</span>
            )}
            {displayedWeekTypes.map(week => <span key={week} className="badge badge-primary">{week}-Woche</span>)}
          </div>

        </header>

        <div className="mb-4 flex flex-wrap gap-2" aria-label="Stundenplanansicht">
          <SegmentedControl
            label="Plan"
            options={[['personal', 'Persönlich'], ['all', 'Gesamtplan']]}
            value={planMode}
            onChange={value => setPlanMode(value as 'personal' | 'all')}
          />
          {timetableViewMode === 'week' && hasAlternatingWeeks && (
            <SegmentedControl
              label="Schulwoche"
              options={[['A', 'A-Woche'], ['B', 'B-Woche']]}
              value={selectedWeek || displayedWeekTypes[0] || activeWeek || 'A'}
              onChange={value => setSelectedWeek(value as 'A' | 'B')}
            />
          )}
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
        ) : (
          <div ref={dayScrollerRef} className="scrollbar-hide -mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 md:gap-4 xl:grid-cols-5">
            {visibleDays.map(day => {
              const date = new Date(`${day.date}T12:00:00`);
              const today = isToday(date);
              return (
                <section key={day.date} data-today={today ? 'true' : undefined} className={`card min-w-[84vw] snap-start !p-0 overflow-hidden sm:min-w-0 ${today ? '!border-primary-300 dark:!border-primary-700 ring-2 ring-primary-500/10' : ''}`}>
                  <div className={`border-b px-4 py-3 ${today ? 'bg-primary-50 dark:bg-primary-950/60' : 'bg-surface-50 dark:bg-surface-800/50'}`}>
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-surface-900 dark:text-white">{day.name || format(date, 'EEEE', { locale: de })}</h2>
                      {today && <span className="badge badge-primary">Heute</span>}
                    </div>
                    <p className="mt-0.5 text-xs text-surface-500">{format(date, 'd. MMMM', { locale: de })}</p>
                  </div>
                  <div className="space-y-2 p-3">
                    {day.lessons.length === 0 ? <p className="py-8 text-center text-sm text-surface-400">Unterrichtsfrei</p> : day.lessons.map((lesson, index) => (
                      <article
                        key={lesson.id || `${day.date}-${index}`}
                        className={`rounded-xl border p-3 transition-all ${lesson.cancelled ? 'border-red-200 bg-red-50/70 opacity-75 dark:border-red-900 dark:bg-red-950/30' : 'bg-white dark:bg-surface-900'} ${lesson.course_id ? 'cursor-pointer hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:hover:border-primary-700 dark:focus-visible:ring-offset-surface-900' : ''}`}
                        role={lesson.course_id ? 'link' : undefined}
                        tabIndex={lesson.course_id ? 0 : undefined}
                        aria-label={lesson.course_id ? `${lesson.subject} in Mein Unterricht öffnen` : undefined}
                        onClick={() => openCourse(lesson)}
                        onKeyDown={event => {
                          if (lesson.course_id && (event.key === 'Enter' || event.key === ' ')) {
                            event.preventDefault();
                            openCourse(lesson);
                          }
                        }}
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div>
                            <p className={`font-semibold text-surface-900 dark:text-white ${lesson.cancelled ? 'line-through' : ''}`}>{lesson.subject}</p>
                            {lesson.class_name && <p className="text-xs text-surface-500">{lesson.class_name}</p>}
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {lesson.week_type && <WeekBadge week={lesson.week_type} />}
                            {lesson.period != null && <span className="badge badge-surface">{lesson.period}{typeof lesson.period === 'number' ? '.' : ''} Std.</span>}
                            {lesson.course_id && <ChevronRightIcon className="h-4 w-4 text-primary-500" aria-hidden="true" />}
                          </div>
                        </div>
                        <div className="space-y-1 text-xs text-surface-500 dark:text-surface-400">
                          {(lesson.start_time || lesson.end_time) && <p className="flex items-center gap-1.5"><ClockIcon className="h-3.5 w-3.5" />{lesson.start_time}{lesson.end_time ? ` – ${lesson.end_time}` : ''}</p>}
                          {lesson.teacher && <p className="flex items-center gap-1.5"><UserIcon className="h-3.5 w-3.5" />{lesson.teacher}</p>}
                          {lesson.room && <p className="flex items-center gap-1.5"><MapPinIcon className="h-3.5 w-3.5" />{lesson.room}</p>}
                        </div>
                        {lesson.info && <p className="mt-2 border-t pt-2 text-xs text-primary-700 dark:text-primary-300">{lesson.info}</p>}
                        <HomeworkPreview homework={lesson.homework} />
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

const HomeworkPreview: React.FC<{ homework?: TimetableLesson['homework']; compact?: boolean }> = ({ homework, compact = false }) => {
  if (!homework?.length) return null;
  const allDone = homework.every(item => item.done);

  return (
    <div className={`${compact ? 'mt-1 p-1 sm:mt-2 sm:p-2' : 'mt-3 p-2.5'} rounded-lg border-l-4 text-left ${allDone ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/35' : 'border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-950/35'}`}>
      <div className={`flex items-center justify-between gap-1 font-semibold uppercase tracking-wide ${allDone ? 'text-emerald-800 dark:text-emerald-200' : 'text-amber-800 dark:text-amber-200'} ${compact ? 'text-[8px] sm:text-[10px]' : 'text-[10px]'}`}>
        <span className="flex items-center gap-1"><BookOpenIcon className={compact ? 'h-2.5 w-2.5 sm:h-3 sm:w-3' : 'h-3.5 w-3.5'} />{compact ? 'Hausaufgabe' : 'Hausaufgabe · nächste Stunde'}</span>
        <span className={`flex items-center gap-0.5 ${allDone ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
          {allDone && <CheckCircleIcon className={compact ? 'h-2.5 w-2.5 sm:h-3 sm:w-3' : 'h-3.5 w-3.5'} />}
          {allDone ? 'Erledigt' : 'Offen'}
        </span>
      </div>
      <div className={compact ? 'mt-0.5 space-y-0.5 sm:mt-1' : 'mt-1.5 space-y-1'}>
        {homework.map((item, index) => (
          <p key={item.entry_id || index} className={`whitespace-pre-wrap break-words ${compact ? 'text-[8px] leading-tight sm:text-[10px]' : 'text-xs leading-relaxed'} ${item.done ? 'text-emerald-700 line-through decoration-emerald-500/60 dark:text-emerald-300' : 'text-amber-950 dark:text-amber-100'}`}>
            {item.text}
          </p>
        ))}
      </div>
    </div>
  );
};

const TimelineView: React.FC<{
  days: TimetableDay[];
  timeSlots: NonNullable<TimetableResponse['time_slots']>;
  onOpenCourse: (lesson: TimetableLesson) => void;
}> = ({ days, timeSlots, onOpenCourse }) => {
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
                  <td key={`${day.date}-${slot.period}`} rowSpan={span} className="border-t p-0.5 align-top sm:p-1.5">
                    <div
                      className="grid h-full gap-0.5 sm:gap-1.5"
                      style={lessons.length ? { gridTemplateColumns: `repeat(${Math.min(lessons.length, 2)}, minmax(0, 1fr))` } : undefined}
                    >
                      {lessons.map((lesson, index) => (
                        <div
                          key={lesson.id || index}
                          className={`relative flex min-w-0 flex-col justify-center rounded-md border border-surface-200 bg-surface-50 p-1 transition-colors sm:rounded-xl sm:p-2.5 dark:border-surface-700 dark:bg-surface-950 ${lesson.course_id ? 'cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 dark:hover:border-primary-600 dark:hover:bg-primary-950/20' : ''}`}
                          role={lesson.course_id ? 'link' : undefined}
                          tabIndex={lesson.course_id ? 0 : undefined}
                          aria-label={lesson.course_id ? `${lesson.subject} in Mein Unterricht öffnen` : undefined}
                          onClick={() => onOpenCourse(lesson)}
                          onKeyDown={event => {
                            if (lesson.course_id && (event.key === 'Enter' || event.key === ' ')) {
                              event.preventDefault();
                              onOpenCourse(lesson);
                            }
                          }}
                        >
                          <div className="flex items-start justify-between gap-0.5 sm:gap-2">
                            <span className="break-words text-[10px] font-semibold leading-tight sm:text-sm">{lesson.subject}</span>
                            {lesson.week_type && <WeekBadge week={lesson.week_type} compact />}
                          </div>
                          <div className="mt-1 space-y-0.5 text-[9px] leading-tight text-surface-500 sm:mt-2 sm:space-y-1 sm:text-sm sm:leading-normal dark:text-surface-400">
                            {lesson.teacher && <p>{lesson.teacher}</p>}
                            {lesson.room && <p>{lesson.room}</p>}
                          </div>
                          <HomeworkPreview homework={lesson.homework} compact />
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
