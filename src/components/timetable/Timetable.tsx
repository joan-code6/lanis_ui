import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { format, isToday } from 'date-fns';
import { de } from 'date-fns/locale';
import { Link, useNavigate } from 'react-router-dom';
import {
  AcademicCapIcon,
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
import { usePreferences } from '../../contexts/PreferencesContext';
import { timetableAPI } from '../../services/api';
import { StudyGroupExam, TimetableDay, TimetableLesson, TimetableResponse } from '../../types';
import { weekTypeForDate } from '../../utils/timetableView';
import SEO from '../seo/SEO';
import { layoutTimetableEntries, TimetableEntry, timetableEntries } from '../../utils/timetableExams';
import { createTimetableRefreshTracker } from '../../utils/timetableRefresh';

const Timetable: React.FC = () => {
  const { token } = useAuth();
  const { preferences } = usePreferences();
  const navigate = useNavigate();
  const basePath = useBasePath();
  const [visibleDays, setVisibleDays] = useState<TimetableDay[]>([]);
  const [hasAlternatingWeeks, setHasAlternatingWeeks] = useState(false);
  const [activeWeek, setActiveWeek] = useState<'A' | 'B' | undefined>();
  const [referenceWeekStart, setReferenceWeekStart] = useState<string>();
  const timetableViewMode = preferences.timetable.view_mode;
  const [planMode, setPlanMode] = useState<'personal' | 'all'>('personal');
  const [selectedWeek, setSelectedWeek] = useState<'A' | 'B' | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [exams, setExams] = useState<StudyGroupExam[]>([]);
  const [timeSlots, setTimeSlots] = useState<NonNullable<TimetableResponse['time_slots']>>([]);
  const [examsError, setExamsError] = useState(false);
  const [substitutionSources, setSubstitutionSources] = useState<{ name: string; error: boolean; updated?: string | null }[]>([]);
  const refreshTracker = useRef(createTimetableRefreshTracker());
  const dayScrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setExams([]);
    setExamsError(false);
    setSubstitutionSources([]);

    const refresh = refreshTracker.current.shouldRefresh(reloadKey);
    timetableAPI.getResolvedTimetable(token, { view_mode: timetableViewMode, plan_mode: planMode, week_type: selectedWeek, refresh }, controller.signal)
      .then(response => {
        if (controller.signal.aborted) return;
        if (!response.success) throw new Error(response.message || 'Der Stundenplan konnte nicht geladen werden.');
        refreshTracker.current.markSuccessful(reloadKey);
        setVisibleDays(response.days || []);
        setHasAlternatingWeeks(Boolean(response.has_alternating_weeks));
        setSubstitutionSources(response.substitution_sources || []);
        setActiveWeek(response.active_week);
        setReferenceWeekStart(response.week_start);
        setExams(response.exams || []);
        setTimeSlots(response.time_slots || []);
        setExamsError(Boolean(response.exams_error));
      })
      .catch(err => {
        if (controller.signal.aborted || axios.isCancel(err)) return;
        setError(err.response?.data?.detail || err.message || 'Der Stundenplan konnte nicht geladen werden.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [token, reloadKey, timetableViewMode, planMode, selectedWeek, preferences.vertretungsplan.class_override]);

  const weekOverride = timetableViewMode === 'week' && hasAlternatingWeeks ? selectedWeek : undefined;
  const displayedExams = preferences.timetable.show_exams ? exams : [];
  const visibleExamCount = visibleDays.reduce((total, day) => total + displayedExams.filter(exam => exam.date === day.date).length, 0);
  const noticeCount = visibleDays.reduce((total, day) => total + (day.substitutionNotices || []).length, 0);
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
    const scroller = dayScrollerRef.current;
    const today = scroller?.querySelector<HTMLElement>('[data-today="true"]');
    if (scroller && today) scroller.scrollTo({
      left: scroller.scrollLeft + today.getBoundingClientRect().left - scroller.getBoundingClientRect().left,
      behavior: 'auto',
    });
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

        <div role="status" className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-surface-500 dark:text-surface-400">
          {substitutionSources.map(source => <span key={source.name} className={source.error ? 'text-amber-700 dark:text-amber-300' : ''}>
            {source.name}: {source.error ? 'nicht geladen – Änderungen können fehlen' : source.updated ? `Stand ${formatSourceDate(source.updated)}` : 'abgeglichen'}
          </span>)}
          <button type="button" disabled={loading} onClick={() => setReloadKey(value => value + 1)} className="font-medium text-primary-600 disabled:opacity-50 dark:text-primary-400">Aktualisieren</button>
        </div>

        {preferences.timetable.show_exams && examsError && (
          <div role="status" className="mb-4 flex flex-wrap items-center gap-2 text-sm text-surface-500 dark:text-surface-400">
            <span>Klausurtermine aus Lerngruppen konnten nicht geladen werden.</span>
            <button type="button" className="font-medium text-primary-600 dark:text-primary-400" onClick={() => setReloadKey(value => value + 1)}>Erneut versuchen</button>
          </div>
        )}

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
        ) : lessonCount === 0 && visibleExamCount === 0 && noticeCount === 0 ? (
          <div className="card flex min-h-64 flex-col items-center justify-center text-center">
            <CalendarDaysIcon className="mb-3 h-10 w-10 text-surface-300" />
            <h2 className="font-semibold text-surface-900 dark:text-white">Keine Stunden eingetragen</h2>
            <p className="mt-1 text-sm text-surface-500">Für diese Woche wurden keine Unterrichtsstunden gefunden.</p>
          </div>
        ) : preferences.timetable.layout_mode === 'compact' ? (
          <div className="space-y-3">
            {visibleDays.flatMap(day => (day.substitutionNotices || []).map((item, index) => (
              <div key={`${day.date}-notice-${index}`} className="flex flex-wrap items-center gap-x-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                <span className="font-semibold">{day.name} · {item.kind || 'Vertretung'}</span>
                <span>{[item.periods.length ? `${item.periods.join(', ')}. Std.` : '', item.subject, item.teacher, item.room, item.info].filter(Boolean).join(' · ')}</span>
                <Link className="ml-auto font-medium text-primary-700 dark:text-primary-300" to={`${basePath}/${item.source === 'DSB' ? 'dsb' : 'vertretungsplan'}`}>Plan ansehen →</Link>
              </div>
            )))}
            <TimelineView days={visibleDays} exams={displayedExams} timeSlots={timeSlots} onOpenCourse={openCourse} />
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
                    {day.lessons.length === 0 && (day.substitutionNotices || []).length === 0 && !displayedExams.some(exam => exam.date === day.date) && <p className="py-8 text-center text-sm text-surface-400">Unterrichtsfrei</p>}
                    {(day.substitutionNotices || []).map((item, index) => <div key={`notice-${index}`} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-800 dark:bg-amber-950/30">
                      <p className="font-semibold text-amber-800 dark:text-amber-200">{item.kind || 'Vertretung'} · {item.periods.length ? `${item.periods.join(', ')}. Std.` : 'Stunde offen'}</p>
                      <p className="mt-1">{[item.classes, item.subject, item.teacher, item.room, item.info].filter(Boolean).join(' · ')}</p>
                      <p className="mt-1 text-surface-500">Nicht eindeutig zugeordnet · {item.source}</p>
                      <Link className="mt-1 inline-block font-medium text-primary-600 dark:text-primary-400" to={`${basePath}/${item.source === 'DSB' ? 'dsb' : 'vertretungsplan'}`}>Plan ansehen →</Link>
                    </div>)}
                    {timetableEntries(day.lessons, displayedExams.filter(exam => exam.date === day.date), timeSlots).map(({ lesson, exam, replaced }, index) => exam ? (
                      <article key={`exam-${exam.id}-${index}`} className="rounded-xl border border-violet-200 bg-violet-50 p-3 dark:border-violet-800 dark:bg-violet-950/40">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <p className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300"><AcademicCapIcon className="h-4 w-4" aria-hidden="true" />{exam.type || 'Klausur'}</p>
                          {lesson.period != null && <span className="badge badge-surface">{lesson.period} Std.</span>}
                        </div>
                        <p className="break-words font-semibold text-surface-900 dark:text-white">{lesson.subject}</p>
                        <div className="mt-2 space-y-1 text-xs text-surface-500 dark:text-surface-400">
                          {(lesson.start_time || lesson.end_time) && <p className="flex items-center gap-1.5"><ClockIcon className="h-3.5 w-3.5" />{lesson.start_time}{lesson.end_time ? ` – ${lesson.end_time}` : ''}</p>}
                          {lesson.period == null && <p>{exam.hours || 'Stunden nicht angegeben'}</p>}
                          {exam.duration_label && <p>Bearbeitungszeit: {exam.duration_label}</p>}
                          {lesson.teacher && <p className="flex items-center gap-1.5"><UserIcon className="h-3.5 w-3.5" />{lesson.teacher}</p>}
                          {lesson.room && <p className="flex items-center gap-1.5"><MapPinIcon className="h-3.5 w-3.5" />{lesson.room}</p>}
                        </div>
                        {Boolean(replaced?.length) && <p className="mt-2 text-xs font-medium text-violet-700 dark:text-violet-300">Statt: {replaced!.join(', ')}</p>}
                        <HomeworkPreview homework={lesson.homework} />
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-violet-600 dark:text-violet-400">
                          <Link to={`${basePath}/study-groups`}>Aus Lerngruppen →</Link>
                          {lesson.course_id && <Link to={`${basePath}/courses/${lesson.course_id}`}>Mein Unterricht →</Link>}
                        </div>
                      </article>
                    ) : (
                      <article
                        key={lesson.id || `${day.date}-${index}`}
                        className={`rounded-xl border p-3 transition-all ${lesson.cancelled ? 'border-red-200 bg-red-50/70 opacity-75 dark:border-red-900 dark:bg-red-950/30' : lesson.substitution ? 'border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20' : 'bg-white dark:bg-surface-900'} ${lesson.course_id ? 'cursor-pointer hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:hover:border-primary-700 dark:focus-visible:ring-offset-surface-900' : ''}`}
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
                        {lesson.substitution && <div className="mt-2 border-t pt-2 text-xs text-amber-800 dark:text-amber-200">
                          <p className="font-semibold">{lesson.substitution.kind || (lesson.cancelled ? 'Entfall' : 'Vertretung')} · {lesson.substitution.source}</p>
                          {lesson.original_lesson && <p className="mt-1 text-surface-500">Geplant: {[lesson.original_lesson.subject, lesson.original_lesson.teacher, lesson.original_lesson.room].filter(Boolean).join(' · ')}</p>}
                        </div>}
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

const formatSourceDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : format(date, 'dd.MM. HH:mm');
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
  const { preferences } = usePreferences();
  if (!preferences.timetable.show_homework || !homework?.length) return null;
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
  exams: StudyGroupExam[];
  timeSlots: NonNullable<TimetableResponse['time_slots']>;
  onOpenCourse: (lesson: TimetableLesson) => void;
}> = ({ days, exams, timeSlots, onOpenCourse }) => {
  const { preferences } = usePreferences();
  const layoutsByDate = useMemo(() => new Map(days.map(day => [
    day.date,
    layoutTimetableEntries(timetableEntries(day.lessons, exams.filter(exam => exam.date === day.date), timeSlots)),
  ])), [days, exams, timeSlots]);
  const usedPeriods = [...new Set([...layoutsByDate.values()].flatMap(layout => (
    layout.scheduled.flatMap(item => [item.startPeriod, item.endPeriod])
  )))].sort((left, right) => left - right);
  const firstPeriod = usedPeriods[0];
  const lastPeriod = usedPeriods[usedPeriods.length - 1];
  const slotsByPeriod = new Map(timeSlots.map(slot => [slot.period, { ...slot }]));
  for (const layout of layoutsByDate.values()) {
    for (const { entry: { lesson }, startPeriod: first, endPeriod: last } of layout.scheduled) {
      const firstSlot = slotsByPeriod.get(first) || { period: first, start_time: '', end_time: '' };
      const lastSlot = slotsByPeriod.get(last) || { period: last, start_time: '', end_time: '' };
      if (lesson.start_time && !firstSlot.start_time) firstSlot.start_time = lesson.start_time;
      if (lesson.end_time && !lastSlot.end_time) lastSlot.end_time = lesson.end_time;
      slotsByPeriod.set(first, firstSlot);
      slotsByPeriod.set(last, lastSlot);
    }
  }
  const usedTimeSlots = firstPeriod == null || lastPeriod == null
    ? []
    : Array.from({ length: lastPeriod - firstPeriod + 1 }, (_, index) => {
      const period = firstPeriod + index;
      return slotsByPeriod.get(period) || { period, start_time: '', end_time: '' };
    });
  const slotCount = usedTimeSlots.length;
  const scheduleHeight = `${slotCount * 4}rem`;
  const columns = `clamp(2.75rem, 10vw, 6rem) repeat(${days.length}, minmax(0, 1fr))`;
  const unscheduled = days.flatMap(day => (
    layoutsByDate.get(day.date)?.unscheduled.map(entry => ({ day, entry })) || []
  ));

  return (
    <div className="overflow-hidden rounded-xl border border-surface-200 bg-white sm:rounded-2xl dark:border-surface-800 dark:bg-surface-900" role="table" aria-label="Kompakter farbiger Stundenplan">
      <div className="grid border-b" style={{ gridTemplateColumns: columns }} role="row">
        <div className="border-r bg-surface-50 px-0.5 py-2 text-center text-[8px] font-semibold uppercase tracking-wide text-surface-400 sm:px-3 sm:py-3 sm:text-left sm:text-xs dark:bg-surface-800/60" role="columnheader">Std.</div>
        {days.map(day => {
          const date = new Date(`${day.date}T12:00:00`);
          const today = isToday(date);
          return <div key={day.date} className={`px-0.5 py-2 text-center text-[10px] font-semibold sm:px-3 sm:py-3 sm:text-left sm:text-sm ${today ? 'bg-primary-50 text-primary-800 dark:bg-primary-950/50 dark:text-primary-200' : ''}`} role="columnheader">
            <span className="sm:hidden">{day.name?.slice(0, 2) || format(date, 'EE', { locale: de })}</span><span className="hidden sm:inline">{day.name || format(date, 'EEEE', { locale: de })}</span>
            <span className="mt-0.5 block text-[9px] font-normal text-surface-500 sm:text-xs"><span className="sm:hidden">{format(date, 'dd.MM.')}</span><span className="hidden sm:inline">{format(date, 'd. MMMM', { locale: de })}</span></span>
          </div>;
        })}
      </div>

      {slotCount > 0 && <div className="grid" style={{ gridTemplateColumns: columns }} role="row">
        <div className="relative border-r bg-surface-50 dark:bg-surface-800/40" style={{ height: scheduleHeight }} role="rowheader">
          {usedTimeSlots.map((slot, index) => <div key={slot.period} className="absolute inset-x-0 border-t px-0.5 py-1.5 text-center sm:px-3 sm:py-2 sm:text-left" style={{ top: `${(index / slotCount) * 100}%`, height: `${100 / slotCount}%` }}>
            <span className="block text-[10px] font-semibold sm:text-sm">{slot.period}.</span>
            {(slot.start_time || slot.end_time) && <span className="mt-0.5 block text-[7px] font-normal leading-tight text-surface-500 sm:mt-1 sm:text-xs sm:leading-normal">{slot.start_time}<br />{slot.end_time}</span>}
          </div>)}
        </div>
        {days.map((day, dayIndex) => {
          const layout = layoutsByDate.get(day.date);
          return <div key={day.date} className={`relative ${dayIndex < days.length - 1 ? 'border-r' : ''}`} style={{ height: scheduleHeight }} role="cell">
            {usedTimeSlots.map((slot, index) => <div key={slot.period} className="absolute inset-x-0 border-t bg-surface-50/40 dark:bg-surface-800/10" style={{ top: `${(index / slotCount) * 100}%`, height: `${100 / slotCount}%` }} aria-hidden="true" />)}
            {layout?.scheduled.map(({ entry, startPeriod, endPeriod, lane, laneCount }, index) => (
              <div
                key={entry.exam
                  ? `exam-${entry.exam.id}-${startPeriod}-${endPeriod}`
                  : `lesson-${entry.lesson.id || entry.lesson.course_id || entry.lesson.subject}-${startPeriod}-${endPeriod}`}
                className="absolute min-w-0 p-0.5 sm:p-1"
                style={{
                  top: `${((startPeriod - firstPeriod) / slotCount) * 100}%`,
                  height: `${((endPeriod - startPeriod + 1) / slotCount) * 100}%`,
                  left: `${(lane / laneCount) * 100}%`,
                  width: `${100 / laneCount}%`,
                }}
              >
                <CompactTimetableEntry entry={entry} showHomework={preferences.timetable.show_homework} onOpenCourse={onOpenCourse} />
              </div>
            ))}
          </div>;
        })}
      </div>}

      {unscheduled.length > 0 && <section className="border-t p-3" aria-labelledby="unscheduled-timetable-entries">
        <h3 id="unscheduled-timetable-entries" className="text-xs font-semibold text-surface-700 dark:text-surface-300">Ohne Stundenangabe</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {unscheduled.map(({ day, entry }, index) => <div key={entry.exam ? `unscheduled-${entry.exam.id}` : `unscheduled-${day.date}-${index}`} className="rounded-lg bg-surface-50 p-1.5 dark:bg-surface-800/40">
            <p className="mb-1 px-1 text-[10px] font-medium text-surface-500">{day.name || format(new Date(`${day.date}T12:00:00`), 'EEEE', { locale: de })} · Stunden nicht angegeben</p>
            <CompactTimetableEntry entry={entry} showHomework={preferences.timetable.show_homework} onOpenCourse={onOpenCourse} />
          </div>)}
        </div>
      </section>}
    </div>
  );
};

const CompactTimetableEntry: React.FC<{
  entry: TimetableEntry;
  showHomework: boolean;
  onOpenCourse: (lesson: TimetableLesson) => void;
}> = ({ entry: { lesson, exam }, showHomework, onOpenCourse }) => (
  <div
    className={`relative flex h-full min-w-0 flex-col justify-center overflow-hidden rounded-md border p-1 text-white shadow-sm transition sm:rounded-xl sm:p-2.5 ${exam ? 'border-violet-700 bg-violet-600 dark:bg-violet-700' : subjectColour(lesson)} ${lesson.cancelled ? '!border-red-700 !bg-red-600 opacity-70' : ''} ${lesson.substitution ? 'ring-2 ring-inset ring-amber-300' : ''} ${lesson.course_id ? 'cursor-pointer hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900' : ''}`}
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
      <span className={`min-w-0 break-words text-[10px] font-bold leading-tight sm:text-sm ${lesson.cancelled ? 'line-through' : ''}`} title={lesson.subject}>
        <span className="sm:hidden">{shortSubject(lesson.subject)}</span><span className="hidden sm:inline">{lesson.subject}</span>
      </span>
      {exam ? <AcademicCapIcon className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" aria-label={exam.type || 'Klausur'} /> : lesson.week_type ? <span className="rounded bg-white/20 px-1 text-[8px] font-bold sm:text-[10px]">{lesson.week_type}</span> : null}
    </div>
    <div className="mt-1 space-y-0.5 text-[8px] leading-tight text-white/90 sm:mt-2 sm:space-y-1 sm:text-xs sm:leading-normal">
      {exam && <p className="truncate font-semibold">{exam.type || 'Klausur'}</p>}
      {lesson.teacher && <p>{lesson.teacher}</p>}
      {lesson.room && <p>{lesson.room}</p>}
    </div>
    {!exam && showHomework && Boolean(lesson.homework?.length) && <span className="mt-1 inline-flex items-center gap-0.5 text-[8px] font-semibold text-white/90 sm:text-[10px]" title="Hausaufgabe vorhanden"><BookOpenIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> HA</span>}
  </div>
);

const SUBJECT_COLOURS = [
  'border-blue-800 bg-blue-700 dark:bg-blue-700',
  'border-emerald-800 bg-emerald-700 dark:bg-emerald-700',
  'border-orange-800 bg-orange-700 dark:bg-orange-700',
  'border-fuchsia-800 bg-fuchsia-700 dark:bg-fuchsia-700',
  'border-cyan-800 bg-cyan-700 dark:bg-cyan-700',
  'border-rose-800 bg-rose-700 dark:bg-rose-700',
  'border-indigo-800 bg-indigo-700 dark:bg-indigo-700',
  'border-lime-800 bg-lime-700 dark:bg-lime-700',
] as const;

const subjectColour = (lesson: TimetableLesson) => {
  const key = String(lesson.course_id || lesson.course_name || lesson.subject).normalize('NFKC').toLocaleLowerCase('de');
  const hash = [...key].reduce((value, character) => ((value * 31) + character.charCodeAt(0)) | 0, 0);
  return SUBJECT_COLOURS[(hash >>> 0) % SUBJECT_COLOURS.length];
};

const SUBJECT_SHORT_NAMES: Record<string, string> = {
  deutsch: 'D', mathematik: 'M', englisch: 'E', biologie: 'Bio', geschichte: 'G',
  informatik: 'Inf', sport: 'Sp', kunst: 'Ku', musik: 'Mu', physik: 'Ph', chemie: 'Ch',
  erdkunde: 'Ek', geografie: 'Geo', religion: 'Rel', ethik: 'Eth', politik: 'Po',
};

const shortSubject = (subject: string) => {
  const normalized = subject.normalize('NFKC').trim().toLocaleLowerCase('de');
  return SUBJECT_SHORT_NAMES[normalized] || subject.trim().split(/\s+/).map(part => part[0]).join('').slice(0, 4) || '–';
};

export default Timetable;
