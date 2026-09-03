import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { wahlenAPI } from '../../services/api';
import type {
  WahlenBlock,
  WahlenControl,
  WahlenElection,
  WahlenField,
  WahlenFormResponse,
  WahlenSelection,
  WahlenSubmission,
} from '../../types';
import SEO from '../seo/SEO';

type SelectionMap = Record<string, WahlenSelection>;

const isChecked = (value: WahlenSelection | undefined): boolean => (
  value === true || (typeof value === 'object' && value !== null)
);

const teacherValue = (value: WahlenSelection | undefined): string => (
  typeof value === 'object' && value !== null ? value.teacher || '' : ''
);

const errorMessage = (error: unknown, fallback: string): string => {
  if (axios.isCancel(error)) return '';
  const detail = axios.isAxiosError(error) ? error.response?.data?.detail : undefined;
  if (Array.isArray(detail)) return detail.join(' ');
  if (typeof detail === 'string') return detail;
  return error instanceof Error ? error.message : fallback;
};

const optionLabel = (control: WahlenControl, value: string): string => (
  control.options?.find(option => option.value === value)?.label || value
);

const selectedValues = (blocks: WahlenBlock[], selections: SelectionMap): string[] => (
  blocks.flatMap(block => block.controls)
    .filter(control => control.kind === 'select')
    .map(control => selections[control.id])
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
);

const excludedByFirstChoice = (
  blocks: WahlenBlock[],
  blockName: string,
  controlName: string,
  selections: SelectionMap,
): boolean => blocks
  .flatMap(block => block.controls)
  .filter(control => control.kind === 'select' && control.not_blocks?.includes(blockName))
  .some(control => {
    const value = selections[control.id];
    const option = control.options?.find(candidate => candidate.value === value);
    return value === controlName || option?.course === controlName || Boolean(option?.excludes?.includes(controlName));
  });

const Wahlen: React.FC = () => {
  const { token } = useAuth();
  const [elections, setElections] = useState<WahlenElection[]>([]);
  const [selectedElectionId, setSelectedElectionId] = useState('');
  const [form, setForm] = useState<WahlenFormResponse | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [selections, setSelections] = useState<SelectionMap>({});
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    wahlenAPI.getElections(token, controller.signal)
      .then(response => {
        if (!response.success) throw new Error(response.error || 'Wahlen konnten nicht geladen werden.');
        setElections(response.elections || []);
        setSelectedElectionId(current => current || response.elections?.[0]?.id || '');
      })
      .catch(loadError => {
        if (!controller.signal.aborted) setError(errorMessage(loadError, 'Wahlen konnten nicht geladen werden.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [token]);

  useEffect(() => {
    if (!token || !selectedElectionId) return;
    const controller = new AbortController();
    setFormLoading(true);
    setError('');
    setForm(null);
    setFields({});
    setSelections({});
    setReviewOpen(false);
    setConfirmChecked(false);
    setSubmitted(false);
    wahlenAPI.getForm(token, selectedElectionId, controller.signal)
      .then(response => {
        if (!response.success) throw new Error(response.error || 'Das Wahlformular konnte nicht geladen werden.');
        setForm(response);
      })
      .catch(loadError => {
        if (!controller.signal.aborted) setError(errorMessage(loadError, 'Das Wahlformular konnte nicht geladen werden.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setFormLoading(false);
      });
    return () => controller.abort();
  }, [token, selectedElectionId]);

  const validationErrors = useMemo(() => {
    if (!form) return [];
    const errors: string[] = [];
    form.personal_fields.forEach(field => {
      if (!fields[field.id]?.trim()) errors.push(`${field.label || field.id} fehlt.`);
    });
    const chosen = selectedValues(form.blocks, selections);
    form.blocks.forEach(block => {
      block.controls.filter(control => control.kind === 'select' && control.required).forEach(control => {
        if (!selections[control.id]) errors.push(`Im Block „${block.name}“ fehlt eine Auswahl.`);
      });
      block.groups.forEach(group => {
        const count = group.controls.filter(control => isChecked(selections[control.id])).length;
        if (count < group.min) errors.push(`In „${group.name}“ sind mindestens ${group.min} Auswahl(en) nötig.`);
        if (group.max >= 0 && count > group.max) errors.push(`In „${group.name}“ sind höchstens ${group.max} Auswahl(en) erlaubt.`);
      });
      const groupedIds = new Set(block.groups.flatMap(group => group.controls.map(control => control.id)));
      const ungrouped = block.controls.filter(control => control.kind === 'checkbox' && !groupedIds.has(control.id));
      if (ungrouped.length > 0) {
        const count = ungrouped.filter(control => isChecked(selections[control.id])).length;
        if (count < block.min) errors.push(`Im Block „${block.name}“ sind mindestens ${block.min} Auswahl(en) nötig.`);
        if (block.max >= 0 && count > block.max) errors.push(`Im Block „${block.name}“ sind höchstens ${block.max} Auswahl(en) erlaubt.`);
      }
      block.groups.flatMap(group => group.controls).filter(control => isChecked(selections[control.id]))
        .filter(control => control.name && chosen.includes(control.name))
        .forEach(control => errors.push(`„${control.name}“ darf nicht doppelt gewählt werden.`));
    });
    return [...new Set(errors)];
  }, [fields, form, selections]);

  const selectedElection = elections.find(election => election.id === selectedElectionId);

  const updateField = (field: WahlenField, value: string) => {
    setFields(current => ({ ...current, [field.id]: value }));
  };

  const updateSelection = (control: WahlenControl, checked: boolean) => {
    setSelections(current => ({
      ...current,
      [control.id]: checked ? true : false,
    }));
  };

  const updateTeacher = (control: WahlenControl, teacher: string) => {
    setSelections(current => ({
      ...current,
      [control.id]: { teacher },
    }));
  };

  const updateSelect = (control: WahlenControl, value: string) => {
    setSelections(current => {
      const next = { ...current, [control.id]: value };
      form?.blocks.forEach(block => {
        block.groups.flatMap(group => group.controls).forEach(candidate => {
          if (candidate.kind === 'checkbox' && candidate.name && excludedByFirstChoice(form.blocks, block.name, candidate.name, next)) {
            next[candidate.id] = false;
          }
        });
      });
      return next;
    });
  };

  const openReview = (event: FormEvent) => {
    event.preventDefault();
    if (validationErrors.length > 0) {
      setError('Bitte vervollständige zuerst die markierten Angaben.');
      return;
    }
    setError('');
    setConfirmChecked(false);
    setReviewOpen(true);
  };

  const submit = async () => {
    if (!token || !selectedElectionId || !confirmChecked || submitting) return;
    setSubmitting(true);
    setError('');
    const payload: WahlenSubmission = { fields, selections, confirm: true };
    try {
      const response = await wahlenAPI.submit(token, selectedElectionId, payload);
      if (!response.success) throw new Error(response.error || 'Die Angaben konnten nicht gespeichert werden.');
      setReviewOpen(false);
      setSubmitted(true);
    } catch (submitError) {
      setError(errorMessage(submitError, 'Die Angaben konnten nicht gespeichert werden.'));
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: WahlenField) => (
    <label key={field.id} className="block">
      <span className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
        {field.label || field.id}
      </span>
      {field.kind === 'select' ? (
        <select className="input" value={fields[field.id] || ''} onChange={event => updateField(field, event.target.value)}>
          <option value="">Bitte auswählen</option>
          {(field.options || []).map(option => <option key={`${field.id}-${option.value}`} value={option.value}>{option.label}</option>)}
        </select>
      ) : (
        <input className="input" type={field.kind === 'email' ? 'email' : 'text'} value={fields[field.id] || ''} onChange={event => updateField(field, event.target.value)} />
      )}
    </label>
  );

  const renderControl = (control: WahlenControl, block: WahlenBlock) => {
    if (control.kind === 'select') {
      return (
        <label key={control.id} className="block max-w-2xl">
          <span className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">{control.label || 'Auswahl'}</span>
          <select className="input" value={typeof selections[control.id] === 'string' ? selections[control.id] as string : ''} onChange={event => updateSelect(control, event.target.value)}>
            <option value="">Bitte auswählen</option>
            {(control.options || []).map(option => <option key={`${control.id}-${option.value}`} value={option.value} disabled={option.disabled}>{option.label}</option>)}
          </select>
          {control.required && <span className="mt-1 block text-xs text-surface-500">Pflichtauswahl</span>}
        </label>
      );
    }

    const excluded = Boolean(control.name && excludedByFirstChoice(form?.blocks || [], block.name, control.name, selections));
    const value = selections[control.id];
    return (
      <div key={control.id} className={`rounded-2xl border p-3 transition-colors ${excluded ? 'border-surface-200 bg-surface-50 opacity-60 dark:border-surface-800 dark:bg-surface-950' : 'border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900'}`}>
        <label className="flex cursor-pointer items-start gap-3">
          <input className="mt-1 h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500" type="checkbox" checked={isChecked(value)} disabled={excluded} onChange={event => updateSelection(control, event.target.checked)} />
          <span className="min-w-0 flex-1 text-sm font-medium text-surface-800 dark:text-surface-200">{control.name || control.label}</span>
        </label>
        {isChecked(value) && (control.teacher_options || []).length > 0 && (
          <select className="input mt-3 text-sm" value={teacherValue(value)} onChange={event => updateTeacher(control, event.target.value)}>
            <option value="">Lehrkraft optional auswählen</option>
            {(control.teacher_options || []).map(teacher => <option key={teacher} value={teacher}>{teacher}</option>)}
          </select>
        )}
      </div>
    );
  };

  if (!token) return null;

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <SEO title="Wahlen" description="Teilnahme an deinen verfügbaren Wahlen im Schulportal Hessen." path="/wahlen" noindex />

      <div className="relative mb-8 overflow-hidden rounded-3xl bg-[#173b67] px-5 py-7 text-white shadow-soft-lg sm:px-8 sm:py-9">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border-[32px] border-white/10" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-200"><ClipboardDocumentCheckIcon className="h-4 w-4" />Deine Wahl</div>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Entscheidungen, die zu dir passen.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">Fülle deine Wahl in Ruhe aus. Deine Angaben werden erst nach einer gemeinsamen Prüfung an das Schulportal übermittelt.</p>
        </div>
      </div>

      {error && <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200"><ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />{error}</div>}

      {loading ? <LoadingState /> : elections.length === 0 ? (
        <div className="card py-14 text-center"><ClipboardDocumentCheckIcon className="mx-auto h-12 w-12 text-surface-300 dark:text-surface-700" /><h2 className="mt-4 text-lg font-semibold">Keine offenen Wahlen</h2><p className="mt-1 text-sm text-surface-500">Für dein Konto gibt es derzeit keine aktive Wahl.</p></div>
      ) : (
        <>
          {elections.length > 1 && <div className="mb-6 max-w-xl"><label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Wahl auswählen<select className="input mt-2" value={selectedElectionId} onChange={event => setSelectedElectionId(event.target.value)}>{elections.map(election => <option key={election.id} value={election.id}>{election.title}</option>)}</select></label></div>}
          <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full bg-primary-50 px-3 py-1.5 font-medium text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">{selectedElection?.title || 'Wahl'}</span>
            {selectedElection?.participation_text && <span className="text-surface-500 dark:text-surface-400">{selectedElection.participation_text}</span>}
            {selectedElection?.info_url && <a className="inline-flex items-center gap-1 text-primary-600 hover:underline dark:text-primary-400" href={selectedElection.info_url} target="_blank" rel="noreferrer">Infos <LinkIcon className="h-3.5 w-3.5" /></a>}
          </div>

          {formLoading ? <LoadingState /> : submitted ? (
            <div className="card border-emerald-200 py-14 text-center dark:border-emerald-900"><CheckCircleIcon className="mx-auto h-14 w-14 text-emerald-500" /><h2 className="mt-4 text-xl font-semibold">Angaben übermittelt</h2><p className="mx-auto mt-2 max-w-md text-sm text-surface-500">Das Schulportal hat die Wahl entgegengenommen. Eine erneute Änderung ist dort nicht vorgesehen.</p></div>
          ) : form && (
            <form onSubmit={openReview} className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="space-y-6">
                  {form.blocks.filter(block => block.max === -1).map(block => (
                    <section key={block.name} className="card !p-5 sm:!p-6">
                      <SectionHeading block={block} eyebrow="Persönliche Angaben" />
                      <div className="mt-5 grid gap-4 sm:grid-cols-2">{form.personal_fields.map(renderField)}</div>
                    </section>
                  ))}
                  {form.blocks.filter(block => block.max !== -1).map(block => (
                    <section key={block.name} className="card !p-5 sm:!p-6">
                      <SectionHeading block={block} />
                      <div className="mt-5 space-y-5">
                        {block.controls.filter(control => control.kind === 'select').map(control => renderControl(control, block))}
                        {block.groups.map(group => {
                          const count = group.controls.filter(control => isChecked(selections[control.id])).length;
                          return <div key={group.name}><div className="mb-3 flex items-baseline justify-between gap-3"><h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200">{group.name}</h3><span className="text-xs text-surface-500">{count} / {group.max}</span></div><div className="grid gap-3 sm:grid-cols-2">{group.controls.map(control => renderControl(control, block))}</div></div>;
                        })}
                        {(() => {
                          const groupedIds = new Set(block.groups.flatMap(group => group.controls.map(control => control.id)));
                          const ungrouped = block.controls.filter(control => control.kind === 'checkbox' && !groupedIds.has(control.id));
                          return ungrouped.length > 0 ? <div className="grid gap-3 sm:grid-cols-2">{ungrouped.map(control => renderControl(control, block))}</div> : null;
                        })()}
                      </div>
                    </section>
                  ))}
                </div>
                <aside className="hidden lg:block"><div className="sticky top-6 rounded-3xl border border-surface-200 bg-surface-50 p-5 dark:border-surface-800 dark:bg-surface-900/70"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-400">Ablauf</p><ol className="mt-5 space-y-5">{['Ausfüllen', 'Prüfen', 'Übermitteln'].map((step, index) => <li key={step} className="flex gap-3"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? 'bg-primary-600 text-white' : 'bg-surface-200 text-surface-500 dark:bg-surface-800'}`}>{index + 1}</span><div><p className="text-sm font-medium text-surface-800 dark:text-surface-200">{step}</p><p className="mt-0.5 text-xs leading-5 text-surface-500">{index === 0 ? 'Deine Angaben und Wünsche' : index === 1 ? 'Alles gemeinsam kontrollieren' : 'Einmalig ans Schulportal senden'}</p></div></li>)}</ol></div></aside>
              </div>
              <div className="flex flex-col items-stretch justify-between gap-4 rounded-3xl border border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-900 sm:flex-row sm:items-center sm:p-5"><div className="text-sm text-surface-500 dark:text-surface-400">{validationErrors.length > 0 ? `${validationErrors.length} Angaben fehlen noch.` : 'Alles ausgefüllt? Dann prüfe deine Angaben im nächsten Schritt.'}</div><button type="submit" className="btn btn-primary inline-flex justify-center gap-2" disabled={validationErrors.length > 0}><span>Angaben prüfen</span><ChevronRightIcon className="h-4 w-4" /></button></div>
            </form>
          )}
        </>
      )}

      {reviewOpen && form && <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/60 p-4 backdrop-blur-sm"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-soft-lg dark:bg-surface-900 sm:p-7" role="dialog" aria-modal="true" aria-labelledby="wahlen-review-title"><div className="flex items-start gap-4"><div className="rounded-2xl bg-amber-100 p-3 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"><ExclamationTriangleIcon className="h-6 w-6" /></div><div><h2 id="wahlen-review-title" className="text-xl font-semibold">Letzte Prüfung</h2><p className="mt-1 text-sm leading-5 text-surface-500">Das Schulportal behandelt diese Wahl als einmalige Übermittlung. Prüfe jede Angabe sorgfältig.</p></div></div><div className="mt-6 space-y-4"><div className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-950"><h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-surface-400">Persönliche Angaben</h3><dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">{form.personal_fields.map(field => <React.Fragment key={field.id}><dt className="text-surface-500">{field.label}</dt><dd className="font-medium text-surface-800 dark:text-surface-200">{fields[field.id]}</dd></React.Fragment>)}</dl></div>{form.blocks.filter(block => block.max !== -1).map(block => <div key={block.name} className="rounded-2xl border border-surface-200 p-4 dark:border-surface-800"><h3 className="font-semibold">{block.name}</h3><ul className="mt-3 space-y-2 text-sm">{block.controls.filter(control => control.kind === 'select' && selections[control.id]).map(control => <li key={control.id}><span className="text-surface-500">{control.label}: </span>{optionLabel(control, String(selections[control.id]))}</li>)}{block.groups.flatMap(group => group.controls).filter(control => isChecked(selections[control.id])).map(control => <li key={control.id}>{control.name || control.label}{teacherValue(selections[control.id]) ? <span className="text-surface-500"> · {teacherValue(selections[control.id])}</span> : null}</li>)}</ul></div>)}</div><label className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100"><input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500" checked={confirmChecked} onChange={event => setConfirmChecked(event.target.checked)} /><span>Ich habe alle Angaben geprüft und möchte diese Wahl jetzt einmalig an das Schulportal übermitteln.</span></label><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" className="btn btn-secondary" onClick={() => setReviewOpen(false)} disabled={submitting}>Zurück zum Formular</button><button type="button" className="btn btn-primary" onClick={submit} disabled={!confirmChecked || submitting}>{submitting ? 'Wird übermittelt …' : 'Jetzt einmalig übermitteln'}</button></div></div></div>}
    </div>
  );
};

const SectionHeading: React.FC<{ block: WahlenBlock; eyebrow?: string }> = ({ block, eyebrow }) => (
  <div><div className="flex items-center justify-between gap-3"><div>{eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary-600 dark:text-primary-400">{eyebrow}</p>}<h2 className="text-xl font-semibold tracking-tight text-surface-900 dark:text-surface-100">{block.name}</h2></div>{block.max >= 0 && <span className="rounded-full bg-surface-100 px-3 py-1 text-xs font-medium text-surface-500 dark:bg-surface-800">{block.min === block.max ? `genau ${block.min}` : `${block.min}–${block.max}`} Auswahl(en)</span>}</div>{block.description && <p className="mt-2 max-w-2xl text-sm leading-6 text-surface-500 dark:text-surface-400">{block.description}</p>}</div>
);

const LoadingState: React.FC = () => <div className="space-y-4"><div className="skeleton h-28 w-full rounded-3xl" /><div className="skeleton h-64 w-full rounded-3xl" /><div className="flex items-center justify-center gap-2 py-3 text-sm text-surface-500"><ArrowPathIcon className="h-4 w-4 animate-spin" />Wird geladen …</div></div>;

export default Wahlen;
