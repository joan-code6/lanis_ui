import type { CourseEntry, CoursesResponse } from '../types';

export const normalizeCourseList = (response: CoursesResponse): CourseEntry[] => {
  const entries = response.entries || [];
  if (!Array.isArray(response.courses)) return entries;

  const latestEntryByCourse = new Map<string, CourseEntry>();
  for (const entry of entries) {
    if (entry.book_id && !latestEntryByCourse.has(entry.book_id)) {
      latestEntryByCourse.set(entry.book_id, entry);
    }
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
    };
  });
};
