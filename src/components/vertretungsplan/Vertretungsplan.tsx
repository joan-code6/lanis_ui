import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { vertretungsplanAPI } from '../../services/api';
import { VertretungsplanDay, VertretungsplanEntry, VertretungsplanOptionsResponse, VertretungsplanResponse } from '../../types';
import SEO from '../seo/SEO';

function parsePortalDate(value: string): Date | null {
  const parts = value.split('.');
  if (parts.length === 3) {
    const [day, month, year] = parts.map(Number);
    const parsed = new Date(year, month - 1, day, 12);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDay(value: string): string {
  const date = parsePortalDate(value);
  if (!date) return value;
  return date.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}

function formatLastUpdated(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('de-DE', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function cleanText(value: unknown): string {
  return String(value ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+\n/g, '\n')
    .trim();
}

function firstValue(...values: unknown[]): string | null {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return null;
}

function changedValue(current: unknown, previous: unknown): string | null {
  const currentText = firstValue(current);
  const previousText = firstValue(previous);
  if (currentText && previousText && currentText.toLowerCase() !== previousText.toLowerCase()) {
    return `${currentText} (statt ${previousText})`;
  }
  return currentText || previousText;
}

function classValue(entry: VertretungsplanEntry): string | null {
  return changedValue(entry.klasse, entry.klasse_alt);
}

function normaliseClass(value: unknown): string {
  return cleanText(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('de-DE')
    .replace(/[^a-z0-9]+/g, '');
}

function classParts(value: unknown): string[] {
  const text = cleanText(value);
  return [...new Set(text.split(/[,;/|()]+/).flatMap(part => {
    const trimmedPart = part.trim();
    if (!trimmedPart) return [];
    const tokens = trimmedPart.split(/\s+/).filter(Boolean);
    if (tokens.length <= 1) return [trimmedPart];

    const normalizedTokens = tokens.map(normaliseClass);
    const hasStandaloneNumber = normalizedTokens.some(token => /^\d+$/.test(token));
    const allStandaloneNumbers = normalizedTokens.every(token => /^\d+$/.test(token));
    return allStandaloneNumbers || !hasStandaloneNumber ? tokens : [trimmedPart];
  }))];
}

function classVariants(value: unknown): string[] {
  const text = cleanText(value);
  const normalizedText = normaliseClass(text);
  const separatedValues = classParts(text).map(normaliseClass);
  return [...new Set([normalizedText, ...separatedValues])].filter(Boolean);
}

function fuzzyClassMatches(value: unknown, target: unknown): boolean {
  const targetVariants = classVariants(target);
  if (targetVariants.length === 0) return false;
  return classVariants(value).some(candidate => targetVariants.includes(candidate));
}

function matchingClassOption(target: string, options: string[]): string {
  if (!target) return '';
  return options.find(option => normaliseClass(option) === normaliseClass(target))
    || options.find(option => fuzzyClassMatches(option, target))
    || '';
}

const PlanField: React.FC<{ label: string; value: string | null }> = ({ label, value }) => {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-surface-400 dark:text-surface-500">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-surface-800 dark:text-surface-200">{value}</dd>
    </div>
  );
};

const Vertretungsplan: React.FC = () => {
  const { token } = useAuth();
  const { preferences } = usePreferences();
  const [plan, setPlan] = useState<VertretungsplanResponse | null>(null);
  const [options, setOptions] = useState<VertretungsplanOptionsResponse>({
    success: false,
    own_class: '',
    available_classes: [],
  });
  const [activeDay, setActiveDay] = useState('');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setOptionsLoading(true);
    setError('');

    const load = async () => {
      const optionsPromise = vertretungsplanAPI.getOptions(token, controller.signal)
        .then(optionsResponse => {
          if (!optionsResponse.success) {
            throw new Error(optionsResponse.error || 'Die Klassen konnten nicht geladen werden.');
          }
          return optionsResponse;
        })
        .catch(optionsError => {
          if (!axios.isCancel(optionsError)) {
            console.warn('Failed to load Vertretungsplan class options:', optionsError);
          }
          return null;
        });
      const response = await vertretungsplanAPI.getPlan(token, controller.signal);
      if (controller.signal.aborted) return;
      if (!response.success) {
        throw new Error(response.error || 'Der Vertretungsplan konnte nicht geladen werden.');
      }
      const days = Array.isArray(response.days) ? response.days : [];
      setPlan({ ...response, days, count: response.count || 0 });
      setActiveDay(current => days.some(day => day.date === current) ? current : (days[0]?.date || ''));
      // Class metadata is optional; show the plan as soon as its required request is ready.
      setLoading(false);

      const optionsResponse = await optionsPromise;
      if (controller.signal.aborted) return;
      if (optionsResponse) setOptions(optionsResponse);
      setOptionsLoading(false);
    };

    load()
      .catch(err => {
        if (axios.isCancel(err)) return;
        setPlan(null);
        setError(err instanceof Error ? err.message : 'Der Vertretungsplan konnte nicht geladen werden.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [token, reloadKey]);

  const days = plan?.days || [];
  const activeDayData = days.find(day => day.date === activeDay) || days[0];
  const classOptions = useMemo(() => {
    const values = new Set<string>();
    const addParts = (value: unknown) => {
      classParts(value).forEach(part => values.add(part));
    };

    options.available_classes.forEach(addParts);
    addParts(options.own_class);
    for (const day of days) {
      for (const entry of day.substitutions || []) {
        addParts(entry.klasse);
        addParts(entry.klasse_alt);
      }
    }
    return [...values].sort((left, right) => left.localeCompare(right, 'de'));
  }, [days, options.available_classes, options.own_class]);

  const configuredClass = preferences.vertretungsplan.class_override.trim();
  const profileClass = options.own_class.trim();
  const preferredClass = configuredClass || profileClass;
  const defaultClass = useMemo(
    () => matchingClassOption(preferredClass, classOptions),
    [classOptions, preferredClass],
  ) || 'all';
  const activeClass = selectedClass ?? defaultClass;
  const selectionOptions = useMemo(() => {
    return [...classOptions].sort((left, right) => left.localeCompare(right, 'de'));
  }, [classOptions]);

  useEffect(() => {
    if (
      !loading
      && !optionsLoading
      && selectedClass
      && selectedClass !== 'all'
      && !classOptions.some(option => normaliseClass(option) === normaliseClass(selectedClass))
    ) {
      setSelectedClass('all');
    }
  }, [classOptions, loading, optionsLoading, selectedClass]);

  const visibleEntries = (activeDayData?.substitutions || []).filter(entry => {
    if (activeClass === 'all') return true;
    return [entry.klasse, entry.klasse_alt].some(value => fuzzyClassMatches(value, activeClass));
  });

  if (!token) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100">Nicht authentifiziert</h3>
          <p className="text-surface-500">Bitte melden Sie sich an, um den Vertretungsplan zu sehen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <SEO
        title="Vertretungsplan"
        description="Dein nativer Vertretungsplan aus dem Schulportal Hessen."
        noindex
      />
      <div className="mx-auto max-w-7xl">
        <header className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-white sm:text-3xl">Vertretungsplan</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-surface-500 dark:text-surface-400">
              <span>Direkt aus dem Schulportal Hessen</span>
              {plan?.last_updated && (
                <span className="whitespace-nowrap text-xs text-surface-400 dark:text-surface-500">
                  Stand {formatLastUpdated(plan.last_updated)} Uhr
                </span>
              )}
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
          <div className="card mb-6 border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            <h2 className="font-semibold">Vertretungsplan nicht verfügbar</h2>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="card flex min-h-64 items-center justify-center">
            <div className="text-center text-surface-500">
              <ArrowPathIcon className="mx-auto mb-3 h-7 w-7 animate-spin text-primary-500" />
              Vertretungsplan wird geladen …
            </div>
          </div>
        ) : !error && plan?.available === false ? (
          <div className="card flex min-h-64 flex-col items-center justify-center text-center">
            <InformationCircleIcon className="mb-3 h-10 w-10 text-surface-300" />
            <h2 className="font-semibold text-surface-900 dark:text-white">Native Vertretungsplan nicht verfügbar</h2>
            <p className="mt-1 max-w-md text-sm text-surface-500 dark:text-surface-400">
              Dieses Schulportal-Konto stellt keinen nativen Vertretungsplan bereit.
            </p>
          </div>
        ) : !error && plan ? (
          <>
            {days.length > 0 && (
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1" aria-label="Tage im Vertretungsplan">
                {days.map(day => {
                  const isActive = day.date === activeDayData?.date;
                  return (
                    <button
                      key={day.date}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setActiveDay(day.date)}
                      className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${isActive
                        ? 'border-primary-500 bg-primary-50 font-semibold text-primary-700 dark:border-primary-400 dark:bg-primary-950 dark:text-primary-300'
                        : 'border-surface-200 bg-white text-surface-600 hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:bg-surface-800'}`}
                    >
                      <CalendarDaysIcon className="h-4 w-4" />
                      {formatDay(day.date)}
                      <span className="rounded-full bg-surface-100 px-1.5 py-0.5 text-xs text-surface-500 dark:bg-surface-800 dark:text-surface-400">
                        {day.substitutions?.length || 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {preferredClass ? (
              <p className="mb-5 text-xs text-surface-500 dark:text-surface-400">
                {configuredClass ? 'Dein gespeicherter Klassenfilter:' : 'Automatisch erkannte Klasse:'}{' '}
                <span className="font-medium text-surface-700 dark:text-surface-300">{defaultClass}</span>
              </p>
            ) : (
              <p className="mb-5 text-xs text-surface-500 dark:text-surface-400">
                Keine Klasse im Schulportal-Profil gefunden. Es werden alle Klassen angezeigt.
              </p>
            )}

            {selectionOptions.length > 0 && (
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <label htmlFor="vertretungsplan-class" className="text-sm font-medium text-surface-600 dark:text-surface-300">
                  Klasse
                </label>
                <select
                  id="vertretungsplan-class"
                  className="input w-auto min-w-36 text-sm"
                  value={activeClass}
                  onChange={event => setSelectedClass(event.target.value)}
                >
                  <option value="all">Alle Klassen</option>
                  {selectionOptions.map(value => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
            )}

            {activeDayData?.infos?.map((info, index) => (
              <div key={`${info.header}-${index}`} className="mb-4 rounded-xl border border-primary-100 bg-primary-50/70 p-4 dark:border-primary-900 dark:bg-primary-950/40">
                <div className="flex items-start gap-2">
                  <InformationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary-600 dark:text-primary-400" />
                  <div className="min-w-0 text-sm text-primary-900 dark:text-primary-100">
                    {info.header && <p className="font-semibold">{cleanText(info.header)}</p>}
                    {info.values.map((value, valueIndex) => (
                      <p key={`${value}-${valueIndex}`} className="mt-1 whitespace-pre-wrap">{cleanText(value)}</p>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {visibleEntries.length === 0 ? (
              <div className="card flex min-h-64 flex-col items-center justify-center text-center">
                <CalendarDaysIcon className="mb-3 h-10 w-10 text-surface-300" />
                <h2 className="font-semibold text-surface-900 dark:text-white">
                  {activeClass === 'all' ? 'Keine Vertretungen' : 'Keine Vertretungen für diese Klasse'}
                </h2>
                <p className="mt-1 max-w-md text-sm text-surface-500 dark:text-surface-400">
                  Für den ausgewählten Tag sind keine Änderungen am Unterricht eingetragen.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleEntries.map((entry, index) => {
                  const note = firstValue(entry.hinweis, entry.hinweis2);
                  const subject = changedValue(entry.fach, entry.fach_alt);
                  const room = changedValue(entry.raum, entry.raum_alt);
                  return (
                    <article
                      key={`${activeDayData?.date || 'day'}-${index}-${entry.stunde || ''}`}
                      className={`card !p-0 overflow-hidden ${entry.hervorgehoben ? 'border-primary-300 ring-2 ring-primary-500/10 dark:border-primary-700' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3 border-b border-surface-100 bg-surface-50 px-4 py-3 dark:border-surface-800 dark:bg-surface-800/50">
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-primary-600 dark:text-primary-400">{firstValue(entry.art) || 'Änderung'}</p>
                          <h2 className="mt-0.5 truncate font-semibold text-surface-900 dark:text-white">{subject || 'Unterricht'}</h2>
                        </div>
                        {firstValue(entry.stunde) && <span className="badge badge-primary shrink-0">{firstValue(entry.stunde)}</span>}
                      </div>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 p-4">
                        <PlanField label="Klasse" value={classValue(entry)} />
                        <PlanField label="Raum" value={room} />
                        <PlanField label="Lehrkraft" value={firstValue(entry.lehrer, entry.lehrerkuerzel)} />
                        <PlanField label="Vertretung" value={firstValue(entry.vertreter, entry.vertreterkuerzel)} />
                        <PlanField label="Lerngruppe" value={firstValue(entry.lerngruppe)} />
                      </dl>
                      {note && (
                        <div className="mx-4 mb-4 rounded-lg border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-100">
                          {note}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default Vertretungsplan;
