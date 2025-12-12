import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { coursesAPI } from '../../services/api';
import { 
  CourseEntry,
  CoursesResponse,
  CourseDetailsResponse,
  CourseDetails,
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
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import clsx from 'clsx';

type ViewMode = 'overview' | 'course-detail' | 'weekly' | 'submissions' | 'entry-detail';

const Courses: React.FC = () => {
  const { token } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [courses, setCourses] = useState<CourseEntry[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CourseDetailsResponse | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<EntryDetails | null>(null);
  const [weeklyEntries, setWeeklyEntries] = useState<WeeklyEntry[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Early return if no token
  if (!token) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Nicht authentifiziert</h3>
          <p className="text-gray-500">Bitte melden Sie sich an, um Kurse zu sehen.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (token && viewMode === 'overview') {
      loadCourses();
    }
  }, [token, viewMode]);

  const loadCourses = async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      setError('');
      const response = await coursesAPI.getCourses(token);
      
      if (response.success) {
        setCourses(response.entries);
      } else {
        setError('Fehler beim Laden der Kurse.');
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      setError('Fehler beim Laden der Kurse.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCourseDetails = async (courseId: string) => {
    if (!token) return;

    try {
      setIsLoading(true);
      setError('');
      const response = await coursesAPI.getCourseDetails(token, courseId);
      
      if (response.success) {
        setSelectedCourse(response);
        setViewMode('course-detail');
      } else {
        setError('Fehler beim Laden der Kursdetails.');
      }
    } catch (error) {
      console.error('Error loading course details:', error);
      setError('Fehler beim Laden der Kursdetails.');
    } finally {
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
    } catch (error) {
      console.error('Error loading entry details:', error);
      setError('Fehler beim Laden der Eintragsdetails.');
    } finally {
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
    } catch (error) {
      console.error('Error loading weekly view:', error);
      setError('Fehler beim Laden der Wochenansicht.');
    } finally {
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
    } catch (error) {
      console.error('Error loading submissions:', error);
      setError('Fehler beim Laden der Abgaben.');
    } finally {
      setIsLoading(false);
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
      setViewMode('overview');
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
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-300 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-300 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {viewMode !== 'overview' && (
              <button
                onClick={goBack}
                className="mr-4 p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {viewMode === 'overview' && 'Mein Unterricht'}
                {viewMode === 'course-detail' && selectedCourse?.course_name}
                {viewMode === 'weekly' && 'Wochenansicht'}
                {viewMode === 'submissions' && 'Abgaben'}
                {viewMode === 'entry-detail' && selectedEntry?.title}
              </h1>
              {viewMode === 'course-detail' && selectedCourse && (
                <p className="text-gray-600 mt-1">Lehrer: {selectedCourse.teacher_full}</p>
              )}
            </div>
          </div>

          {viewMode === 'overview' && (
            <div className="flex space-x-3">
              <button
                onClick={loadWeeklyView}
                className="btn btn-secondary"
              >
                <CalendarDaysIcon className="h-4 w-4 mr-2" />
                Wochenansicht
              </button>
              <button
                onClick={loadSubmissions}
                className="btn btn-secondary"
              >
                <ClockIcon className="h-4 w-4 mr-2" />
                Abgaben
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
              <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Keine Kurse</h3>
              <p className="mt-1 text-sm text-gray-500">
                Es sind noch keine Kurse verfügbar.
              </p>
            </div>
          ) : (
            courses.map((course) => (
              <div
                key={course.book_id}
                className="card card-hover"
                onClick={() => loadCourseDetails(course.book_id)}
              >
                <div className="flex items-center mb-4">
                  <div className="h-12 w-12 bg-primary-600 rounded-lg flex items-center justify-center">
                    <AcademicCapIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{course.name}</h3>
                    <p className="text-sm text-gray-600">{course.teacher_full_name}</p>
                  </div>
                  <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                </div>
                
                <div className="space-y-2">
                  {course.thema && (
                    <div className="flex items-start text-sm text-gray-600">
                      <DocumentTextIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{course.thema}</span>
                    </div>
                  )}
                  
                  {course.datum && (
                    <div className="flex items-center text-sm text-gray-500">
                      <CalendarDaysIcon className="h-4 w-4 mr-1" />
                      <span>{course.datum}</span>
                    </div>
                  )}
                  
                  {course.homework && (
                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <div className="text-xs font-medium text-yellow-800 mb-1">Hausaufgaben:</div>
                      <div className="text-sm text-yellow-700">{course.homework}</div>
                    </div>
                  )}
                  
                  <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Convert course_link to use schulportal domain
                        const url = course.course_link.startsWith('http') 
                          ? course.course_link 
                          : `https://start.schulportal.hessen.de/${course.course_link}`;
                        window.open(url, '_blank');
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
                    >
                      <ArrowTopRightOnSquareIcon className="h-3 w-3 mr-1" />
                      Original öffnen
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {viewMode === 'course-detail' && selectedCourse && (
        <div className="space-y-4">
          {!selectedCourse.entries || selectedCourse.entries.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Keine Einträge</h3>
              <p className="mt-1 text-sm text-gray-500">
                Für diesen Kurs sind noch keine Einträge vorhanden.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedCourse.entries.map((entry) => (
                <div
                  key={entry.entry_id}
                  className="card"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center text-sm text-gray-500 mb-2">
                        <CalendarDaysIcon className="h-4 w-4 mr-1" />
                        <span>{formatDate(entry.date)}</span>
                        {entry.attendance && (
                          <span className={clsx(
                            "ml-3 px-2 py-1 rounded-full text-xs",
                            entry.attendance === 'anwesend' ? 'bg-green-100 text-green-700' :
                            entry.attendance === 'entschuldigt' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          )}>
                            {entry.attendance}
                          </span>
                        )}
                      </div>
                      <h4 className="font-medium text-gray-900 mb-2">{entry.thema}</h4>
                      
                      {entry.homework && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                          <div className="flex items-center text-sm font-medium text-yellow-800 mb-1">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            Hausaufgaben
                            {entry.homework_done && (
                              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Erledigt</span>
                            )}
                          </div>
                          <div className="text-sm text-yellow-700 whitespace-pre-wrap">{entry.homework}</div>
                        </div>
                      )}
                      
                      {entry.files && entry.files.length > 0 && (
                        <div className="mt-3">
                          <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <PaperClipIcon className="h-4 w-4 mr-1" />
                            Dateien ({entry.files.length})
                          </h5>
                          <div className="space-y-1">
                            {entry.files.map((file, index) => (
                              <a
                                key={index}
                                href={file.url !== '#' ? file.url : undefined}
                                className={clsx(
                                  "flex items-center p-2 rounded text-sm",
                                  file.url !== '#' 
                                    ? "text-primary-600 hover:bg-primary-50 cursor-pointer" 
                                    : "text-gray-400 cursor-not-allowed bg-gray-50"
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <PaperClipIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                                <span className="truncate">{file.name}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {viewMode === 'entry-detail' && selectedEntry && (
        <div className="max-w-4xl">
          <div className="card">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {selectedEntry.title}
              </h2>
              <p className="text-gray-600">
                {formatDateTime(selectedEntry.date)}
              </p>
            </div>

            <div className="prose max-w-none mb-6">
              <div dangerouslySetInnerHTML={{ __html: selectedEntry.content }} />
            </div>

            {selectedEntry.attachments && selectedEntry.attachments.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
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
                      className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <PaperClipIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-gray-900">{attachment.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === 'weekly' && (
        <div className="space-y-4">
          {!weeklyEntries || weeklyEntries.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Keine Einträge diese Woche</h3>
              <p className="mt-1 text-sm text-gray-500">
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
                        <h4 className="font-medium text-gray-900">{entry.entry}</h4>
                        <span className="text-sm text-gray-500">
                          {formatDate(entry.date)}
                        </span>
                      </div>
                      <p className="text-sm text-primary-600">{entry.course}</p>
                    </div>
                    <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {viewMode === 'submissions' && (
        <div className="space-y-4">
          {!submissions || submissions.length === 0 ? (
            <div className="text-center py-12">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Keine Abgaben</h3>
              <p className="mt-1 text-sm text-gray-500">
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
                        <h4 className="font-medium text-gray-900">{submission.title}</h4>
                        <span className={clsx(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          getSubmissionStatusColor(submission.status)
                        )}>
                          {submission.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{submission.course}</p>
                      <div className="flex items-center text-sm text-gray-600">
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