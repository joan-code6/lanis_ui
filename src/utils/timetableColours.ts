import type { TimetableLesson } from '../types';

export type TimetableColourLesson = Pick<
  TimetableLesson,
  'subject' | 'class_name' | 'course_name'
> & { course_id?: string | null };

const normalize = (value: unknown) => String(value || '')
  .normalize('NFKC')
  .trim()
  .toLocaleLowerCase('de-DE');

export const timetableClassKey = (lesson: TimetableColourLesson): string => {
  const courseId = normalize(lesson.course_id);
  if (courseId) return `course:${courseId}`;
  const courseName = normalize(lesson.course_name);
  if (courseName) return `course-name:${courseName}`;
  return `subject:${normalize(lesson.subject) || 'unterricht'}`;
};

const hashKey = (key: string): number => [...key].reduce(
  (value, character) => Math.imul(value ^ character.charCodeAt(0), 16777619),
  2166136261,
) >>> 0;

export const defaultTimetableClassColours = (
  lessons: TimetableColourLesson[],
): Record<string, string> => {
  const keys = [...new Set(lessons.map(timetableClassKey))].sort();
  return Object.fromEntries(keys.map(key => [key, defaultTimetableClassColour(key)]));
};

const hslToHex = (hue: number, saturation: number, lightness: number): string => {
  const chroma = (1 - Math.abs((2 * lightness) - 1)) * saturation;
  const sector = hue / 60;
  const second = chroma * (1 - Math.abs((sector % 2) - 1));
  const [red, green, blue] = sector < 1 ? [chroma, second, 0]
    : sector < 2 ? [second, chroma, 0]
      : sector < 3 ? [0, chroma, second]
        : sector < 4 ? [0, second, chroma]
          : sector < 5 ? [second, 0, chroma]
            : [chroma, 0, second];
  const match = lightness - (chroma / 2);
  return `#${[red, green, blue].map(value => Math.round((value + match) * 255).toString(16).padStart(2, '0')).join('')}`;
};

export const defaultTimetableClassColour = (key: string): string => {
  const hash = hashKey(key);
  const hue = hash % 360;
  const saturation = 0.62 + ((hash >>> 9) % 12) / 100;
  const lightness = 0.38 + ((hash >>> 17) % 8) / 100;
  return hslToHex(hue, saturation, lightness);
};

export const timetableClassColour = (
  lesson: TimetableColourLesson,
  defaults: Record<string, string>,
  overrides: Record<string, string>,
): string => overrides[timetableClassKey(lesson)] || defaults[timetableClassKey(lesson)] || defaultTimetableClassColour(timetableClassKey(lesson));

export const contrastingTextColour = (colour: string): '#111827' | '#ffffff' => {
  const match = colour.match(/^#([0-9a-f]{6})$/i);
  if (!match) return '#ffffff';
  const value = Number.parseInt(match[1], 16);
  const relativeLuminance = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * relativeLuminance((value >> 16) & 255)
    + 0.7152 * relativeLuminance((value >> 8) & 255)
    + 0.0722 * relativeLuminance(value & 255);
  const contrast = (foreground: number) => (Math.max(luminance, foreground) + 0.05) / (Math.min(luminance, foreground) + 0.05);
  return contrast(0.007) >= contrast(1) ? '#111827' : '#ffffff';
};
