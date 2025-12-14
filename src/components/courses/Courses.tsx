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

const Courses: React.FC = () => {
  const { token } = useAuth();
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
      // Show cached state immediately, then update
      loadCourses();
    }
    // eslint-disable-next-line
  }, [token, viewMode]);

  const loadCourses = async () => {
    if (!token) return;
    setIsUpdating(true);
    try {
      setError('');
      const response = await coursesAPI.getCourses(token);
      if (response.success) {
        setCourses(response.entries);
        localStorage.setItem('courses_cache', JSON.stringify(response.entries));
      } else {
        setError('Fehler beim Laden der Kurse.');
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      setError('Fehler beim Laden der Kurse.');
    } finally {
      setIsLoading(false);
      setIsUpdating(false);
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

  // Show cached state immediately, but if no cached and loading, show skeleton
  if (isLoading && (!courses || courses.length === 0)) {
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
      {/* Spinner indicator for updating */}
      {isUpdating && (
        <div className="flex items-center gap-2 px-4 py-2 text-primary-600">
          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 inline-block"></span>
          <span>Aktualisiere...</span>
        </div>
      )}
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
        <div className="space-y-6">
          {/* Course Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Einträge</p>
                  <p className="text-2xl font-bold text-blue-900">{selectedCourse.entries?.length || 0}</p>
                </div>
                <DocumentTextIcon className="h-8 w-8 text-blue-600 opacity-50" />
              </div>
            </div>
            
            <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 font-medium">Hausaufgaben</p>
                  <p className="text-2xl font-bold text-yellow-900">
                    {selectedCourse.entries?.filter(e => e.homework).length || 0}
                  </p>
                </div>
                <ClockIcon className="h-8 w-8 text-yellow-600 opacity-50" />
              </div>
            </div>
            
            <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Anwesend</p>
                  <p className="text-2xl font-bold text-green-900">
                    {selectedCourse.entries?.filter(e => e.attendance === 'anwesend').length || 0}
                  </p>
                </div>
                <CheckCircleIcon className="h-8 w-8 text-green-600 opacity-50" />
              </div>
            </div>
            
            <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Dateien</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {selectedCourse.entries?.reduce((acc, e) => acc + (e.files?.length || 0), 0) || 0}
                  </p>
                </div>
                <PaperClipIcon className="h-8 w-8 text-purple-600 opacity-50" />
              </div>
            </div>
          </div>

          {/* Filters and Controls */}
          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <FunnelIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Filter:</span>
                </div>
                
                <select
                  value={filterAttendance}
                  onChange={(e) => setFilterAttendance(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">Alle Einträge</option>
                  <option value="anwesend">Anwesend</option>
                  <option value="entschuldigt">Entschuldigt</option>
                  <option value="unentschuldigt">Unentschuldigt</option>
                </select>

                <button
                  onClick={() => setShowOnlyHomework(!showOnlyHomework)}
                  className={clsx(
                    "text-sm px-3 py-1.5 rounded-lg transition-colors",
                    showOnlyHomework 
                      ? "bg-yellow-100 text-yellow-700 border border-yellow-300" 
                      : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200"
                  )}
                >
                  {showOnlyHomework ? '✓ ' : ''}Nur Hausaufgaben
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                  className="text-sm px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors border border-gray-300"
                >
                  {sortOrder === 'newest' ? '↓ Neueste zuerst' : '↑ Älteste zuerst'}
                </button>

                <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setDetailViewMode('cards')}
                    className={clsx(
                      "p-2 transition-colors",
                      detailViewMode === 'cards'
                        ? "bg-primary-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
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
                        : "bg-white text-gray-600 hover:bg-gray-50"
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
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Keine Einträge</h3>
              <p className="mt-1 text-sm text-gray-500">
                Für diesen Kurs sind noch keine Einträge vorhanden.
              </p>
            </div>
          ) : (
            (() => {
              // Filter and sort entries
              let filteredEntries = selectedCourse.entries.filter((entry) => {
                if (filterAttendance !== 'all' && entry.attendance !== filterAttendance) return false;
                if (showOnlyHomework && !entry.homework) return false;
                return true;
              });

              // Sort entries
              filteredEntries = [...filteredEntries].sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
              });

              if (filteredEntries.length === 0) {
                return (
                  <div className="text-center py-12 card">
                    <FunnelIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Keine passenden Einträge</h3>
                    <p className="mt-1 text-sm text-gray-500">
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
                      className="card hover:shadow-lg transition-shadow duration-200"
                    >
                      {/* Header with Date and Attendance */}
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                            <CalendarDaysIcon className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{formatDate(entry.date)}</div>
                            {entry.attendance && (
                              <div className="flex items-center gap-1 mt-1">
                                {entry.attendance === 'anwesend' && (
                                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                                )}
                                {entry.attendance === 'entschuldigt' && (
                                  <ExclamationCircleIcon className="h-4 w-4 text-yellow-600" />
                                )}
                                {entry.attendance !== 'anwesend' && entry.attendance !== 'entschuldigt' && (
                                  <XCircleIcon className="h-4 w-4 text-red-600" />
                                )}
                                <span className={clsx(
                                  "text-xs font-medium",
                                  entry.attendance === 'anwesend' ? 'text-green-700' :
                                  entry.attendance === 'entschuldigt' ? 'text-yellow-700' :
                                  'text-red-700'
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
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">{entry.thema}</h4>
                      
                      {/* Homework Section */}
                      {entry.homework && (
                        <div className="mb-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <ClockIcon className="h-5 w-5 text-yellow-600" />
                              <span className="text-sm font-semibold text-yellow-900">Hausaufgaben</span>
                            </div>
                            {entry.homework_done && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                                <CheckCircleIcon className="h-3.5 w-3.5 mr-1" />
                                Erledigt
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{entry.homework}</div>
                        </div>
                      )}
                      
                      {/* Files Section */}
                      {entry.files && entry.files.length > 0 && (
                        <div className="mt-4">
                          <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                            <PaperClipIcon className="h-4 w-4 mr-2 text-gray-500" />
                            Anhänge ({entry.files.length})
                          </h5>
                          <div className="grid grid-cols-1 gap-2">
                            {entry.files.map((file, index) => (
                              <a
                                key={index}
                                href={file.url !== '#' ? file.url : undefined}
                                className={clsx(
                                  "flex items-center p-3 rounded-lg border transition-all",
                                  file.url !== '#' 
                                    ? "border-primary-200 bg-primary-50 hover:bg-primary-100 hover:border-primary-300 cursor-pointer group" 
                                    : "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <div className={clsx(
                                  "h-8 w-8 rounded flex items-center justify-center flex-shrink-0",
                                  file.url !== '#' ? "bg-primary-100 group-hover:bg-primary-200" : "bg-gray-200"
                                )}>
                                  <DocumentTextIcon className={clsx(
                                    "h-4 w-4",
                                    file.url !== '#' ? "text-primary-600" : "text-gray-400"
                                  )} />
                                </div>
                                <span className={clsx(
                                  "ml-3 text-sm font-medium truncate",
                                  file.url !== '#' ? "text-primary-700 group-hover:text-primary-800" : "text-gray-500"
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
                        <div className="absolute left-5 top-6 h-6 w-6 rounded-full bg-primary-600 border-4 border-white shadow-md flex items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-white"></div>
                        </div>
                        
                        <div className="card hover:shadow-lg transition-shadow duration-200">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="text-xs text-gray-500 mb-1">
                                Eintrag #{filteredEntries.length - index}
                              </div>
                              <div className="text-sm font-semibold text-gray-900">{formatDate(entry.date)}</div>
                              {entry.attendance && (
                                <span className={clsx(
                                  "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1",
                                  entry.attendance === 'anwesend' ? 'bg-green-100 text-green-700' :
                                  entry.attendance === 'entschuldigt' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                )}>
                                  {entry.attendance}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {entry.homework && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                  HA
                                </span>
                              )}
                              {entry.files && entry.files.length > 0 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                  {entry.files.length} <PaperClipIcon className="h-3 w-3 ml-1" />
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <h4 className="text-base font-semibold text-gray-900 mb-3">{entry.thema}</h4>
                          
                          {entry.homework && (
                            <div className="mb-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                              <div className="flex items-center gap-2 mb-1">
                                <ClockIcon className="h-4 w-4 text-yellow-600" />
                                <span className="text-xs font-semibold text-yellow-900">Hausaufgaben</span>
                                {entry.homework_done && (
                                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                                )}
                              </div>
                              <div className="text-xs text-gray-700 whitespace-pre-wrap">{entry.homework}</div>
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
                                      ? "border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 cursor-pointer"
                                      : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
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