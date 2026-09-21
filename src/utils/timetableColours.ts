import type { TimetableLesson } from '../types';

export type TimetableColourLesson = Pick<
  TimetableLesson,
  'subject' | 'class_name' | 'course_name'
> & { course_id?: string | null };

export const TIMETABLE_CLASS_COLOURS = [
  '#2563eb',
  '#059669',
  '#ea580c',
  '#c026d3',
  '#0891b2',
  '#e11d48',
  '#4f46e5',
  '#65a30d',
  '#7c3aed',
  '#0d9488',
  '#ca8a04',
  '#db2777',
] as const;

const normalize = (value: unknown) => String(value || '')
  .normalize('NFKC')
  .trim()
  .toLocaleLowerCase('de-DE');

export const timetableClassKey = (lesson: TimetableColourLesson): string => {
  const courseId = normalize(lesson.course_id);
  if (courseId) return `course:${courseId}`;
  return `subject:${normalize(lesson.subject) || 'unterricht'}`;
};

const hashKey = (key: string): number => [...key].reduce(
  (value, character) => ((value * 31) + character.charCodeAt(0)) | 0,
  0,
) >>> 0;

export const defaultTimetableClassColours = (
  lessons: TimetableColourLesson[],
): Record<string, string> => {
  const keys = [...new Set(lessons.map(timetableClassKey))].sort();
  const used = new Set<number>();

  return Object.fromEntries(keys.map(key => {
    const preferredIndex = hashKey(key) % TIMETABLE_CLASS_COLOURS.length;
    let index = preferredIndex;
    if (used.size < TIMETABLE_CLASS_COLOURS.length) {
      while (used.has(index)) index = (index + 1) % TIMETABLE_CLASS_COLOURS.length;
      used.add(index);
    }
    return [key, TIMETABLE_CLASS_COLOURS[index]];
  }));
};

export const timetableClassColour = (
  lesson: TimetableColourLesson,
  defaults: Record<string, string>,
  overrides: Record<string, string>,
): string => overrides[timetableClassKey(lesson)] || defaults[timetableClassKey(lesson)] || TIMETABLE_CLASS_COLOURS[0];

export const contrastingTextColour = (colour: string): '#111827' | '#ffffff' => {
  const match = colour.match(/^#([0-9a-f]{6})$/i);
  if (!match) return '#ffffff';
  const value = Number.parseInt(match[1], 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return ((red * 299) + (green * 587) + (blue * 114)) / 1000 > 160 ? '#111827' : '#ffffff';
};
