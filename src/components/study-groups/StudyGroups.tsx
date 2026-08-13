import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  AcademicCapIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ClockIcon,
  EnvelopeIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useBasePath } from '../../contexts/BasePathContext';
import { studyGroupsAPI } from '../../services/api';
import { StudyGroup, StudyGroupExam } from '../../types';
import SEO from '../seo/SEO';

const formatExamDate = (date: string | null) => {
  if (!date) return 'Datum offen';
  try {
    return format(parseISO(date), 'EEEE, d. MMMM yyyy', { locale: de });
  } catch {
    return date;
  }
};

const StudyGroups: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const basePath = useBasePath();
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [exams, setExams] = useState<StudyGroupExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');

    studyGroupsAPI.getStudyGroups(token, controller.signal)
      .then(response => {
        if (!response.success) throw new Error(response.error || 'Die Lerngruppen konnten nicht geladen werden.');
        setGroups(response.groups || []);
        setExams(response.exams || []);
      })
      .catch(err => {
        if (axios.isCancel(err)) return;
        setError(err.response?.data?.detail || err.message || 'Die Lerngruppen konnten nicht geladen werden.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [token, reloadKey]);

  const upcomingExams = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return exams
      .filter(exam => !exam.date || parseISO(exam.date) >= today)
      .sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  }, [exams]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <SEO
        title="Lerngruppen"
        description="Deine Lerngruppen, Lehrkräfte und Klausurtermine im Schulportal Hessen."
        path="/study-groups"
        noindex
      />
      <div className="page-header">
        <h1 className="page-title">Lerngruppen</h1>
        <p className="page-subtitle">Kurse, Lehrkräfte und anstehende Klausuren</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, index) => <div key={index} className="skeleton h-40" />)}
          </div>
        </div>
      ) : error ? (
        <div className="card flex min-h-64 flex-col items-center justify-center text-center">
          <UserGroupIcon className="mb-3 h-10 w-10 text-red-400" />
          <h2 className="font-semibold text-surface-900 dark:text-surface-100">Lerngruppen nicht verfügbar</h2>
          <p className="mt-1 max-w-md text-sm text-surface-500 dark:text-surface-400">{error}</p>
          <button className="btn btn-secondary mt-4" onClick={() => setReloadKey(value => value + 1)}>
            <ArrowPathIcon className="mr-2 h-4 w-4" />Erneut versuchen
          </button>
        </div>
      ) : groups.length === 0 ? (
        <div className="empty-state">
          <UserGroupIcon className="empty-state-icon" />
          <h2 className="empty-state-title">Keine Lerngruppen gefunden</h2>
          <p className="empty-state-text">Für dein Schulportal-Konto sind derzeit keine Lerngruppen hinterlegt.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {upcomingExams.length > 0 && (
            <section aria-labelledby="upcoming-exams">
              <div className="mb-3 flex items-center gap-2">
                <CalendarDaysIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                <h2 id="upcoming-exams" className="text-lg font-semibold text-surface-900 dark:text-surface-100">Anstehende Klausuren</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {upcomingExams.map(exam => <ExamCard key={exam.id} exam={exam} />)}
              </div>
            </section>
          )}

          <section aria-labelledby="group-list">
            <div className="mb-3 flex items-center gap-2">
              <AcademicCapIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              <h2 id="group-list" className="text-lg font-semibold text-surface-900 dark:text-surface-100">Meine Gruppen</h2>
              <span className="badge badge-surface">{groups.length}</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {groups.map(group => (
                <article key={group.id} className="card !p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-surface-900 dark:text-surface-100">{group.course_name || 'Unbenannte Lerngruppe'}</h3>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-surface-500 dark:text-surface-400">
                        {group.semester && <span className="badge badge-surface">{group.semester}</span>}
                      </div>
                    </div>
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-primary-50 dark:bg-primary-950 flex items-center justify-center">
                      <UserGroupIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                  </div>

                  <div className="mt-4 border-t pt-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-surface-400">Lehrkräfte</p>
                    {group.teachers.length ? group.teachers.map((teacher, index) => {
                      const name = [teacher.first_name, teacher.last_name].filter(Boolean).join(' ') || teacher.krz;
                      const initials = [teacher.first_name, teacher.last_name]
                        .filter(Boolean)
                        .map(part => part.charAt(0))
                        .join('') || teacher.krz.slice(0, 2);
                      const openMessageComposer = () => {
                        const params = new URLSearchParams({
                          compose: '1',
                          recipient: teacher.recipient_id || '',
                          recipientName: name,
                          recipientUsername: teacher.krz,
                        });
                        navigate(`${basePath}/messages?${params.toString()}`);
                      };
                      return (
                        <div key={`${teacher.krz}-${index}`} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                          <span className="flex min-w-0 items-center gap-2 text-surface-700 dark:text-surface-300">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold uppercase text-primary-700 dark:bg-primary-950 dark:text-primary-300" aria-hidden="true">
                              {initials}
                            </span>
                            <span className="truncate">{name}</span>
                            {teacher.krz && <span className="text-xs text-surface-400">({teacher.krz})</span>}
                          </span>
                          {teacher.recipient_id ? (
                            <button type="button" onClick={openMessageComposer} className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 hover:text-primary-600 dark:hover:bg-surface-800" title={`Nachricht an ${name}`} aria-label={`Nachricht an ${name}`}>
                              <EnvelopeIcon className="h-4 w-4" />
                            </button>
                          ) : teacher.email ? (
                            <a href={`mailto:${teacher.email}`} className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 hover:text-primary-600 dark:hover:bg-surface-800" title={`E-Mail an ${name}`}>
                              <EnvelopeIcon className="h-4 w-4" />
                            </a>
                          ) : null}
                        </div>
                      );
                    }) : <p className="text-sm text-surface-400">Keine Lehrkraft angegeben</p>}
                  </div>

                  {group.exams.length > 0 && (
                    <div className="mt-4 border-t pt-4">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-surface-400">Klausuren</p>
                      <div className="space-y-2">{group.exams.map(exam => <ExamCard key={exam.id} exam={exam} compact />)}</div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

const ExamCard: React.FC<{ exam: StudyGroupExam; compact?: boolean }> = ({ exam, compact = false }) => (
  <article className={`${compact ? 'rounded-xl border bg-surface-50 dark:bg-surface-800/40 p-3' : 'card !p-4'}`}>
    <div className="flex items-start gap-3">
      <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-2">
        <CalendarDaysIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="min-w-0">
        <p className="font-medium text-surface-900 dark:text-surface-100">{exam.course_name || exam.type || 'Klausur'}</p>
        <p className="mt-0.5 text-sm text-surface-500 dark:text-surface-400">{formatExamDate(exam.date)}</p>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-surface-400">
          {exam.type && exam.course_name && <span>{exam.type}</span>}
          {exam.duration_label && <span className="flex items-center gap-1"><ClockIcon className="h-3.5 w-3.5" />{exam.duration_label}</span>}
          {exam.hours && <span>{exam.hours}</span>}
        </div>
      </div>
    </div>
  </article>
);

export default StudyGroups;
