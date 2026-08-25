import {
  addDays,
  addWeeks,
  differenceInCalendarWeeks,
  format,
  getDay,
  startOfDay,
  startOfWeek,
} from 'date-fns';
import { CustomLesson, TimetableDay, TimetableLesson } from '../types';

export type TimetableViewMode = 'rolling' | 'week';

export const TIMETABLE_VIEW_MODE_KEY = 'lanis_timetable_view_mode';
export const DEFAULT_TIMETABLE_VIEW_MODE: TimetableViewMode = 'rolling';

export const getStoredTimetableViewMode = (): TimetableViewMode => {
  if (typeof window === 'undefined') return DEFAULT_TIMETABLE_VIEW_MODE;
  const value = window.localStorage.getItem(TIMETABLE_VIEW_MODE_KEY);
  return value === 'week' || value === 'rolling' ? value : DEFAULT_TIMETABLE_VIEW_MODE;
};

export const storeTimetableViewMode = (mode: TimetableViewMode) => {
  window.localStorage.setItem(TIMETABLE_VIEW_MODE_KEY, mode);
};

const parseDate = (value: string): Date => new Date(`${value}T12:00:00`);
const dateKey = (value: Date): string => format(value, 'yyyy-MM-dd');
const periodStart = (value: unknown): number => Number(String(value ?? '').match(/\d+/)?.[0] || 999);

export const weekTypeForDate = (
  value: Date,
  referenceMonday: Date,
  referenceWeek: 'A' | 'B' | undefined,
): 'A' | 'B' | undefined => {
  if (!referenceWeek) return undefined;
  const offset = differenceInCalendarWeeks(value, referenceMonday, { weekStartsOn: 1 });
  return Math.abs(offset) % 2 === 0 ? referenceWeek : referenceWeek === 'A' ? 'B' : 'A';
};

const datesForMode = (mode: TimetableViewMode, today: Date): Date[] => {
  const current = startOfDay(today);
  if (mode === 'rolling') {
    return Array.from({ length: 7 }, (_, index) => addDays(current, index))
      .filter(value => getDay(value) >= 1 && getDay(value) <= 5);
  }

  let monday = startOfWeek(current, { weekStartsOn: 1 });
  if (getDay(current) === 0 || getDay(current) === 6) monday = addWeeks(monday, 1);
  return Array.from({ length: 5 }, (_, index) => addDays(monday, index));
};

const matchingLessonIndex = (lessons: TimetableLesson[], override: CustomLesson): number => {
  const candidates = lessons
    .map((lesson, index) => ({ lesson, index }))
    .filter(({ lesson }) => periodStart(lesson.period) === periodStart(override.period));
  if (!candidates.length) return -1;
  if (override.course_id) {
    return candidates.find(({ lesson }) => lesson.course_id === override.course_id)?.index ?? -1;
  }
  return candidates[0].index;
};

const customLesson = (override: CustomLesson, existing?: TimetableLesson): TimetableLesson => {
  const start = periodStart(override.period);
  const duration = Math.max(1, Number(override.duration) || 1);
  const period = duration > 1 && start !== 999 ? `${start}–${start + duration - 1}` : override.period;
  return {
    ...existing,
    id: `custom-${override.date}-${override.period}`,
    period,
    subject: override.subject || 'Unterricht',
    teacher: override.teacher || undefined,
    room: override.room || undefined,
    class_name: override.class_name || undefined,
    info: override.info || undefined,
    start_time: override.start_time || existing?.start_time,
    end_time: override.end_time || existing?.end_time,
    duration,
    week_type: override.week_type,
    course_id: override.course_id || existing?.course_id,
    is_custom: true,
  };
};

const applyOverrides = (
  lessons: TimetableLesson[],
  overrides: CustomLesson[],
  activeWeek: 'A' | 'B' | undefined,
): TimetableLesson[] => {
  const result = [...lessons];
  overrides.forEach(override => {
    if (override.week_type && activeWeek && override.week_type !== activeWeek) return;
    const index = matchingLessonIndex(result, override);
    if (override.removed) {
      if (index >= 0) result.splice(index, 1);
      return;
    }
    const replacement = customLesson(override, index >= 0 ? result[index] : undefined);
    if (index >= 0) result[index] = replacement;
    else result.push(replacement);
  });
  return result.sort((left, right) => periodStart(left.period) - periodStart(right.period));
};

export const projectTimetableDays = (
  templateDays: TimetableDay[],
  referenceWeek: 'A' | 'B' | undefined,
  referenceWeekStart: string | undefined,
  mode: TimetableViewMode,
  overrides: CustomLesson[] = [],
  today: Date = new Date(),
): TimetableDay[] => {
  if (!templateDays.length) return [];
  const templatesByWeekday = new Map(
    templateDays.map(day => [getDay(parseDate(day.date)), day]),
  );
  const referenceMonday = referenceWeekStart
    ? parseDate(referenceWeekStart)
    : startOfWeek(parseDate(templateDays[0].date), { weekStartsOn: 1 });

  return datesForMode(mode, today).flatMap(value => {
    const template = templatesByWeekday.get(getDay(value));
    if (!template) return [];
    const activeWeek = weekTypeForDate(value, referenceMonday, referenceWeek);
    const lessons = template.lessons
      .filter(lesson => !lesson.week_type || !activeWeek || lesson.week_type === activeWeek)
      .map(lesson => ({ ...lesson }));
    const key = dateKey(value);
    return [{
      ...template,
      date: key,
      lessons: applyOverrides(
        lessons,
        overrides.filter(override => override.date === key),
        activeWeek,
      ),
    }];
  });
};
