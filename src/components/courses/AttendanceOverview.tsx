import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  AcademicCapIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useBasePath } from '../../contexts/BasePathContext';
import { coursesAPI } from '../../services/api';
import { AttendanceCourse, AttendanceOverviewResponse } from '../../types';
import SEO from '../seo/SEO';

const preferredOrder = ['anwesend', 'entschuldigt', 'unentschuldigt', 'fehlend'];

function labelFor(key: string): string {
  const labels: Record<string, string> = {
    anwesend: 'Anwesend',
    entschuldigt: 'Entschuldigt',
    unentschuldigt: 'Unentschuldigt',
    fehlend: 'Fehlend',
  };
  return labels[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

function formatCount(value: number): string {
  return Number.isInteger(value)
    ? value.toLocaleString('de-DE')
    : value.toLocaleString('de-DE', { maximumFractionDigits: 2 });
}

function iconFor(key: string): React.ElementType {
  if (key === 'anwesend') return CheckCircleIcon;
  if (key === 'unentschuldigt' || key === 'fehlend') return XCircleIcon;
  return ExclamationCircleIcon;
}

function toneFor(key: string): string {
  if (key === 'anwesend') return 'text-emerald-600 dark:text-emerald-400';
  if (key === 'unentschuldigt' || key === 'fehlend') return 'text-red-600 dark:text-red-400';
  if (key === 'entschuldigt') return 'text-amber-600 dark:text-amber-400';
  return 'text-primary-600 dark:text-primary-400';
}

const AttendanceStat: React.FC<{ name: string; value: number }> = ({ name, value }) => {
  const Icon = iconFor(name);
  return (
    <div className="rounded-xl border border-surface-100 bg-surface-50 p-3 dark:border-surface-800 dark:bg-surface-800/60">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${toneFor(name)}`} />
        <span className="text-xs font-medium text-surface-500 dark:text-surface-400">{labelFor(name)}</span>
      </div>
      <p className="mt-2 text-xl font-bold text-surface-900 dark:text-white">{formatCount(value)}</p>
      <p className="text-xs text-surface-400 dark:text-surface-500">Unterrichtsstunden</p>
    </div>
  );
};

const CourseAttendanceCard: React.FC<{ course: AttendanceCourse }> = ({ course }) => {
  const stats = Object.entries(course.attendance_summary);
  return (
    <article className="card">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-950/40">
          <AcademicCapIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-surface-900 dark:text-white">{course.course_name}</h3>
          {(course.teacher_short || course.teacher_full) && (
            <p className="mt-1 truncate text-sm text-surface-500 dark:text-surface-400">
              {course.teacher_full || course.teacher_short}
              {course.teacher_full && course.teacher_short ? ` · ${course.teacher_short}` : ''}
            </p>
          )}
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map(([name, value]) => (
          <div key={name} className="rounded-lg bg-surface-50 px-3 py-2 dark:bg-surface-800/60">
            <dt className="truncate text-[11px] font-medium uppercase tracking-wide text-surface-500 dark:text-surface-400">{labelFor(name)}</dt>
            <dd className={`mt-1 font-semibold ${toneFor(name)}`}>{formatCount(value)}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
};

const AttendanceOverview: React.FC = () => {
  const { token } = useAuth();
  const basePath = useBasePath();
  const navigate = useNavigate();
  const [data, setData] = useState<AttendanceOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setError('');
    coursesAPI.getAttendanceOverview(token, controller.signal)
      .then(response => {
        if (!response.success) throw new Error(response.error || 'Die Anwesenheitsdaten konnten nicht geladen werden.');
        setData(response);
      })
      .catch(err => {
        if (axios.isCancel(err)) return;
        setData(null);
        setError(err instanceof Error ? err.message : 'Die Anwesenheitsdaten konnten nicht geladen werden.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [token, reloadKey]);

  const totalStats = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.totals).sort(([left], [right]) => {
      const leftIndex = preferredOrder.indexOf(left);
      const rightIndex = preferredOrder.indexOf(right);
      if (leftIndex === -1 && rightIndex === -1) return left.localeCompare(right, 'de');
      if (leftIndex === -1) return 1;
      if (rightIndex === -1) return -1;
      return leftIndex - rightIndex;
    });
  }, [data]);

  if (!token) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100">Nicht authentifiziert</h3>
          <p className="text-surface-500">Bitte melden Sie sich an, um die Anwesenheit zu sehen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <SEO title="Anwesenheit" description="Deine Anwesenheitsübersicht aus Mein Unterricht im Schulportal Hessen." noindex />
      <div className="mx-auto max-w-7xl">
        <header className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              className="mt-0.5 rounded-lg p-2 text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-800 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-white"
              onClick={() => navigate(`${basePath}/courses`)}
              aria-label="Zurück zu Mein Unterricht"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-white sm:text-3xl">Anwesenheit</h1>
              <p className="mt-1.5 text-sm text-surface-500 dark:text-surface-400">Gesamtübersicht aus Mein Unterricht</p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary self-start"
            onClick={() => setReloadKey(value => value + 1)}
            disabled={loading}
          >
            <ArrowPathIcon className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </button>
        </header>

        {error && (
          <div className="card mb-5 border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="card flex min-h-64 items-center justify-center">
            <div className="text-center text-surface-500">
              <ArrowPathIcon className="mx-auto mb-3 h-7 w-7 animate-spin text-primary-500" />
              Anwesenheit wird geladen …
            </div>
          </div>
        ) : !error && data?.available === false ? (
          <div className="card flex min-h-64 flex-col items-center justify-center text-center">
            <ChartBarIcon className="mb-3 h-10 w-10 text-surface-300" />
            <h2 className="font-semibold text-surface-900 dark:text-white">Keine Anwesenheitsdaten</h2>
            <p className="mt-1 max-w-md text-sm text-surface-500 dark:text-surface-400">
              Für dieses Schulportal-Konto wurden in Mein Unterricht noch keine Anwesenheitsübersichten gefunden.
            </p>
          </div>
        ) : !error && data ? (
          <>
            <div className="mb-6 rounded-xl border border-primary-100 bg-primary-50/70 p-4 dark:border-primary-900 dark:bg-primary-950/40">
              <p className="text-sm text-primary-900 dark:text-primary-100">
                Zusammengefasst aus {data.attendance_course_count} von {data.course_count} Kursen.
                {data.failed_course_count > 0 && ` ${data.failed_course_count} Kurs${data.failed_course_count === 1 ? '' : 'e'} konnten nicht geladen werden.`}
              </p>
            </div>

            <section className="mb-8">
              <div className="mb-3 flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Gesamt</h2>
              </div>
              {totalStats.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {totalStats.map(([name, value]) => <AttendanceStat key={name} name={name} value={value} />)}
                </div>
              ) : (
                <div className="card text-sm text-surface-500">Keine auswertbaren Summen vorhanden.</div>
              )}
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-surface-900 dark:text-white">Nach Kurs</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {data.courses.map(course => <CourseAttendanceCard key={course.course_id} course={course} />)}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default AttendanceOverview;
