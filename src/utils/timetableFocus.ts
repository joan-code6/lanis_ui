import { TimetableEntry } from './timetableExams';

export type LessonFocus = { date: string; entry: TimetableEntry; status: 'current' | 'next' };

// Compare complete dates so breaks, free days and overnight transitions work alike.
export const focusedTimetableEntry = (
  entriesByDate: Map<string, TimetableEntry[]>, now: Date,
): LessonFocus | undefined => {
  const candidates = [...entriesByDate].flatMap(([date, entries]) => entries.flatMap(entry => {
    const { lesson } = entry;
    if (lesson.cancelled || !lesson.start_time || !lesson.end_time) return [];
    const start = new Date(`${date}T${lesson.start_time}`).getTime();
    const end = new Date(`${date}T${lesson.end_time}`).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end <= now.getTime()) return [];
    return [{ date, entry, start }];
  })).sort((a, b) => a.start - b.start);
  const target = candidates.find(item => item.start <= now.getTime()) || candidates[0];
  return target ? { date: target.date, entry: target.entry, status: target.start <= now.getTime() ? 'current' : 'next' } : undefined;
};
