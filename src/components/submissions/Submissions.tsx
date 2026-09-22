import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
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
      <div className={clsx('w-2 shrink-0', submission.status === 'open' ? 'bg-primary-500' : 'bg-surface-300 dark:bg-surface-700')} />
      <div className="min-w-0 flex-1 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-surface-500 dark:text-surface-400">
              {submission.course_name || 'Kurs'}
            </p>
            <h2 className="mt-1 truncate text-lg font-semibold text-surface-900 dark:text-surface-100 group-hover:text-primary-700 dark:group-hover:text-primary-300">
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
        <ArrowDownTrayIcon className="h-5 w-5 rotate-[-90deg]" />
      </div>
    </div>
  </button>
);

const FileRow: React.FC<{
  name: string;
  meta?: string | null;
  action?: React.ReactNode;
}> = ({ name, meta, action }) => (
  <div className="flex items-center gap-3 rounded-xl border border-surface-200 bg-white px-3 py-3 dark:border-surface-800 dark:bg-surface-900">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300">
      <DocumentTextIcon className="h-5 w-5" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium text-surface-900 dark:text-surface-100">{name}</p>
      {meta && <p className="mt-0.5 truncate text-xs text-surface-500 dark:text-surface-400">{meta}</p>}
    </div>
    {action}
  </div>
);

const UploadResults: React.FC<{ statuses: SubmissionUploadStatus[] }> = ({ statuses }) => (
  <div className="mt-4 space-y-2 rounded-xl border border-surface-200 p-4 dark:border-surface-800">
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
  token: string;
  onBack: () => void;
  onRefresh: () => Promise<void>;
}> = ({ detail, refreshError, token, onBack, onRefresh }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [uploadStatuses, setUploadStatuses] = useState<SubmissionUploadStatus[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [password, setPassword] = useState('');

  const maxBytes = parseMaxBytes(detail.max_file_size);
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
    setError('');
    if (!multipleFilesAllowed && files.length > 1) {
      setError('Für diese Abgabe ist nur eine Datei erlaubt.');
      event.target.value = '';
      return;
    }
    const invalidType = files.find(file => !allowedExtension(file.name, detail.allowed_file_types));
    if (invalidType) {
      setError(`${invalidType.name} hat keinen erlaubten Dateityp.`);
      event.target.value = '';
      return;
    }
    if (maxBytes !== null) {
      const oversized = files.find(file => file.size > maxBytes);
      if (oversized) {
        setError(`${oversized.name} ist mit ${formatBytes(oversized.size)} größer als erlaubt (${detail.max_file_size}).`);
        event.target.value = '';
        return;
      }
    }
    setSelectedFiles(files);
  };

  const upload = async () => {
    if (!selectedFiles.length || busy) return;
    setBusy(true);
    setError('');
    setUploadStatuses([]);
    try {
      const response = await coursesAPI.uploadSubmissionFiles(token, detail, selectedFiles);
      if (!response.success) {
        setError(response.error || 'Die Dateien konnten nicht hochgeladen werden.');
      } else {
        setUploadStatuses(response.files || []);
        setSelectedFiles([]);
        if (inputRef.current) inputRef.current.value = '';
        await onRefresh();
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
      URL.revokeObjectURL(objectUrl);
    } catch {
      setError('Die Datei konnte nicht heruntergeladen werden.');
    } finally {
      setDownloading(null);
    }
  };

  const removeFile = async () => {
    if (!deleteTarget || !password || busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await coursesAPI.deleteSubmissionFile(token, detail, deleteTarget, password);
      if (!response.success) {
        setError(response.message || response.error || 'Die Datei konnte nicht gelöscht werden.');
      } else {
        setDeleteTarget(null);
        setPassword('');
        await onRefresh();
      }
    } catch {
      setError('Die Datei konnte nicht gelöscht werden.');
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
            <h1 className="mt-1 break-words text-3xl font-bold text-surface-900 dark:text-surface-100">{detail.title}</h1>
          </div>
        </div>
        <button type="button" onClick={() => void onRefresh()} className="btn btn-secondary inline-flex items-center gap-2">
          <ArrowPathIcon className="h-4 w-4" /> Aktualisieren
        </button>
      </div>

      {(error || refreshError) && <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200"><ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />{error || refreshError}</div>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,.7fr)]">
        <section className="card overflow-hidden p-0">
          <div className="border-b border-surface-200 bg-surface-50 px-5 py-4 dark:border-surface-800 dark:bg-surface-950">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-surface-500">Abgabe</p><h2 className="mt-1 text-xl font-semibold text-surface-900 dark:text-surface-100">Deine Dateien</h2></div>
              <SubmissionStatus status={detail.status} />
            </div>
          </div>
          <div className="space-y-3 p-5">
            {detail.own_files.length === 0 && <div className="rounded-xl border border-dashed border-surface-300 px-4 py-6 text-center text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">Du hast noch keine Datei abgegeben.</div>}
            {detail.own_files.map(file => (
              <FileRow
                key={file.index}
                name={file.name}
                meta={file.time || file.comment}
                action={<div className="flex shrink-0 items-center gap-1"><button type="button" className="rounded-lg p-2 text-surface-500 hover:bg-surface-100 hover:text-primary-700 dark:hover:bg-surface-800 dark:hover:text-primary-300" onClick={() => void download(file.download_ref, file.name)} title="Datei herunterladen"><ArrowDownTrayIcon className={clsx('h-4 w-4', downloading === file.download_ref && 'animate-bounce')} /></button>{detail.can_delete && <button type="button" className="rounded-lg p-2 text-surface-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 dark:hover:text-red-300" onClick={() => setDeleteTarget(file.index)} title="Datei löschen"><TrashIcon className="h-4 w-4" /></button>}</div>}
              />
            ))}

            {uploadAllowed ? (
              <div className="mt-5 rounded-2xl border border-primary-200 bg-primary-50/60 p-4 dark:border-primary-900/70 dark:bg-primary-950/20">
                <input ref={inputRef} type="file" className="sr-only" multiple={multipleFilesAllowed} accept={accept} onChange={chooseFiles} />
                <button type="button" onClick={() => inputRef.current?.click()} className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-primary-300 px-4 py-7 text-center text-primary-800 transition-colors hover:bg-primary-100/70 dark:border-primary-800 dark:text-primary-200 dark:hover:bg-primary-950/50">
                  <DocumentArrowUpIcon className="h-8 w-8" />
                  <span className="mt-2 font-semibold">Dateien auswählen</span>
                  <span className="mt-1 text-xs text-primary-700/80 dark:text-primary-300/80">{detail.allowed_file_types.join(', ') || 'Erlaubte Dateitypen ansehen'} · {multipleFilesAllowed ? 'Mehrere Dateien möglich' : 'Maximal eine Datei'}</span>
                </button>
                {selectedFiles.length > 0 && <div className="mt-3 space-y-2">{selectedFiles.map(file => <FileRow key={`${file.name}-${file.lastModified}`} name={file.name} meta={formatBytes(file.size)} action={<button type="button" onClick={() => { setSelectedFiles(current => current.filter(item => item !== file)); if (inputRef.current) inputRef.current.value = ''; }} className="rounded-lg p-2 text-surface-500 hover:bg-surface-200 dark:hover:bg-surface-800" aria-label={`${file.name} entfernen`}><XMarkIcon className="h-4 w-4" /></button>} />)}</div>}
                <button type="button" onClick={() => void upload()} disabled={!selectedFiles.length || busy} className="btn btn-primary mt-3 w-full disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Wird hochgeladen …' : 'Hochladen'}</button>
              </div>
            ) : (
              <div className="mt-5 flex items-start gap-2 rounded-xl bg-surface-100 px-4 py-3 text-sm text-surface-600 dark:bg-surface-800 dark:text-surface-300"><InformationCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />{attemptClosed ? 'Diese Abgabe erlaubt keine weiteren Versuche.' : detail.status === 'closed' ? 'Die Abgabe ist geschlossen.' : 'Das Hochladen ist derzeit nicht möglich.'}</div>
            )}
            {uploadStatuses.length > 0 && <UploadResults statuses={uploadStatuses} />}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="card border-l-4 border-l-primary-500">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-surface-500">Zeitfenster</p>
            <dl className="mt-4 space-y-3 text-sm"><div><dt className="text-surface-500">Start</dt><dd className="font-medium text-surface-900 dark:text-surface-100">{detail.start || 'Nicht angegeben'}</dd></div><div><dt className="text-surface-500">Frist</dt><dd className="font-medium text-surface-900 dark:text-surface-100">{detail.deadline || 'Nicht angegeben'}</dd></div><div><dt className="text-surface-500">Automatische Löschung</dt><dd className="font-medium text-surface-900 dark:text-surface-100">{detail.automatic_deletion || 'Nicht angegeben'}</dd></div></dl>
          </section>
          <section className="card"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-surface-500">Regeln</p><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-surface-500">Dateitypen</dt><dd className="font-medium text-surface-900 dark:text-surface-100">{detail.allowed_file_types.join(', ') || 'Portal entscheidet'}</dd></div><div><dt className="text-surface-500">Maximale Größe</dt><dd className="font-medium text-surface-900 dark:text-surface-100">{detail.max_file_size || 'Portal entscheidet'}</dd></div><div><dt className="text-surface-500">Mehrere Dateien</dt><dd className="font-medium text-surface-900 dark:text-surface-100">{detail.allows_multiple_files === false ? 'Nicht erlaubt' : 'Erlaubt'}</dd></div><div><dt className="text-surface-500">Weitere Versuche</dt><dd className="font-medium text-surface-900 dark:text-surface-100">{detail.allows_multiple_attempts === false ? 'Nicht erlaubt' : 'Erlaubt'}</dd></div></dl>{detail.additional_text && <p className="mt-4 rounded-lg bg-primary-50 px-3 py-2 text-sm text-primary-900 dark:bg-primary-950/40 dark:text-primary-100">{detail.additional_text}</p>}</section>
          {detail.public_files.length > 0 && <section className="card"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-surface-500">Weitere Dateien</p><div className="mt-3 space-y-2">{detail.public_files.map(file => <FileRow key={file.index} name={file.name} meta={file.person} action={<button type="button" onClick={() => void download(file.download_ref, file.name)} className="rounded-lg p-2 text-surface-500 hover:bg-surface-100 hover:text-primary-700 dark:hover:bg-surface-800 dark:hover:text-primary-300" title="Datei herunterladen"><ArrowDownTrayIcon className="h-4 w-4" /></button>} />)}</div></section>}
        </aside>
      </div>

      {deleteTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/60 p-4 backdrop-blur-sm" role="presentation"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-soft-lg dark:bg-surface-900" role="dialog" aria-modal="true" aria-labelledby="delete-submission-file-title"><h2 id="delete-submission-file-title" className="text-lg font-semibold text-surface-900 dark:text-surface-100">Datei löschen?</h2><p className="mt-2 text-sm text-surface-600 dark:text-surface-400">Das Schulportal verlangt dein Passwort, um diese Datei endgültig zu löschen.</p><label className="mt-5 block text-sm font-medium text-surface-700 dark:text-surface-300">Passwort<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoFocus className="input mt-1 w-full" autoComplete="current-password" /></label><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" className="btn btn-secondary" onClick={() => { setDeleteTarget(null); setPassword(''); }}>Abbrechen</button><button type="button" className="btn btn-primary" disabled={!password || busy} onClick={() => void removeFile()}>Endgültig löschen</button></div></div></div>}
    </div>
  );
};

const Submissions: React.FC = () => {
  const { token } = useAuth();
  const basePath = useBasePath();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [detail, setDetail] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const listPath = `${basePath}/courses/submissions`;
  const openSubmission = (submission: Submission) => navigate(`${listPath}/${encodeURIComponent(submission.detail_ref || submission.id)}`);

  const loadList = async (signal?: AbortSignal) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await coursesAPI.getSubmissions(token, signal);
      if (response.success) setSubmissions(response.submissions || []);
      else setError(response.error || 'Die Abgaben konnten nicht geladen werden.');
    } catch (loadError) {
      if (!axios.isCancel(loadError)) setError('Die Abgaben konnten nicht geladen werden.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  const loadDetail = async (detailRef: string, signal?: AbortSignal) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await coursesAPI.getSubmission(token, detailRef, signal);
      if (response.success && response.submission) setDetail(response.submission);
      else setError(response.error || 'Die Abgabe konnte nicht geladen werden.');
    } catch (loadError) {
      if (!axios.isCancel(loadError)) setError('Die Abgabe konnte nicht geladen werden.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    setDetail(null);
    if (id) void loadDetail(id, controller.signal);
    else void loadList(controller.signal);
    return () => controller.abort();
  }, [token, id]);

  const openCount = useMemo(() => submissions.filter(item => item.status === 'open').length, [submissions]);
  const isDetail = Boolean(id);

  if (!token) return <div className="p-6 text-center text-surface-500">Nicht authentifiziert</div>;

  return (
    <div className="p-6">
      {isDetail && detail ? (
        <SubmissionDetailView detail={detail} refreshError={error} token={token} onBack={() => navigate(listPath)} onRefresh={async () => { if (id) await loadDetail(id); }} />
      ) : !isDetail ? (
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary-700 dark:text-primary-300">Mein Unterricht</p><h1 className="mt-1 text-3xl font-bold text-surface-900 dark:text-surface-100">Abgaben</h1><p className="mt-2 text-sm text-surface-600 dark:text-surface-400">Alle Upload-Aufträge, Fristen und deine abgegebenen Dateien an einem Ort.</p></div><button type="button" onClick={() => void loadList()} className="btn btn-secondary inline-flex items-center gap-2"><ArrowPathIcon className="h-4 w-4" /> Aktualisieren</button></div>
          {error && <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200"><ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />{error}</div>}
          {!loading && !error && <div className="grid gap-3 sm:grid-cols-3"><div className="card border-l-4 border-l-primary-500"><p className="text-xs uppercase tracking-[0.14em] text-surface-500">Aufträge</p><p className="mt-1 text-2xl font-bold text-surface-900 dark:text-surface-100">{submissions.length}</p></div><div className="card border-l-4 border-l-emerald-500"><p className="text-xs uppercase tracking-[0.14em] text-surface-500">Offen</p><p className="mt-1 text-2xl font-bold text-surface-900 dark:text-surface-100">{openCount}</p></div><div className="card border-l-4 border-l-surface-300 dark:border-l-surface-700"><p className="text-xs uppercase tracking-[0.14em] text-surface-500">Abgegeben</p><p className="mt-1 text-2xl font-bold text-surface-900 dark:text-surface-100">{submissions.filter(item => (item.uploaded_count || 0) > 0).length}</p></div></div>}
          {loading ? <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="card h-36 animate-pulse bg-surface-100 dark:bg-surface-900" />)}</div> : submissions.length === 0 ? !error && <div className="card py-14 text-center"><DocumentArrowUpIcon className="mx-auto h-12 w-12 text-surface-400" /><h2 className="mt-3 text-lg font-semibold text-surface-900 dark:text-surface-100">Keine Abgaben</h2><p className="mx-auto mt-1 max-w-md text-sm text-surface-500 dark:text-surface-400">Sobald dir ein Upload-Auftrag zugewiesen wurde, erscheint er hier.</p></div> : <div className="space-y-3">{submissions.map(submission => <SubmissionCard key={submission.id} submission={submission} onOpen={() => openSubmission(submission)} />)}</div>}
        </div>
      ) : loading ? (
        <div className="mx-auto max-w-5xl space-y-4"><div className="h-10 w-2/3 animate-pulse rounded bg-surface-200 dark:bg-surface-800" /><div className="card h-96 animate-pulse bg-surface-100 dark:bg-surface-900" /></div>
      ) : (
        <div className="mx-auto max-w-5xl"><div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200"><ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />{error || 'Die Abgabe konnte nicht geladen werden.'}</div><button type="button" className="btn btn-secondary mt-4" onClick={() => navigate(listPath)}>Zurück zu den Abgaben</button></div>
      )}
    </div>
  );
};

export default Submissions;
