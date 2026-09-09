import { StudyGroupExam, TimetableLesson, TimetableResponse } from '../types';

type TimeSlots = NonNullable<TimetableResponse['time_slots']>;
export type TimetableEntry = {
  lesson: TimetableLesson;
  exam?: StudyGroupExam;
  replaced?: string[];
};

// Accept portal lists ("3., 4.") and ranges ("3.–4. Stunde"), not clock times.
export const examPeriods = (value: string | null): number[] => {
  const text = (value || '').replace(/\b(?:Std|Stunde[n]?)\.?/gi, '').trim();
  if (!/^\d+[\d\s.,–—-]*$/.test(text)) return [];
  const periods = new Set<number>();
  for (const part of text.split(',')) {
    const match = part.trim().match(/^(\d+)\.?\s*(?:[–—-]\s*(\d+)\.?)?$/);
    if (!match) return [];
    const start = Number(match[1]);
    const end = Number(match[2] || start);
    if (start < 1 || end < start || end > 30) return [];
    for (let period = start; period <= end; period++) periods.add(period);
  }
  return [...periods].sort((a, b) => a - b);
};

const lessonPeriods = (lesson: TimetableLesson): number[] => {
  const parsed = examPeriods(String(lesson.period ?? ''));
  if (parsed.length !== 1) return parsed;
  return Array.from({ length: Math.max(1, lesson.duration || 1) }, (_, index) => parsed[0] + index);
};
const normalize = (name: string | null | undefined) => (name || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('de');
const runs = (periods: number[]): number[][] => periods.reduce<number[][]>((result, period) => {
  const last = result[result.length - 1];
  if (last && last[last.length - 1] + 1 === period) last.push(period);
  else result.push([period]);
  return result;
}, []);
const atPeriods = (lesson: TimetableLesson, periods: number[], slots: TimeSlots): TimetableLesson => {
  const original = lessonPeriods(lesson);
  const first = periods[0];
  const last = periods[periods.length - 1];
  return {
    ...lesson,
    period: first === last ? first : `${first}–${last}`,
    duration: periods.length,
    start_time: slots.find(slot => slot.period === first)?.start_time || (original[0] === first ? lesson.start_time : undefined),
    end_time: slots.find(slot => slot.period === last)?.end_time || (original[original.length - 1] === last ? lesson.end_time : undefined),
  };
};

export const timetableEntries = (lessons: TimetableLesson[], exams: StudyGroupExam[], slots: TimeSlots = []): TimetableEntry[] => {
  const occupied = new Set(exams.flatMap(exam => examPeriods(exam.hours)));
  const entries: TimetableEntry[] = lessons.flatMap(lesson => {
    const periods = lessonPeriods(lesson);
    if (!periods.some(period => occupied.has(period))) return [{ lesson }];
    return runs(periods.filter(period => !occupied.has(period))).map(run => ({ lesson: atPeriods(lesson, run, slots) }));
  });
  for (const exam of exams) {
    const periods = examPeriods(exam.hours);
    if (!periods.length) {
      entries.push({ exam, lesson: { subject: exam.course_name || 'Klausur' } });
      continue;
    }
    for (const run of runs(periods)) {
      const overlapping = lessons.filter(lesson => lessonPeriods(lesson).some(period => run.includes(period)));
      // Lerngruppen IDs and Mein-Unterricht IDs belong to different namespaces.
      // Use the course name supplied by the existing backend course mapping.
      const matches = (lesson: TimetableLesson) => Boolean(exam.course_name) && normalize(lesson.course_name) === normalize(exam.course_name);
      const matching = overlapping.filter(matches);
      const base = matching[0];
      const examLesson = atPeriods({
        ...base,
        subject: exam.course_name || 'Klausur',
        homework: matching.flatMap(lesson => lesson.homework || []),
      }, run, slots);
      // A replaced subject still supplies valid time boundaries. Only reuse
      // exact boundaries: a partial double lesson does not reveal its midpoint.
      examLesson.start_time ||= overlapping.find(lesson =>
        lessonPeriods(lesson)[0] === run[0] && lesson.start_time,
      )?.start_time;
      examLesson.end_time ||= overlapping.find(lesson => {
        const periods = lessonPeriods(lesson);
        return periods[periods.length - 1] === run[run.length - 1] && lesson.end_time;
      })?.end_time;
      entries.push({
        exam,
        lesson: examLesson,
        replaced: [...new Set(overlapping.filter(lesson => !matches(lesson)).map(lesson => lesson.course_name || lesson.subject))],
      });
    }
  }
  return entries.sort((a, b) => (lessonPeriods(a.lesson)[0] ?? Infinity) - (lessonPeriods(b.lesson)[0] ?? Infinity));
};
