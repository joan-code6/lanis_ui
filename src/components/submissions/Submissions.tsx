import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  DocumentArrowUpIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  LockClosedIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useBasePath } from '../../contexts/BasePathContext';
import { coursesAPI } from '../../services/api';
import { Submission, SubmissionDetail, SubmissionUploadStatus } from '../../types';

const statusLabel = (status: string) => status === 'open' ? 'Offen' : 'Geschlossen';

const statusClasses = (status: string) => status === 'open'
  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
  : 'bg-surface-200 text-surface-700 dark:bg-surface-800 dark:text-surface-300';

const parseMaxBytes = (value?: string | null) => {
  if (!value) return null;
  const match = value.replace(',', '.').match(/([\d.]+)\s*(KB|MB|GB)/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const multiplier = match[2].toUpperCase() === 'GB'
    ? 1_000_000_000
    : match[2].toUpperCase() === 'MB' ? 1_000_000 : 1_000;
  return Number.isFinite(amount) ? amount * multiplier : null;
};

const formatBytes = (bytes: number) => {
  if (bytes < 1_000_000) return `${Math.round(bytes / 1_000)} KB`;
  return `${(bytes / 1_000_000).toFixed(bytes >= 10_000_000 ? 0 : 1)} MB`;
};

const extensionOf = (filename: string) => filename.split('.').pop()?.toLowerCase() || '';

const allowedExtension = (filename: string, allowed: string[]) => {
  if (!allowed.length || allowed.some(value => value.trim().toLowerCase() === 'alle')) return true;
  const extension = extensionOf(filename);
  return allowed.some(value => value.trim().replace(/^\./, '').toLowerCase() === extension);
};

const SubmissionStatus: React.FC<{ status: string }> = ({ status }) => (
  <span className={clsx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', statusClasses(status))}>
    {status === 'open' ? <CheckCircleIcon className="h-3.5 w-3.5" /> : <LockClosedIcon className="h-3.5 w-3.5" />}
    {statusLabel(status)}
  </span>
);

const SubmissionCard: React.FC<{
  submission: Submission;
  onOpen: () => void;
}> = ({ submission, onOpen }) => (
  <button
    type="button"
    onClick={onOpen}
    className="group w-full text-left card card-hover overflow-hidden p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
  >
    <div className="flex min-h-36">
      <div className="min-w-0 flex-1 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-surface-500 dark:text-surface-400">
              {submission.course_name || 'Kurs'}
            </p>
            <h2 className="mt-1 break-words text-lg font-semibold text-surface-900 dark:text-surface-100 group-hover:text-primary-700 dark:group-hover:text-primary-300">
              {submission.title}
            </h2>
          </div>
          <SubmissionStatus status={submission.status} />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-surface-600 dark:text-surface-400">
          <span className="inline-flex items-center gap-1.5">
            <ClockIcon className="h-4 w-4" />
            {submission.date_text || 'Frist in den Details'}
          </span>
          {submission.uploaded_count !== null && submission.uploaded_count !== undefined && (
            <span className="inline-flex items-center gap-1.5">
              <DocumentTextIcon className="h-4 w-4" />
              {submission.uploaded_count} {submission.uploaded_count === 1 ? 'Datei' : 'Dateien'} abgegeben
            </span>
          )}
        </div>
      </div>
      <div className="hidden items-center pr-5 text-surface-400 transition-transform group-hover:translate-x-1 sm:flex">
        <ChevronRightIcon className="h-5 w-5" />
      </div>
    </div>
  </button>
);

const FileRow: React.FC<{
  name: string;
  meta?: string | null;
  action?: React.ReactNode;
}> = ({ name, meta, action }) => (
  <div className="flex items-center gap-3 border-b border-surface-200 py-3 last:border-b-0 dark:border-surface-800">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center text-surface-500 dark:text-surface-400">
      <DocumentTextIcon className="h-5 w-5" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="break-words text-sm font-medium text-surface-900 dark:text-surface-100">{name}</p>
      {meta && <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-surface-500 dark:text-surface-400">{meta}</p>}
    </div>
    {action}
  </div>
);

const UploadResults: React.FC<{ statuses: SubmissionUploadStatus[] }> = ({ statuses }) => (
  <div className="mt-4 space-y-2 border-t border-surface-200 pt-4 dark:border-surface-800">
    <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">Upload-Ergebnis</p>
    {statuses.map((item, index) => (
      <div key={`${item.name}-${index}`} className="flex items-start gap-2 text-sm">
        {item.status === 'erfolgreich'
          ? <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          : <ExclamationCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />}
        <span className="min-w-0 text-surface-700 dark:text-surface-300">
          <span className="font-medium">{item.name}</span> · {item.status}
          {item.message && <span className="text-surface-500"> — {item.message}</span>}
        </span>
      </div>
    ))}
  </div>
);

const SubmissionDetailView: React.FC<{
  detail: SubmissionDetail;
  refreshError: string;
  refreshing: boolean;
  token: string;
  onBack: () => void;
  onRefresh: () => Promise<void>;
}> = ({ detail, refreshError, refreshing, token, onBack, onRefresh }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [uploadStatuses, setUploadStatuses] = useState<SubmissionUploadStatus[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!deleteTarget || !dialog) return;
    const previousFocus = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [deleteTarget]);

  const closeDeleteDialog = () => {
    if (busy) return;
    setDeleteTarget(null);
    setDeleteError('');
  };

  // Match the API transport limits as well as the assignment's own rules.
  const transportMaxBytes = 50 * 1024 * 1024;
  const maxBytes = Math.min(parseMaxBytes(detail.max_file_size) ?? transportMaxBytes, transportMaxBytes);
  const attemptClosed = detail.allows_multiple_attempts === false && detail.own_files.length > 0;
  const uploadAllowed = detail.status === 'open' && detail.can_upload && !attemptClosed;
  const multipleFilesAllowed = detail.allows_multiple_files !== false;
  const accept = detail.allowed_file_types.length > 0
    && !detail.allowed_file_types.some(type => type.trim().toLowerCase() === 'alle')
    ? detail.allowed_file_types
      .map(type => `.${type.toLowerCase().replace(/^\./, '')}`)
      .join(',')
    : undefined;

  const chooseFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setError('');
    if (!multipleFilesAllowed && files.length > 1) {
      setError('Für diese Abgabe ist nur eine Datei erlaubt.');
      event.target.value = '';
      return;
    }
    if (files.length > 5) {
      setError('Du kannst höchstens fünf Dateien auf einmal hochladen.');
      event.target.value = '';
      return;
    }
    if (files.reduce((total, file) => total + file.size, 0) > transportMaxBytes) {
      setError('Die ausgewählten Dateien dürfen zusammen höchstens 50 MiB groß sein.');
      event.target.value = '';
      return;
    }
    const invalidType = files.find(file => !allowedExtension(file.name, detail.allowed_file_types));
    if (invalidType) {
      setError(`${invalidType.name} hat keinen erlaubten Dateityp.`);
      event.target.value = '';
      return;
    }
    const oversized = files.find(file => file.size > maxBytes);
    if (oversized) {
      setError(`${oversized.name} ist mit ${formatBytes(oversized.size)} größer als erlaubt (${detail.max_file_size || '50 MiB'}).`);
      event.target.value = '';
      return;
    }
    setUploadStatuses([]);
    setSelectedFiles(files);
  };

  const upload = async () => {
    if (!selectedFiles.length || busy || refreshing || !uploadAllowed) return;
    setBusy(true);
    setError('');
    setUploadStatuses([]);
    try {
      const response = await coursesAPI.uploadSubmissionFiles(token, detail, selectedFiles);
      if (!mountedRef.current) return;
      if (!response.success) {
        setError(response.error || 'Die Dateien konnten nicht hochgeladen werden.');
      } else {
        setUploadStatuses(response.files || []);
        const statusesByName = new Map<string, SubmissionUploadStatus[]>();
        for (const status of response.files || []) {
          const statuses = statusesByName.get(status.name) || [];
          statuses.push(status);
          statusesByName.set(status.name, statuses);
        }
        setSelectedFiles(response.all_succeeded ? [] : selectedFiles.filter(
          file => statusesByName.get(file.name)?.shift()?.status !== 'erfolgreich',
        ));
        if (inputRef.current) inputRef.current.value = '';
        if (mountedRef.current) await onRefresh();
      }
    } catch (uploadError) {
      if (!axios.isCancel(uploadError)) setError('Die Dateien konnten nicht hochgeladen werden.');
    } finally {
      setBusy(false);
    }
  };

  const download = async (fileRef: string, name: string) => {
    if (downloading) return;
    setDownloading(fileRef);
    setError('');
    try {
      const blob = await coursesAPI.downloadSubmissionFile(token, fileRef);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      setError('Die Datei konnte nicht heruntergeladen werden.');
    } finally {
      setDownloading(null);
    }
  };

  const removeFile = async () => {
    if (!deleteTarget || busy || refreshing) return;
    setBusy(true);
    setError('');
    setDeleteError('');
    try {
      const response = await coursesAPI.deleteSubmissionFile(token, detail, deleteTarget);
      if (!mountedRef.current) return;
      if (!response.success) {
        setDeleteError(response.code === '-1'
          ? 'Deine Anmeldung wird vom Schulportal nicht mehr akzeptiert. Bitte melde dich erneut an.'
          : response.code === '-2'
            ? 'Diese Datei kann nicht mehr gelöscht werden.'
            : 'Die Datei konnte nicht gelöscht werden. Bitte versuche es erneut.');
      } else {
        setDeleteTarget(null);
        setDeleteError('');
        if (mountedRef.current) await onRefresh();
      }
    } catch {
      setDeleteError('Die Datei konnte nicht gelöscht werden.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <button type="button" onClick={onBack} className="mt-1 rounded-lg p-2 text-surface-500 hover:bg-surface-200 hover:text-surface-800 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-100" aria-label="Zurück zu den Abgaben">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary-700 dark:text-primary-300">{detail.course_name || 'Kurs'}</p>
            <h1 className="mt-1 break-words page-title">{detail.title}</h1>
          </div>
        </div>
        <button type="button" onClick={() => void onRefresh()} disabled={refreshing || busy} className="btn btn-secondary inline-flex items-center gap-2">
          <ArrowPathIcon className={clsx('h-4 w-4', refreshing && 'animate-spin')} /> Aktualisieren
        </button>
      </div>

      {(error || refreshError) && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200"><ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />{error || refreshError}</div>}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,.7fr)]">
        <section className="card overflow-hidden p-0">
          <div className="border-b border-surface-200 px-5 py-4 dark:border-surface-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-surface-500">Abgabe</p><h2 className="mt-1 text-xl font-semibold text-surface-900 dark:text-surface-100">Deine Dateien</h2></div>
              <SubmissionStatus status={detail.status} />
            </div>
          </div>
          <div className="space-y-3 p-5">
            {detail.own_files.length === 0 && <p className="py-2 text-sm text-surface-500 dark:text-surface-400">Du hast noch keine Datei abgegeben.</p>}
            {detail.own_files.length > 0 && <div>{detail.own_files.map(file => (
              <FileRow
                key={file.index}
                name={file.name}
                meta={[file.time, file.comment].filter(Boolean).join(' · ') || null}
                action={<div className="flex shrink-0 items-center gap-1"><button type="button" className="rounded-lg p-2 text-surface-500 hover:bg-surface-100 hover:text-primary-700 dark:hover:bg-surface-800 dark:hover:text-primary-300" onClick={() => void download(file.download_ref, file.name)} disabled={Boolean(downloading)} title="Datei herunterladen"><ArrowDownTrayIcon className={clsx('h-4 w-4', downloading === file.download_ref && 'animate-bounce')} /></button>{detail.can_delete && <button type="button" className="rounded-lg p-2 text-surface-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 dark:hover:text-red-300" onClick={() => setDeleteTarget(file.index)} disabled={busy || refreshing} aria-label={`${file.name} löschen`} title="Datei löschen"><TrashIcon className="h-4 w-4" /></button>}</div>}
              />
            ))}</div>}

            {uploadAllowed ? (
              <div className="space-y-4 pt-2">
                <input ref={inputRef} type="file" className="hidden" multiple={multipleFilesAllowed} accept={accept} onChange={chooseFiles} disabled={busy || refreshing} />
                <button type="button" onClick={() => inputRef.current?.click()} disabled={busy || refreshing} className="flex w-full items-center gap-3 rounded-lg border border-dashed border-surface-300 px-4 py-5 text-left text-surface-700 transition-colors hover:border-primary-400 hover:bg-surface-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed dark:border-surface-700 dark:text-surface-200 dark:hover:border-primary-500 dark:hover:bg-surface-800/50">
                  <DocumentArrowUpIcon className="h-6 w-6 shrink-0 text-surface-500 dark:text-surface-400" />
                  <span className="min-w-0">
                    <span className="block font-semibold">Dateien auswählen</span>
                    <span className="mt-1 block text-xs text-surface-500 dark:text-surface-400">{detail.allowed_file_types.join(', ') || 'Erlaubte Dateitypen ansehen'} · {multipleFilesAllowed ? 'Bis zu fünf Dateien pro Upload' : 'Maximal eine Datei'}</span>
                  </span>
                </button>
                {selectedFiles.length > 0 && <div>{selectedFiles.map(file => <FileRow key={`${file.name}-${file.lastModified}`} name={file.name} meta={formatBytes(file.size)} action={<button type="button" onClick={() => { setSelectedFiles(current => current.filter(item => item !== file)); if (inputRef.current) inputRef.current.value = ''; }} className="rounded-lg p-2 text-surface-500 hover:bg-surface-200 dark:hover:bg-surface-800" disabled={busy || refreshing} aria-label={`${file.name} entfernen`}><XMarkIcon className="h-4 w-4" /></button>} />)}</div>}
                <div className="flex justify-end">
                  <button type="button" onClick={() => void upload()} disabled={!selectedFiles.length || busy || refreshing} className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{busy ? 'Wird hochgeladen …' : 'Hochladen'}</button>
                </div>
              </div>
            ) : (
              <div className="mt-5 flex items-start gap-2 rounded-xl bg-surface-100 px-4 py-3 text-sm text-surface-600 dark:bg-surface-800 dark:text-surface-300"><InformationCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />{attemptClosed ? 'Diese Abgabe erlaubt keine weiteren Versuche.' : detail.status === 'closed' ? 'Die Abgabe ist geschlossen.' : 'Das Hochladen ist derzeit nicht möglich.'}</div>
            )}
            {uploadStatuses.length > 0 && <UploadResults statuses={uploadStatuses} />}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="card">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-surface-500">Zeitfenster</p>
            <dl className="mt-4 space-y-3 text-sm"><div><dt className="text-surface-500">Start</dt><dd className="font-medium text-surface-900 dark:text-surface-100">{detail.start || 'Nicht angegeben'}</dd></div><div><dt className="text-surface-500">Frist</dt><dd className="font-medium text-surface-900 dark:text-surface-100">{detail.deadline || 'Nicht angegeben'}</dd></div><div><dt className="text-surface-500">Automatische Löschung</dt><dd className="font-medium text-surface-900 dark:text-surface-100">{detail.automatic_deletion || 'Nicht angegeben'}</dd></div></dl>
          </section>
          <section className="card"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-surface-500">Regeln</p><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-surface-500">Dateitypen</dt><dd className="font-medium text-surface-900 dark:text-surface-100">{detail.allowed_file_types.join(', ') || 'Portal entscheidet'}</dd></div><div><dt className="text-surface-500">Maximale Größe</dt><dd className="font-medium text-surface-900 dark:text-surface-100">{detail.max_file_size || 'Portal entscheidet'}</dd></div><div><dt className="text-surface-500">Mehrere Dateien</dt><dd className="font-medium text-surface-900 dark:text-surface-100">{detail.allows_multiple_files == null ? 'Nicht angegeben' : detail.allows_multiple_files ? 'Erlaubt' : 'Nicht erlaubt'}</dd></div><div><dt className="text-surface-500">Weitere Versuche</dt><dd className="font-medium text-surface-900 dark:text-surface-100">{detail.allows_multiple_attempts == null ? 'Nicht angegeben' : detail.allows_multiple_attempts ? 'Erlaubt' : 'Nicht erlaubt'}</dd></div></dl>{detail.additional_text && <p className="mt-4 rounded-lg bg-primary-50 px-3 py-2 text-sm text-primary-900 dark:bg-primary-950/40 dark:text-primary-100">{detail.additional_text}</p>}</section>
          {detail.public_files.length > 0 && <section className="card"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-surface-500">Weitere Dateien</p><div className="mt-3 space-y-2">{detail.public_files.map(file => <FileRow key={file.index} name={file.name} meta={[file.person, file.time, file.comment].filter(Boolean).join(' · ') || null} action={<button type="button" onClick={() => void download(file.download_ref, file.name)} className="rounded-lg p-2 text-surface-500 hover:bg-surface-100 hover:text-primary-700 dark:hover:bg-surface-800 dark:hover:text-primary-300" disabled={Boolean(downloading)} title="Datei herunterladen"><ArrowDownTrayIcon className="h-4 w-4" /></button>} />)}</div></section>}
        </aside>
      </div>

      {deleteTarget && (
        <dialog
          ref={dialogRef}
          className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl bg-white p-6 text-surface-900 shadow-soft-lg backdrop:bg-surface-950/60 backdrop:backdrop-blur-sm dark:bg-surface-900 dark:text-surface-100"
          aria-labelledby="delete-submission-file-title"
          aria-describedby="delete-submission-file-description"
          onCancel={event => { event.preventDefault(); closeDeleteDialog(); }}
        >
          <form onSubmit={event => { event.preventDefault(); void removeFile(); }}>
            <h2 id="delete-submission-file-title" className="text-lg font-semibold">Datei löschen?</h2>
            <p className="mt-2 break-words text-sm font-medium">{detail.own_files.find(file => file.index === deleteTarget)?.name}</p>
            <p id="delete-submission-file-description" className="mt-2 text-sm text-surface-600 dark:text-surface-400">
              Die Datei wird aus dieser Abgabe gelöscht.
            </p>
            {deleteError && <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200"><ExclamationCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />{deleteError}</div>}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="btn btn-secondary" autoFocus disabled={busy} onClick={closeDeleteDialog}>Abbrechen</button>
              <button type="submit" className="btn btn-primary" disabled={busy || refreshing}>{busy ? 'Wird gelöscht …' : 'Endgültig löschen'}</button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
};

const Submissions: React.FC = () => {
  const { token } = useAuth();
  const basePath = useBasePath();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'submitted'>('all');
  const [detail, setDetail] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const listRequestRef = useRef(0);
  const detailRequestRef = useRef(0);
  const previousDetailIdRef = useRef(id);
  const detailNavigationPending = Boolean(id) && previousDetailIdRef.current !== id;
  const currentIdRef = useRef(id);
  useLayoutEffect(() => {
    currentIdRef.current = id;
  }, [id]);

  const listPath = `${basePath}/courses/submissions`;
  const openSubmission = (submission: Submission) => navigate(`${listPath}/${encodeURIComponent(submission.detail_ref || submission.id)}`);

  const loadList = async (signal?: AbortSignal, refresh = false) => {
    if (!token || currentIdRef.current) return;
    const requestId = ++listRequestRef.current;
    setLoading(true);
    setError('');
    try {
      const response = await coursesAPI.getSubmissions(token, signal, refresh);
      if (requestId !== listRequestRef.current || signal?.aborted || currentIdRef.current) return;
      if (response.success) setSubmissions(response.submissions || []);
      else setError(response.error || 'Die Abgaben konnten nicht geladen werden.');
    } catch (loadError) {
      if (requestId === listRequestRef.current && !currentIdRef.current && !axios.isCancel(loadError)) setError('Die Abgaben konnten nicht geladen werden.');
    } finally {
      if (requestId === listRequestRef.current && !currentIdRef.current && !signal?.aborted) setLoading(false);
    }
  };

  const loadDetail = async (detailRef: string, signal?: AbortSignal, refresh = false) => {
    if (!token || currentIdRef.current !== detailRef) return;
    const requestId = detailRequestRef.current + 1;
    detailRequestRef.current = requestId;
    setLoading(true);
    setError('');
    try {
      const response = await coursesAPI.getSubmission(token, detailRef, signal, refresh);
      if (requestId !== detailRequestRef.current || signal?.aborted || currentIdRef.current !== detailRef) return;
      if (response.success && response.submission) setDetail(response.submission);
      else setError(response.error || 'Die Abgabe konnte nicht geladen werden.');
    } catch (loadError) {
      if (requestId === detailRequestRef.current && currentIdRef.current === detailRef && !axios.isCancel(loadError)) {
        setError('Die Abgabe konnte nicht geladen werden.');
      }
    } finally {
      if (requestId === detailRequestRef.current && currentIdRef.current === detailRef && !signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    previousDetailIdRef.current = id;
    setDetail(null);
    if (id) void loadDetail(id, controller.signal);
    else {
      detailRequestRef.current += 1;
      void loadList(controller.signal);
    }
    return () => {
      controller.abort();
      listRequestRef.current += 1;
      detailRequestRef.current += 1;
    };
  }, [token, id]);

  const openCount = useMemo(() => submissions.filter(item => item.status === 'open').length, [submissions]);
  const submittedCount = useMemo(() => submissions.filter(item => (item.uploaded_count ?? 0) > 0).length, [submissions]);
  const visibleSubmissions = useMemo(() => submissions.filter(item => (
    filter === 'open' ? item.status === 'open'
      : filter === 'submitted' ? (item.uploaded_count ?? 0) > 0 : true
  )), [submissions, filter]);
  const filters = [
    { key: 'all', label: 'Alle', count: submissions.length },
    { key: 'open', label: 'Offen', count: openCount },
    { key: 'submitted', label: 'Abgegeben', count: submittedCount },
  ] as const;
  const emptyTitle = submissions.length === 0 ? 'Keine Abgaben'
    : filter === 'open' ? 'Keine offenen Abgaben' : 'Noch nichts abgegeben';
  const emptyDescription = submissions.length === 0
    ? 'Sobald dir ein Upload-Auftrag zugewiesen wurde, erscheint er hier.'
    : filter === 'open'
      ? 'Zurzeit ist keine Abgabe zum Hochladen geöffnet.'
      : 'Sobald du eine Datei abgegeben hast, findest du die Abgabe hier.';
  const isDetail = Boolean(id);

  if (!token) return <div className="p-6 text-center text-surface-500">Nicht authentifiziert</div>;

  return (
    <div className="min-h-full min-w-0 module-padding">
      {isDetail && detail && detail.detail_ref === id ? (
        <SubmissionDetailView key={id} detail={detail} refreshError={error} refreshing={loading} token={token} onBack={() => navigate(listPath)} onRefresh={async () => { if (id && currentIdRef.current === id) await loadDetail(id, undefined, true); }} />
      ) : !isDetail ? (
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="page-header page-header-actions">
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
                <h1 className="page-title">Abgaben</h1>
                <p className="page-subtitle">Upload-Aufträge und Fristen</p>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-secondary self-start"
              onClick={() => void loadList(undefined, true)}
              disabled={loading}
            >
              <ArrowPathIcon className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Aktualisieren
            </button>
          </header>
          {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200"><ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />{error}</div>}
          {!loading && !error && (
            <div role="group" aria-label="Abgaben filtern" className="inline-flex max-w-full flex-wrap gap-1 rounded-xl bg-surface-100 p-1 dark:bg-surface-900">
              {filters.map(option => (
                <button
                  key={option.key}
                  type="button"
                  aria-pressed={filter === option.key}
                  aria-controls="submission-results"
                  onClick={() => setFilter(option.key)}
                  className={clsx(
                    'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                    filter === option.key
                      ? 'bg-white text-surface-900 shadow-sm dark:bg-surface-800 dark:text-surface-100'
                      : 'text-surface-500 hover:bg-white/60 hover:text-surface-800 dark:text-surface-400 dark:hover:bg-surface-800/60 dark:hover:text-surface-200',
                  )}
                >
                  {option.label}
                  <span className="rounded-md bg-surface-200/60 px-1.5 py-0.5 text-xs tabular-nums text-surface-600 dark:bg-surface-700/60 dark:text-surface-300">{option.count}</span>
                </button>
              ))}
            </div>
          )}
          <div id="submission-results" aria-busy={loading}>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="card h-36 animate-pulse bg-surface-100 dark:bg-surface-900" />)}</div>
            ) : visibleSubmissions.length === 0 ? !error && (
              <div className="card py-14 text-center">
                <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-surface-400" />
                <h2 className="mt-3 text-lg font-semibold text-surface-900 dark:text-surface-100">{emptyTitle}</h2>
                <p className="mx-auto mt-1 max-w-md text-sm text-surface-500 dark:text-surface-400">{emptyDescription}</p>
              </div>
            ) : (
              <div className="space-y-3">{visibleSubmissions.map(submission => <SubmissionCard key={submission.id} submission={submission} onOpen={() => openSubmission(submission)} />)}</div>
            )}
            {!loading && !error && <p role="status" className="sr-only">{visibleSubmissions.length} {visibleSubmissions.length === 1 ? 'Abgabe angezeigt' : 'Abgaben angezeigt'}</p>}
          </div>
        </div>
      ) : loading || detailNavigationPending ? (
        <div className="mx-auto max-w-5xl space-y-4"><div className="h-10 w-2/3 animate-pulse rounded bg-surface-200 dark:bg-surface-800" /><div className="card h-96 animate-pulse bg-surface-100 dark:bg-surface-900" /></div>
      ) : (
        <div className="mx-auto max-w-5xl"><div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200"><ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />{error || 'Die Abgabe konnte nicht geladen werden.'}</div><button type="button" className="btn btn-secondary mt-4" onClick={() => navigate(listPath)}>Zurück zu den Abgaben</button></div>
      )}
    </div>
  );
};

export default Submissions;
