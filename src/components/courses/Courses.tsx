import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useBasePath } from '../../contexts/BasePathContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useNavigate, useParams } from 'react-router-dom';
import { coursesAPI } from '../../services/api';
import axios from 'axios';
import SEO from '../seo/SEO';
import { 
  CourseEntry,
  CoursesResponse,
  CourseDetailsResponse,
  CourseDetails,
  CourseMark,
  CourseDetailEntry,
  EntryDetailsResponse,
  EntryDetails,
  WeeklyViewResponse,
  WeeklyEntry,
  SubmissionsResponse,
  Submission 
} from '../../types';
import {
  AcademicCapIcon,
  CalendarDaysIcon,
  ClockIcon,
  DocumentTextIcon,
  ArrowLeftIcon,
  PaperClipIcon,
  ChevronRightIcon,
  ArrowTopRightOnSquareIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  ChartBarIcon,
  ListBulletIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import clsx from 'clsx';

type ViewMode = 'overview' | 'course-detail' | 'weekly' | 'submissions' | 'entry-detail';
type CourseDetailTab = 'history' | 'performance' | 'exams';

const courseDetailTabs: Array<{
  id: CourseDetailTab;
  label: string;
  icon: React.ElementType;
}> = [
  { id: 'history', label: 'Historie', icon: ListBulletIcon },
  { id: 'performance', label: 'Leistungen', icon: ChartBarIcon },
  { id: 'exams', label: 'Klausuren', icon: DocumentTextIcon },
];

const EmptyCourseTab: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <div className="card py-12 text-center">
    {icon}
    <h3 className="mt-3 text-sm font-medium text-surface-900 dark:text-surface-100">{title}</h3>
    <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">{description}</p>
  </div>
);

const CoursePerformance: React.FC<{ marks?: CourseMark[] }> = ({ marks = [] }) => {
  if (marks.length === 0) {
    return (
      <EmptyCourseTab
        icon={<ChartBarIcon className="mx-auto h-12 w-12 text-surface-400 dark:text-surface-500" />}
        title="Keine Leistungen"
        description="Für diesen Kurs sind noch keine Leistungen eingetragen."
      />
    );
  }

  return (
    <div className="space-y-3">
      {marks.map((mark, index) => {
        const comment = mark.comment?.trim();

        return (
          <article key={`${mark.name}-${mark.date}-${index}`} className="card">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-surface-900 dark:text-surface-100">
                  {mark.name}
                </h3>
                <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">{mark.date}</p>
              </div>
              <span className="shrink-0 text-xl font-bold text-surface-900 dark:text-surface-100">
                {mark.mark}
              </span>
            </div>
            {comment && (
              <div className="mt-4 border-t border-surface-200 pt-3 dark:border-surface-700">
                <p className="text-sm font-semibold text-surface-700 dark:text-surface-300">Kommentar</p>
                <p className="mt-1 text-sm italic text-surface-600 dark:text-surface-400">{comment}</p>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
};

interface ParsedCourseExam {
  date: string;
  title: string;
  hours?: string;
  duration?: string;
  raw: string;
}

const normalizeExamText = (value: string) => value.replace(/\s+/g, ' ').trim();

const parseCourseExam = (raw: string): ParsedCourseExam => {
  const normalized = normalizeExamText(raw);
  const dateMatch = normalized.match(/\b(\d{1,2}\.\d{1,2}\.\d{4}|\d{4}-\d{2}-\d{2})\b/);
  const dateIndex = dateMatch?.index ?? -1;
  const prefix = dateMatch && dateIndex >= 0
    ? normalized.slice(0, dateIndex).replace(/,\s*$/, '').trim()
    : '';
  let details = dateMatch && dateIndex >= 0
    ? normalized.slice(dateIndex + dateMatch[0].length).replace(/^[\s,:-]+/, '').trim()
    : normalized;
  let date = dateMatch?.[1] ?? '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const parsedDate = parseISO(date);
    if (!Number.isNaN(parsedDate.getTime())) {
      date = format(parsedDate, 'dd.MM.yyyy', { locale: de });
    }
  }

  const examPrefix = prefix
    .replace(/^(?:Mo|Di|Mi|Do|Fr|Sa|So),?\s*/i, '')
    .replace(/\s+am$/i, '')
    .trim();

  let duration: string | undefined;
  const durationMatch = details.match(/\(([^()]*)\)\s*$/);
  if (durationMatch) {
    const parsedDuration = normalizeExamText(durationMatch[1]);
    duration = parsedDuration || undefined;
    details = details.slice(0, durationMatch.index ?? details.length).replace(/[,\s]+$/, '').trim();
  }

  let hours: string | undefined;
  const hoursMatch = details.match(
    /(?:,\s*)?((?:(?:\d+\.\s*,\s*)+\d+\.\s*(?:Std\.|Stunde[n]?)|(?:\d+\.\s*[-–]\s*\d+\.\s*)(?:Std\.|Stunde[n]?)))\s*$/i,
  );
  if (hoursMatch) {
    hours = normalizeExamText(hoursMatch[1]);
    details = details.slice(0, hoursMatch.index ?? details.length).replace(/[,\s]+$/, '').trim();
  }

  const title = [examPrefix, details].filter(Boolean).join(': ') || 'Leistungskontrolle';

  return { date, title, hours, duration, raw: normalized };
};

const parseCourseExams = (exams: string[]) => {
  const uniqueExams = new Map<string, ParsedCourseExam>();

  for (const rawExam of exams) {
    const parsedExam = parseCourseExam(rawExam);
    if (!parsedExam.raw) continue;

    const key = `${parsedExam.date}|${parsedExam.title}`.toLowerCase();
    const existingExam = uniqueExams.get(key);
    const detailScore = (exam: ParsedCourseExam) =>
      Number(Boolean(exam.date)) + Number(Boolean(exam.hours)) * 2 + Number(Boolean(exam.duration)) * 2;

    if (!existingExam || detailScore(parsedExam) > detailScore(existingExam)) {
      uniqueExams.set(key, parsedExam);
    }
  }

  return Array.from(uniqueExams.values());
};

const CourseExams: React.FC<{ exams?: string[] }> = ({ exams = [] }) => {
  const parsedExams = parseCourseExams(exams);

  if (parsedExams.length === 0) {
    return (
      <EmptyCourseTab
        icon={<DocumentTextIcon className="mx-auto h-12 w-12 text-surface-400 dark:text-surface-500" />}
        title="Keine Klausuren"
        description="Für diesen Kurs sind noch keine Leistungskontrollen eingetragen."
      />
    );
  }

  return (
    <div className="space-y-3">
      {parsedExams.map((exam, index) => (
        <article key={`${exam.date}-${exam.title}-${index}`} className="card">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/20">
              <DocumentTextIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">{exam.title}</h3>
              {(exam.date || exam.hours || exam.duration) ? (
                <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                  {exam.date && (
                    <div className="flex items-start gap-2 rounded-lg bg-surface-50 px-3 py-2 dark:bg-surface-800/60">
                      <CalendarDaysIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">Termin</p>
                        <p className="mt-0.5 font-medium text-surface-800 dark:text-surface-200">{exam.date}</p>
                      </div>
                    </div>
                  )}
                  {exam.hours && (
                    <div className="flex items-start gap-2 rounded-lg bg-surface-50 px-3 py-2 dark:bg-surface-800/60">
                      <ListBulletIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">Stunden</p>
                        <p className="mt-0.5 font-medium text-surface-800 dark:text-surface-200">{exam.hours}</p>
                      </div>
                    </div>
                  )}
                  {exam.duration && (
                    <div className="flex items-start gap-2 rounded-lg bg-surface-50 px-3 py-2 dark:bg-surface-800/60">
                      <ClockIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">Dauer</p>
                        <p className="mt-0.5 font-medium text-surface-800 dark:text-surface-200">{exam.duration}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">Weitere Angaben stehen noch nicht zur Verfügung.</p>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
};

const Courses: React.FC = () => {
  const { token } = useAuth();
  const { preferences } = usePreferences();
  const navigate = useNavigate();
  const { id: courseIdFromUrl } = useParams();
  const basePath = useBasePath();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  // Cached courses state
  const [courses, setCourses] = useState<CourseEntry[]>(() => {
    const cached = localStorage.getItem('courses_cache');
    return cached ? JSON.parse(cached) : [];
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseDetailsResponse | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<EntryDetails | null>(null);
  const [weeklyEntries, setWeeklyEntries] = useState<WeeklyEntry[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterAttendance, setFilterAttendance] = useState<string>('all');
  const [showOnlyHomework, setShowOnlyHomework] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [detailViewMode, setDetailViewMode] = useState<'cards' | 'timeline'>('cards');
  const [dynamicAttendanceOptions, setDynamicAttendanceOptions] = useState<string[]>([]);
  const [courseDetailTab, setCourseDetailTab] = useState<CourseDetailTab>('history');
  const completedHomeworkDisplay = preferences.homework.completed_display;

  const selectedCourseOverview = useMemo(
    () => courses.find(course => course.book_id === (selectedCourse?.course_id || courseIdFromUrl)),
    [courseIdFromUrl, courses, selectedCourse?.course_id],
  );
  const selectedCourseName = selectedCourse?.course_name?.trim() || selectedCourseOverview?.name?.trim() || 'Kurs';

  // Early return if no token
  if (!token) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100">Nicht authentifiziert</h3>
          <p className="text-surface-500 dark:text-surface-400">Bitte melden Sie sich an, um Kurse zu sehen.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (!token || viewMode !== 'overview') return;
    const abortController = new AbortController();
    loadCourses(abortController.signal);
    return () => abortController.abort();
  }, [token, viewMode]);

  useEffect(() => {
    if (!token) return;
    if (!courseIdFromUrl) {
      setViewMode('overview');
      setSelectedCourse(null);
      return;
    }
    const abortController = new AbortController();
    setViewMode('course-detail');
    setSelectedCourse(null);
    setIsLoading(true);
    loadCourseDetails(courseIdFromUrl, abortController.signal);
    return () => abortController.abort();
  }, [token, courseIdFromUrl]);

  useEffect(() => {
    setCourseDetailTab('history');
  }, [courseIdFromUrl]);

  const loadCourses = async (signal?: AbortSignal) => {
    if (!token) return;
    setIsUpdating(true);
    try {
      setError('');
      const response = await coursesAPI.getCourses(token, signal);
      if (signal?.aborted) return;
      if (response.success) {
        setCourses(response.entries);
        localStorage.setItem('courses_cache', JSON.stringify(response.entries));
      } else {
        setError('Fehler beim Laden der Kurse.');
      }
      setIsLoading(false);
    } catch (error) {
      if (axios.isCancel(error)) return;
      console.error('Error loading courses:', error);
      setError('Fehler beim Laden der Kurse.');
      setIsLoading(false);
    } finally {
      setIsUpdating(false);
    }
  };

  const loadCourseDetails = async (courseId: string, signal?: AbortSignal) => {
    if (!token) return;

    try {
      setError('');
      const response = await coursesAPI.getCourseDetails(token, courseId, signal);
      if (signal?.aborted) return;
      
      if (response.success) {
        let resolvedCourse = response;
        if (!response.course_name?.trim()) {
          const overview = await coursesAPI.getCourses(token, signal);
          if (signal?.aborted) return;
          if (overview.success) {
            setCourses(overview.entries);
            localStorage.setItem('courses_cache', JSON.stringify(overview.entries));
            const matchingCourse = overview.entries.find(course => course.book_id === courseId);
            if (matchingCourse?.name?.trim()) {
              resolvedCourse = { ...response, course_name: matchingCourse.name.trim() };
            }
          }
        }
        setSelectedCourse(resolvedCourse);
        
        const presetAttendance = ['anwesend', 'entschuldigt', 'unentschuldigt', 'fehlend'];
        const allAttendances = response.entries.map((entry: CourseDetailEntry) => entry.attendance.trim()).filter(Boolean);
        const uniqueAttendances = [...new Set(allAttendances)];
        const dynamicOptions = uniqueAttendances.filter((att) => !presetAttendance.includes(att.toLowerCase()));
        setDynamicAttendanceOptions(dynamicOptions);
      } else {
        setError('Fehler beim Laden der Kursdetails.');
      }
      setIsLoading(false);
    } catch (error) {
      if (axios.isCancel(error)) return;
      console.error('Error loading course details:', error);
      setError('Fehler beim Laden der Kursdetails.');
      setIsLoading(false);
    }
  };

  const loadEntryDetails = async (url: string) => {
    if (!token) return;

    try {
      setIsLoading(true);
      setError('');
      const response = await coursesAPI.getEntryDetails(token, url);
      
      if (response.success) {
        setSelectedEntry(response.entry);
        setViewMode('entry-detail');
      } else {
        setError('Fehler beim Laden der Eintragsdetails.');
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading entry details:', error);
      setError('Fehler beim Laden der Eintragsdetails.');
      setIsLoading(false);
    }
  };

  const loadWeeklyView = async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      setError('');
      const response = await coursesAPI.getWeeklyView(token);
      
      if (response.success) {
        setWeeklyEntries(response.week.entries);
        setViewMode('weekly');
      } else {
        setError('Fehler beim Laden der Wochenansicht.');
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading weekly view:', error);
      setError('Fehler beim Laden der Wochenansicht.');
      setIsLoading(false);
    }
  };

  const loadSubmissions = async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      setError('');
      const response = await coursesAPI.getSubmissions(token);
      
      if (response.success) {
        setSubmissions(response.submissions);
        setViewMode('submissions');
      } else {
        setError('Fehler beim Laden der Abgaben.');
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading submissions:', error);
      setError('Fehler beim Laden der Abgaben.');
      setIsLoading(false);
    }
  };

  const toggleHomework = async (courseId: string, entryId: string, currentDone: boolean) => {
    if (!token) return;
    const newDone = !currentDone;

    if (selectedCourse) {
      setSelectedCourse(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          entries: prev.entries.map(entry =>
            entry.entry_id === entryId ? { ...entry, homework_done: newDone } : entry
          ),
        };
      });
    }

    setCourses(prev => prev.map(course =>
      course.entry_id === entryId ? { ...course, homework_done: newDone } : course
    ));

    const cached = localStorage.getItem('courses_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      const updated = parsed.map((c: CourseEntry) =>
        c.entry_id === entryId ? { ...c, homework_done: newDone } : c
      );
      localStorage.setItem('courses_cache', JSON.stringify(updated));
    }

    try {
      await coursesAPI.toggleHomework(token, courseId, entryId, newDone);
    } catch (error) {
      console.error('Error toggling homework:', error);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    
    try {
      // Handle formats like "11.12.20250. Stunde" or "08.12.20253. - 4. Stunde"
      if (dateString.includes('Stunde')) {
        return dateString; // Return as-is since it includes lesson info
      }
      
      // Try to parse as ISO date first
      const date = parseISO(dateString);
      return format(date, 'dd.MM.yyyy', { locale: de });
    } catch {
      // If parsing fails, return the original string
      return dateString;
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'dd.MM.yyyy HH:mm', { locale: de });
    } catch {
      return dateString;
    }
  };

  const goBack = () => {
    if (viewMode === 'entry-detail') {
      setViewMode('course-detail');
    } else {
      navigate(`${basePath}/courses`);
    }
  };

  const getSubmissionStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'submitted':
      case 'abgegeben':
        return 'text-green-600 bg-green-100';
      case 'overdue':
      case 'überfällig':
        return 'text-red-600 bg-red-100';
      case 'pending':
      case 'ausstehend':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-surface-600 dark:text-surface-400 bg-surface-200 dark:bg-surface-700';
    }
  };

  // Show course detail skeleton when navigating to a course
  if (viewMode === 'course-detail' && !selectedCourse) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="h-8 w-8 bg-surface-300 dark:bg-surface-600 rounded-lg" />
            <div className="h-8 bg-surface-300 dark:bg-surface-600 rounded w-48" />
          </div>
          <div className="card">
            <div className="flex gap-4">
              <div className="h-10 w-24 bg-surface-300 dark:bg-surface-600 rounded-lg" />
              <div className="h-10 w-32 bg-surface-300 dark:bg-surface-600 rounded-lg" />
            </div>
          </div>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 bg-surface-300 dark:bg-surface-600 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-surface-300 dark:bg-surface-600 rounded w-1/3" />
                    <div className="h-3 bg-surface-300 dark:bg-surface-600 rounded w-1/4" />
                  </div>
                </div>
                <div className="h-5 bg-surface-300 dark:bg-surface-600 rounded w-3/4 mb-3" />
                <div className="h-4 bg-surface-300 dark:bg-surface-600 rounded w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show overview skeleton only when on overview and loading
  if (isLoading && (!courses || courses.length === 0) && viewMode === 'overview') {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-surface-300 dark:bg-surface-600 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 bg-surface-300 dark:bg-surface-600 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <SEO
        title="Mein Unterricht"
        description="Lanis Unterricht — Deine Kurse, Aufgaben und Materialien aus dem Schulportal Hessen im Überblick."
        path="/courses"
        noindex
      />
      {/* Spinner indicator for updating */}
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center">
            {viewMode !== 'overview' && (
              <button
                onClick={goBack}
                className="mr-4 p-2 text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:text-surface-300 rounded-lg hover:bg-surface-200 dark:bg-surface-700"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
            )}
            <div className="min-w-0">
              <h1 className="break-words text-3xl font-bold text-surface-900 dark:text-surface-100">
                {viewMode === 'overview' && 'Mein Unterricht'}
                {viewMode === 'course-detail' && selectedCourseName}
                {viewMode === 'weekly' && 'Wochenansicht'}
                {viewMode === 'submissions' && 'Abgaben'}
                {viewMode === 'entry-detail' && selectedEntry?.title}
              </h1>
              {viewMode === 'course-detail' && selectedCourse && (
                <p className="text-surface-600 dark:text-surface-400 mt-1">Lehrer: {selectedCourse.teacher_full}</p>
              )}
            </div>
          </div>

          {viewMode === 'overview' && (
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:shrink-0 sm:flex-row">
              <button
                onClick={loadSubmissions}
                className="btn btn-secondary w-full sm:w-auto"
              >
                <ClockIcon className="h-4 w-4 mr-2" />
                Abgaben
              </button>
              <button
                onClick={() => navigate(`${basePath}/courses/attendance`)}
                className="btn btn-secondary w-full sm:w-auto"
              >
                <ChartBarIcon className="h-4 w-4 mr-2" />
                Anwesenheit
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Content */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {!courses || courses.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <AcademicCapIcon className="mx-auto h-12 w-12 text-surface-400 dark:text-surface-500" />
              <h3 className="mt-2 text-sm font-medium text-surface-900 dark:text-surface-100">Keine Kurse</h3>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                Es sind noch keine Kurse verfügbar.
              </p>
            </div>
          ) : (
            courses.map((course) => (
              <div
                key={course.book_id}
                className="card card-hover"
                onClick={() => navigate(`${basePath}/courses/${course.book_id}`)}
              >
                <div className="flex items-center mb-4">
                  <div className="h-12 w-12 bg-primary-600 rounded-lg flex items-center justify-center">
                    <AcademicCapIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">{course.name}</h3>
                    <p className="text-sm text-surface-600 dark:text-surface-400">{course.teacher_full_name}</p>
                  </div>
                  <ChevronRightIcon className="h-5 w-5 text-surface-400 dark:text-surface-500" />
                </div>
                
                <div className="space-y-2">
                  {course.thema && (
                    <div className="flex items-start text-sm text-surface-600 dark:text-surface-400">
                      <DocumentTextIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{course.thema}</span>
                    </div>
                  )}
                  
                  {course.datum && (
                    <div className="flex items-center text-sm text-surface-500 dark:text-surface-400">
                      <CalendarDaysIcon className="h-4 w-4 mr-1" />
                      <span>{course.datum}</span>
                    </div>
                  )}
                  
                  {course.homework && (!course.homework_done || completedHomeworkDisplay !== 'hidden') && (
                    <div className={clsx(
                      'mt-3 rounded border p-2 transition-colors',
                      !course.homework_done
                        ? 'border-yellow-200 dark:border-yellow-700'
                        : completedHomeworkDisplay === 'orange'
                          ? 'border-orange-200 bg-orange-50/40 dark:border-orange-800 dark:bg-orange-950/20'
                          : 'border-emerald-100 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20',
                    )}>
                      <div className={clsx(
                        'mb-1 flex items-center gap-1 text-xs font-medium',
                        !course.homework_done
                          ? 'text-yellow-700 dark:text-yellow-300'
                          : completedHomeworkDisplay === 'orange'
                            ? 'text-orange-700 dark:text-orange-300'
                            : 'text-emerald-700 dark:text-emerald-300',
                      )}>
                        {course.homework_done && <CheckCircleIcon className="h-3.5 w-3.5" />}
                        Hausaufgaben{course.homework_done ? ' · Erledigt' : ''}:
                      </div>
                      <div className={clsx(
                        'text-sm',
                        !course.homework_done
                          ? 'text-yellow-800 dark:text-yellow-200'
                          : completedHomeworkDisplay === 'orange'
                            ? 'text-orange-800 dark:text-orange-200'
                            : 'text-emerald-800 dark:text-emerald-200',
                      )}>{course.homework?.trim()}</div>
                    </div>
                  )}

                  </div>
              </div>
            ))
          )}
        </div>
      )}

      {viewMode === 'course-detail' && selectedCourse && (
        <div className="space-y-6">
          <div className="card p-1">
            <div className="flex flex-wrap gap-1" role="tablist" aria-label="Kursansicht">
              {courseDetailTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = courseDetailTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`course-tabpanel-${tab.id}`}
                    onClick={() => setCourseDetailTab(tab.id)}
                    className={clsx(
                      'flex min-w-[7rem] flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-600 text-white'
                        : 'text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-700',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {courseDetailTab === 'history' && (
            <div id="course-tabpanel-history" role="tabpanel" aria-label="Historie" className="space-y-6">
              {/* Filters and Controls */}
              <div className="card">
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-1.5">
                  <FunnelIcon className="h-3.5 w-3.5 text-surface-500 dark:text-surface-400" />
                  <span className="text-xs font-medium text-surface-700 dark:text-surface-300 hidden sm:inline">Filter:</span>
                </div>
                
                <select
                  value={filterAttendance}
                  onChange={(e) => setFilterAttendance(e.target.value)}
                  className="text-xs sm:text-sm border border-surface-300 dark:border-surface-600 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 min-w-0"
                >
                  <option value="all">Alle Einträge</option>
                  <option value="anwesend">Anwesend</option>
                  <option value="entschuldigt">Entschuldigt</option>
                  <option value="unentschuldigt">Unentschuldigt</option>
                  <option value="fehlend">Fehlend</option>
                  {dynamicAttendanceOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>

                <button
                  onClick={() => setShowOnlyHomework(!showOnlyHomework)}
                  className={clsx(
                    "text-xs sm:text-sm px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap",
                    showOnlyHomework 
                      ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700" 
                      : "bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-400 border border-surface-300 dark:border-surface-600 hover:bg-surface-200 dark:hover:bg-surface-700"
                  )}
                >
                  {showOnlyHomework ? '✓ ' : ''}Nur HA
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                  className="text-xs sm:text-sm px-2.5 py-1.5 rounded-lg bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors border border-surface-300 dark:border-surface-600 whitespace-nowrap"
                >
                  {sortOrder === 'newest' ? '↓ Neu' : '↑ Alt'}
                </button>

                <div className="flex border border-surface-300 dark:border-surface-600 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setDetailViewMode('cards')}
                    className={clsx(
                      "p-2 transition-colors",
                      detailViewMode === 'cards'
                        ? "bg-primary-600 text-white"
                        : "bg-surface-50 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700"
                    )}
                    title="Kartenansicht"
                  >
                    <Squares2X2Icon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDetailViewMode('timeline')}
                    className={clsx(
                      "p-2 transition-colors",
                      detailViewMode === 'timeline'
                        ? "bg-primary-600 text-white"
                        : "bg-surface-50 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700"
                    )}
                    title="Timeline-Ansicht"
                  >
                    <ListBulletIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            </div>

          {!selectedCourse.entries || selectedCourse.entries.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-surface-400 dark:text-surface-500" />
              <h3 className="mt-2 text-sm font-medium text-surface-900 dark:text-surface-100">Keine Einträge</h3>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                Für diesen Kurs sind noch keine Einträge vorhanden.
              </p>
            </div>
          ) : (
            (() => {
              // Filter and sort entries
              let filteredEntries = selectedCourse.entries.filter((entry) => {
                const trimmedAttendance = entry.attendance.trim();
                if (filterAttendance !== 'all') {
                  const lowerAtt = trimmedAttendance.toLowerCase();
                  if (filterAttendance === 'anwesend' && lowerAtt !== 'anwesend') return false;
                  if (filterAttendance === 'entschuldigt' && !lowerAtt.includes('entschuldigt')) return false;
                  if (filterAttendance === 'unentschuldigt' && lowerAtt !== 'unentschuldigt') return false;
                  if (filterAttendance === 'fehlend' && lowerAtt !== 'fehlend' && lowerAtt !== 'unentschuldigt') return false;
                  if (!['anwesend', 'entschuldigt', 'unentschuldigt', 'fehlend'].includes(filterAttendance.toLowerCase()) && trimmedAttendance !== filterAttendance) return false;
                }
                if (showOnlyHomework && !entry.homework.trim()) return false;
                return true;
              });

              // Sort entries
              const parseDate = (entry: CourseDetailEntry): number => {
                if (entry.date) {
                  const parsed = new Date(entry.date).getTime();
                  if (!isNaN(parsed)) return parsed;
                }
                if (entry.hours) {
                  const parts = entry.hours.split(' ')[0].split('.');
                  if (parts.length === 3) {
                    const [day, month, year] = parts;
                    const parsed = new Date(`${year}-${month}-${day}`).getTime();
                    if (!isNaN(parsed)) return parsed;
                  }
                }
                return 0;
              };

              filteredEntries = [...filteredEntries].sort((a, b) => {
                const dateA = parseDate(a);
                const dateB = parseDate(b);
                return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
              });

              if (filteredEntries.length === 0) {
                return (
                  <div className="text-center py-12 card">
                    <FunnelIcon className="mx-auto h-12 w-12 text-surface-400 dark:text-surface-500" />
                    <h3 className="mt-2 text-sm font-medium text-surface-900 dark:text-surface-100">Keine passenden Einträge</h3>
                    <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                      Versuchen Sie, die Filter anzupassen.
                    </p>
                  </div>
                );
              }

              return detailViewMode === 'cards' ? (
                <div className="space-y-4">
                  {filteredEntries.map((entry) => (
                    <div
                      key={entry.entry_id}
                      className="card bg-transparent hover:shadow-lg transition-shadow duration-200"
                    >
                      {/* Header with Date and Attendance */}
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-200 dark:border-surface-700">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                            <CalendarDaysIcon className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-surface-900 dark:text-surface-100">{formatDate(entry.date) || entry.hours}</div>
                            {entry.attendance && (
                              <div className="flex items-center gap-1 mt-1">
                                {(() => {
                                  const att = entry.attendance.trim().toLowerCase();
                                  return att === 'anwesend' || att === 'entschuldigt' ? (
                                    <CheckCircleIcon className="h-4 w-4 text-green-600" />
                                  ) : att === 'fehlend' || att === 'unentschuldigt' ? (
                                    <XCircleIcon className="h-4 w-4 text-red-600" />
                                  ) : (
                                    <ExclamationCircleIcon className="h-4 w-4 text-yellow-600" />
                                  );
                                })()}
                                <span className={clsx(
                                  "text-xs font-medium",
                                  entry.attendance.trim().toLowerCase() === 'anwesend' || entry.attendance.trim().toLowerCase() === 'entschuldigt' ? 'text-green-700' :
                                  entry.attendance.trim().toLowerCase() === 'fehlend' || entry.attendance.trim().toLowerCase() === 'unentschuldigt' ? 'text-red-700' :
                                  'text-yellow-700'
                                )}>
                                  {entry.attendance}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {(entry.homework || (entry.files && entry.files.length > 0)) && (
                          <div className="flex items-center gap-2">
                            {entry.homework && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                <ClockIcon className="h-3 w-3 mr-1" />
                                HA
                              </span>
                            )}
                            {entry.files && entry.files.length > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                <PaperClipIcon className="h-3 w-3 mr-1" />
                                {entry.files.length}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Topic */}
                      <h4 className="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-3">{entry.thema}</h4>

                      {/* Content / Description */}
                      {entry.content && (
                        <div
                          className="mb-4 text-sm text-surface-700 dark:text-surface-300 leading-relaxed [&_br]:mb-1"
                          dangerouslySetInnerHTML={{ __html: entry.content }}
                        />
                      )}

                      {/* Homework Section */}
                      {entry.homework && (
                        <div className="mb-4 p-4 border-l-4 border-yellow-400 dark:border-yellow-600 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <ClockIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                              <span className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">Hausaufgaben</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleHomework(selectedCourse.course_id, entry.entry_id, entry.homework_done);
                              }}
                              className={clsx(
                                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors",
                                entry.homework_done
                                  ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700 hover:bg-green-200 dark:hover:bg-green-900/60"
                                  : "bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 border-surface-200 dark:border-surface-700 hover:bg-surface-200 dark:hover:bg-surface-700"
                              )}
                            >
                              <CheckCircleIcon className={clsx("h-3.5 w-3.5 mr-1", !entry.homework_done && "opacity-40")} />
                              {entry.homework_done ? 'Erledigt' : 'Erledigt?'}
                            </button>
                          </div>
                          <div className="text-sm text-surface-800 dark:text-surface-200 whitespace-pre-wrap leading-relaxed">{entry.homework?.trim()}</div>
                        </div>
                      )}

                      
                      {/* Files Section */}
                      {entry.files && entry.files.length > 0 && (
                        <div className="mt-4">
                          <h5 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3 flex items-center">
                            <PaperClipIcon className="h-4 w-4 mr-2 text-surface-500 dark:text-surface-400" />
                            Anhänge ({entry.files.length})
                          </h5>
                          <div className="inline-grid grid-cols-1 gap-2">
                            {entry.files.map((file, index) => (
                              <a
                                key={index}
                                href={file.url !== '#' ? file.url : undefined}
                                className={clsx(
                                  "inline-flex items-center p-2.5 sm:p-3 rounded-lg border transition-all min-w-0 sm:min-w-48",
                                  file.url !== '#' 
                                    ? "border-primary-200 hover:border-primary-300 cursor-pointer group" 
                                    : "border-surface-200 dark:border-surface-700 cursor-not-allowed opacity-60"
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <div className={clsx(
                                  "h-8 w-8 rounded flex items-center justify-center flex-shrink-0"
                                )}>
                                  <DocumentTextIcon className={clsx(
                                    "h-4 w-4",
                                    file.url !== '#' ? "text-primary-600" : "text-surface-400 dark:text-surface-500"
                                  )} />
                                </div>
                                <span className={clsx(
                                  "ml-3 text-sm font-medium truncate",
                                  file.url !== '#' ? "text-primary-700 group-hover:text-primary-800" : "text-surface-500 dark:text-surface-400"
                                )}>
                                  {file.name}
                                </span>
                                {file.url !== '#' && (
                                  <ArrowTopRightOnSquareIcon className="h-4 w-4 ml-auto text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                // Timeline view
                <div className="relative">
                  <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-500 via-primary-300 to-transparent"></div>
                  <div className="space-y-6">
                    {filteredEntries.map((entry, index) => (
                      <div key={entry.entry_id} className="relative pl-20">
                        <div className="absolute left-5 top-6 h-6 w-6 rounded-full bg-primary-600 border-4 border-white dark:border-surface-900 shadow-md flex items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-white dark:bg-surface-300"></div>
                        </div>
                        
                        <div className="card bg-transparent hover:shadow-lg transition-shadow duration-200">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="text-xs text-surface-500 mb-1">
                                Eintrag #{filteredEntries.length - index}
                              </div>
                              <div className="text-sm font-semibold text-surface-900 dark:text-surface-100">{formatDate(entry.date) || entry.hours}</div>
                              {entry.attendance && (
                                <span className={clsx(
                                  "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1",
                                  entry.attendance.trim().toLowerCase() === 'anwesend' || entry.attendance.trim().toLowerCase() === 'entschuldigt' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                                  entry.attendance.trim().toLowerCase() === 'fehlend' || entry.attendance.trim().toLowerCase() === 'unentschuldigt' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                                  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                                )}>
                                  {entry.attendance}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {entry.homework && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300">
                                  HA
                                </span>
                              )}
                              {entry.files && entry.files.length > 0 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                                  {entry.files.length} <PaperClipIcon className="h-3 w-3 ml-1" />
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <h4 className="text-base font-semibold text-surface-900 dark:text-surface-100 mb-3">{entry.thema}</h4>

                          {entry.content && (
                            <div
                              className="mb-3 text-sm text-surface-700 dark:text-surface-300 leading-relaxed [&_br]:mb-1"
                              dangerouslySetInnerHTML={{ __html: entry.content }}
                            />
                          )}

                          {entry.homework && (
                            <div className="mb-3 p-3 border-l-4 border-yellow-400 dark:border-yellow-600 rounded">
                              <div className="flex items-center gap-2 mb-1">
                                <ClockIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                <span className="text-xs font-semibold text-yellow-900 dark:text-yellow-200">Hausaufgaben</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleHomework(selectedCourse.course_id, entry.entry_id, entry.homework_done);
                                  }}
                                  className="focus:outline-none"
                                  title={entry.homework_done ? 'Als nicht erledigt markieren' : 'Als erledigt markieren'}
                                >
                                  <CheckCircleIcon className={clsx(
                                    "h-4 w-4 transition-colors",
                                    entry.homework_done
                                      ? "text-green-600 dark:text-green-400"
                                      : "text-surface-300 dark:text-surface-600 hover:text-green-600 dark:hover:text-green-400"
                                  )} />
                                </button>
                              </div>
                              <div className="text-xs text-surface-700 dark:text-surface-300 whitespace-pre-wrap">{entry.homework?.trim()}</div>
                            </div>
                          )}
                          
                          {entry.files && entry.files.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {entry.files.map((file, fileIndex) => (
                                <a
                                  key={fileIndex}
                                  href={file.url !== '#' ? file.url : undefined}
                                  className={clsx(
                                    "inline-flex items-center px-3 py-1.5 rounded-lg text-xs border",
                                    file.url !== '#'
                                      ? "border-primary-200 text-primary-700 cursor-pointer"
                                      : "border-surface-200 dark:border-surface-700 text-surface-400 dark:text-surface-500 cursor-not-allowed"
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <DocumentTextIcon className="h-3 w-3 mr-1" />
                                  {file.name}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()
          )}
            </div>
          )}

          {courseDetailTab === 'performance' && (
            <div id="course-tabpanel-performance" role="tabpanel" aria-label="Leistungen">
              <CoursePerformance marks={selectedCourse.marks} />
            </div>
          )}

          {courseDetailTab === 'exams' && (
            <div id="course-tabpanel-exams" role="tabpanel" aria-label="Klausuren">
              <CourseExams exams={selectedCourse.exams} />
            </div>
          )}
        </div>
      )}

      {viewMode === 'entry-detail' && selectedEntry && (
        <div className="max-w-4xl">
          <div className="card bg-transparent">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-100 mb-2">
                {selectedEntry.title}
              </h2>
              <p className="text-surface-600 dark:text-surface-400">
                {formatDateTime(selectedEntry.date)}
              </p>
            </div>

            <div className="prose max-w-none mb-6">
              <div dangerouslySetInnerHTML={{ __html: selectedEntry.content }} />
            </div>

            {selectedEntry.attachments && selectedEntry.attachments.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-3 flex items-center">
                  <PaperClipIcon className="h-5 w-5 mr-2" />
                  Anhänge
                </h3>
                <div className="space-y-2">
                  {selectedEntry.attachments.map((attachment, index) => (
                    <a
                      key={index}
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center p-3 border border-surface-200 dark:border-surface-700 rounded-lg transition-colors"
                    >
                      <PaperClipIcon className="h-5 w-5 text-surface-400 dark:text-surface-500 mr-3" />
                      <span className="text-surface-900 dark:text-surface-100">{attachment.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === 'weekly' && isLoading && (
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card">
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-surface-300 dark:bg-surface-600 rounded w-1/3" />
                  <div className="h-3 bg-surface-300 dark:bg-surface-600 rounded w-1/4" />
                </div>
                <div className="h-5 w-5 bg-surface-300 dark:bg-surface-600 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'weekly' && !isLoading && (
        <div className="space-y-4">
          {!weeklyEntries || weeklyEntries.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDaysIcon className="mx-auto h-12 w-12 text-surface-400 dark:text-surface-500" />
              <h3 className="mt-2 text-sm font-medium text-surface-900 dark:text-surface-100">Keine Einträge diese Woche</h3>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                Für diese Woche sind keine Unterrichtseinträge vorhanden.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {weeklyEntries.map((entry, index) => (
                <div key={index} className="card card-hover">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-surface-900 dark:text-surface-100">{entry.entry}</h4>
                        <span className="text-sm text-surface-500 dark:text-surface-400">
                          {formatDate(entry.date)}
                        </span>
                      </div>
                      <p className="text-sm text-primary-600">{entry.course}</p>
                    </div>
                    <ChevronRightIcon className="h-5 w-5 text-surface-400 dark:text-surface-500" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {viewMode === 'submissions' && isLoading && (
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card">
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-surface-300 dark:bg-surface-600 rounded w-1/3" />
                  <div className="h-3 bg-surface-300 dark:bg-surface-600 rounded w-2/3" />
                  <div className="h-3 bg-surface-300 dark:bg-surface-600 rounded w-1/4" />
                </div>
                <div className="h-8 w-16 bg-surface-300 dark:bg-surface-600 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'submissions' && !isLoading && (
        <div className="space-y-4">
          {!submissions || submissions.length === 0 ? (
            <div className="text-center py-12">
              <ClockIcon className="mx-auto h-12 w-12 text-surface-400" />
              <h3 className="mt-2 text-sm font-medium text-surface-900 dark:text-surface-100">Keine Abgaben</h3>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                Derzeit sind keine Abgaben fällig.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((submission) => (
                <div key={submission.id} className="card">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-surface-900 dark:text-surface-100">{submission.title}</h4>
                        <span className={clsx(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          getSubmissionStatusColor(submission.status)
                        )}>
                          {submission.status}
                        </span>
                      </div>
                      <p className="text-sm text-surface-600 dark:text-surface-400 mb-1">{submission.course}</p>
                      <div className="flex items-center text-sm text-surface-600 dark:text-surface-400">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        <span>Fällig: {formatDateTime(submission.due_date)}</span>
                      </div>
                    </div>
                    <a
                      href={submission.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-4 btn btn-secondary"
                    >
                      Öffnen
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Courses;
