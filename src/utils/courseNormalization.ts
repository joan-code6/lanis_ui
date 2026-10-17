import type { CourseEntry, CoursesResponse } from '../types';

const MAX_COURSE_SEARCH_TEXT_LENGTH = 8192;

/**
 * Normalize a Mein Unterricht overview into one record per course.
 *
 * Course folders are authoritative when present; recent activities supply card details, while
 * searchable text is collected from all activities and bounded per course.
 *
 * @param response - The overview response from the LANIS API.
 * @returns Normalized course records, or legacy activity entries when folders are unavailable.
 */
export const normalizeCourseList = (response: CoursesResponse): CourseEntry[] => {
  const entries = response.entries || [];
  if (!Array.isArray(response.courses)) return entries;

  const latestEntryByCourse = new Map<string, CourseEntry>();
  for (const entry of entries) {
    if (entry.book_id && !latestEntryByCourse.has(entry.book_id)) {
      latestEntryByCourse.set(entry.book_id, entry);
    }
  }

  const activitySearchTextByCourse = new Map<string, string>();
  for (const entry of entries) {
    if (!entry.book_id) continue;
    const searchableText = [entry.thema, entry.homework].filter(Boolean).join(' ');
    if (!searchableText) continue;
    const courseSearchText = activitySearchTextByCourse.get(entry.book_id) || '';
    if (courseSearchText.length >= MAX_COURSE_SEARCH_TEXT_LENGTH) continue;
    const separator = courseSearchText ? ' ' : '';
    const remainingLength = MAX_COURSE_SEARCH_TEXT_LENGTH - courseSearchText.length;
    activitySearchTextByCourse.set(
      entry.book_id,
      courseSearchText + `${separator}${searchableText}`.slice(0, remainingLength),
    );
  }

  return response.courses.map((course) => {
    const activity = latestEntryByCourse.get(course.book_id);
    return {
      entry_id: activity?.entry_id ?? null,
      book_id: course.book_id,
      name: course.name || activity?.name || '',
      course_link: course.course_link || activity?.course_link || '',
      teacher_full_name: course.teacher_full_name || activity?.teacher_full_name || '',
      teacher_short: course.teacher_short || activity?.teacher_short || '',
      teacher_message_link: activity?.teacher_message_link || '',
      thema: activity?.thema || '',
      datum: activity?.datum || '',
      homework: activity?.homework || '',
      homework_done: activity?.homework_done || false,
      search_text: activitySearchTextByCourse.get(course.book_id) || '',
    };
  });
};
