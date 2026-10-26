import type { CourseEntry, CoursesResponse } from '../types';

// Lesson activity can be empty even while the student has course folders.
export function getOverviewCourses(overview: CoursesResponse): CourseEntry[] {
  const courses = new Map<string, CourseEntry>();
  for (const folder of overview.courses ?? []) {
    if (!folder.book_id) continue;
    courses.set(folder.book_id, {
      entry_id: null,
      teacher_message_link: '',
      thema: '',
      datum: '',
      homework: '',
      homework_done: false,
      ...folder,
    });
  }

  const seenEntries = new Set<string>();
  for (const entry of overview.entries) {
    if (!entry.book_id) continue;
    const existing = courses.get(entry.book_id);
    // The overview lists the latest activity first. Keep one card per course.
    if (seenEntries.has(entry.book_id)) continue;
    seenEntries.add(entry.book_id);
    courses.set(entry.book_id, {
      ...entry,
      name: entry.name || existing?.name || '',
      course_link: entry.course_link || existing?.course_link || '',
      teacher_full_name: entry.teacher_full_name || existing?.teacher_full_name || '',
      teacher_short: entry.teacher_short || existing?.teacher_short || '',
    });
  }
  return Array.from(courses.values());
}
