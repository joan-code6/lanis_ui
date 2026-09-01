import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AcademicCapIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  Bars3Icon,
  BookOpenIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  CheckIcon,
  CloudArrowUpIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  PaintBrushIcon,
  SparklesIcon,
  Squares2X2Icon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { appsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences, CURRENT_ONBOARDING_VERSION } from '../../contexts/PreferencesContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Module, OnboardingStep, ThemeColor, ThemeMode, TimetableViewMode, UserPreferences, UserPreferencesPatch } from '../../types';
import SEO from '../seo/SEO';
import ModuleIcon from '../dashboard/ModuleIcon';

const steps: Array<{ id: Exclude<OnboardingStep, 'complete'>; label: string }> = [
  { id: 'welcome', label: 'Start' },
  { id: 'appearance', label: 'Aussehen' },
  { id: 'dashboard', label: 'Favoriten' },
  { id: 'timetable', label: 'Stundenplan' },
  { id: 'homework', label: 'Hausaufgaben' },
  { id: 'guide', label: 'Loslegen' },
];

const themeModes: Array<{ id: ThemeMode; label: string; note: string }> = [
  { id: 'system', label: 'Automatisch', note: 'Folgt deinem Gerät' },
  { id: 'light', label: 'Hell', note: 'Klar und freundlich' },
  { id: 'dark', label: 'Dunkel', note: 'Angenehm am Abend' },
  { id: 'oled', label: 'OLED', note: 'Echtes Schwarz' },
];

const themeColors: Array<{ id: ThemeColor; label: string; hex: string }> = [
  { id: 'cyan', label: 'Cyan', hex: '#06b6d4' },
  { id: 'sapphire', label: 'Saphir', hex: '#3b82f6' },
  { id: 'emerald', label: 'Smaragd', hex: '#10b981' },
  { id: 'amethyst', label: 'Amethyst', hex: '#a855f7' },
  { id: 'ruby', label: 'Rubin', hex: '#f43f5e' },
  { id: 'amber', label: 'Bernstein', hex: '#f59e0b' },
];

const recommendedModule = (name: string) => {
  const normalized = name.toLowerCase();
  return ['nachrichten', 'stundenplan', 'mein unterricht', 'kalender']
    .some(candidate => normalized.includes(candidate));
};

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { preferences, updatePreferences, isLoading, syncError } = usePreferences();
  const { setThemeColor, setThemeMode } = useTheme();
  const resumedStep = preferences.onboarding.status === 'in_progress'
    ? steps.findIndex(step => step.id === preferences.onboarding.last_step)
    : 0;
  const [stepIndex, setStepIndex] = useState(resumedStep >= 0 ? resumedStep : 0);
  const [themeMode, setDraftThemeMode] = useState(preferences.appearance.theme_mode);
  const [themeColor, setDraftThemeColor] = useState(preferences.appearance.theme_color);
  const [pinnedModules, setPinnedModules] = useState(preferences.dashboard.pinned_modules);
  const [timetableMode, setTimetableMode] = useState<TimetableViewMode>(preferences.timetable.view_mode);
  const [hideCompletedHomeworkInOverview, setHideCompletedHomeworkInOverview] = useState(
    preferences.homework.hide_completed_in_overview,
  );
  const [modules, setModules] = useState<Module[]>([]);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [localError, setLocalError] = useState('');
  const hydratedRef = useRef(false);
  const originalPreferencesRef = useRef<UserPreferences | null>(null);
  const appearanceToRestoreRef = useRef(preferences.appearance);
  const activeStep = steps[stepIndex];

  useEffect(() => {
    if (isLoading || hydratedRef.current) return;
    hydratedRef.current = true;
    originalPreferencesRef.current = preferences;
    appearanceToRestoreRef.current = preferences.appearance;
    const savedStep = preferences.onboarding.status === 'in_progress'
      ? steps.findIndex(step => step.id === preferences.onboarding.last_step)
      : 0;
    setStepIndex(savedStep >= 0 ? savedStep : 0);
    setDraftThemeMode(preferences.appearance.theme_mode);
    setDraftThemeColor(preferences.appearance.theme_color);
    setPinnedModules(preferences.dashboard.pinned_modules);
    setTimetableMode(preferences.timetable.view_mode);
    setHideCompletedHomeworkInOverview(preferences.homework.hide_completed_in_overview);
  }, [isLoading, preferences]);

  useEffect(() => {
    if (isLoading) return;
    setThemeMode(themeMode);
    setThemeColor(themeColor);
  }, [isLoading, setThemeColor, setThemeMode, themeColor, themeMode]);

  useEffect(() => () => {
    if (!hydratedRef.current) return;
    setThemeMode(appearanceToRestoreRef.current.theme_mode);
    setThemeColor(appearanceToRestoreRef.current.theme_color);
  }, [setThemeColor, setThemeMode]);

  useEffect(() => {
    document.documentElement.classList.add('onboarding-active');
    return () => document.documentElement.classList.remove('onboarding-active');
  }, []);

  useEffect(() => {
    if (!token || isLoading) return;
    const controller = new AbortController();
    appsAPI.getModules(token, controller.signal)
      .then(response => {
        if (!response.success) return;
        setModules(response.modules);
        if (!preferences.dashboard.pinned_modules.length) {
          setPinnedModules(response.modules.filter(module => recommendedModule(module.name)).slice(0, 4).map(module => module.name));
        }
      })
      .catch(error => {
        if (!controller.signal.aborted) console.warn('Onboarding modules could not be loaded:', error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setModulesLoading(false);
      });
    return () => controller.abort();
  }, [isLoading, token]);

  const displayName = user?.vorname || user?.firstname || user?.username || 'du';

  const saveCurrentStep = (nextIndex: number) => {
    setLocalError('');
    const nextStep = steps[nextIndex]?.id || 'complete';
    const patch: UserPreferencesPatch = activeStep.id === 'appearance'
      ? { appearance: { theme_mode: themeMode, theme_color: themeColor } }
      : activeStep.id === 'dashboard'
        ? { dashboard: { pinned_modules: pinnedModules } }
        : activeStep.id === 'timetable'
          ? { timetable: { view_mode: timetableMode } }
          : activeStep.id === 'homework'
            ? { homework: { hide_completed_in_overview: hideCompletedHomeworkInOverview } }
            : {};
    if (activeStep.id === 'appearance') {
      appearanceToRestoreRef.current = { theme_mode: themeMode, theme_color: themeColor };
    }
    void updatePreferences({
      ...patch,
      onboarding: {
        version: CURRENT_ONBOARDING_VERSION,
        status: 'in_progress',
        last_step: nextStep,
      },
    });
    setStepIndex(nextIndex);
  };

  const goBack = () => {
    if (stepIndex === 0) return;
    const previous = stepIndex - 1;
    void updatePreferences({ onboarding: { last_step: steps[previous].id, status: 'in_progress' } });
    setStepIndex(previous);
  };

  const skip = () => {
    const original = originalPreferencesRef.current || preferences;
    appearanceToRestoreRef.current = original.appearance;
    setThemeMode(original.appearance.theme_mode);
    setThemeColor(original.appearance.theme_color);
    void updatePreferences({
      appearance: original.appearance,
      dashboard: original.dashboard,
      timetable: original.timetable,
      homework: original.homework,
      onboarding: { version: CURRENT_ONBOARDING_VERSION, status: 'skipped', last_step: 'complete' },
    });
    navigate('/dashboard', { replace: true });
  };

  const complete = () => {
    appearanceToRestoreRef.current = { theme_mode: themeMode, theme_color: themeColor };
    void updatePreferences({
      appearance: { theme_mode: themeMode, theme_color: themeColor },
      dashboard: { pinned_modules: pinnedModules },
      timetable: { view_mode: timetableMode },
      homework: { hide_completed_in_overview: hideCompletedHomeworkInOverview },
      onboarding: { version: CURRENT_ONBOARDING_VERSION, status: 'completed', last_step: 'complete' },
    });
    navigate('/dashboard', { replace: true });
  };

  const toggleModule = (name: string) => {
    setLocalError('');
    setPinnedModules(current => {
      if (current.includes(name)) return current.filter(item => item !== name);
      if (current.length >= 6) {
        setLocalError('Wähle höchstens sechs Favoriten. Du kannst sie später jederzeit ändern.');
        return current;
      }
      return [...current, name];
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-surface-50 dark:bg-surface-950">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-surface-200 border-t-primary-600 dark:border-surface-800 dark:border-t-primary-400" />
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] w-full max-w-full overflow-x-clip bg-surface-50 text-surface-900 dark:bg-surface-950 dark:text-surface-100">
      <SEO title="Lanis einrichten" description="Passe Lanis an deinen Schulalltag an." path="/onboarding" noindex />
      <div className="onboarding-ambient pointer-events-none fixed inset-0" />
      <main className="relative mx-auto flex min-h-[100dvh] w-full min-w-0 max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/favicon/android-chrome-192x192.png" alt="" className="h-10 w-10 rounded-xl shadow-soft" />
            <div>
              <p className="font-semibold tracking-tight">Lanis</p>
              <p className="text-xs text-surface-500">Dein Schulportal</p>
            </div>
          </div>
          <button type="button" onClick={skip} className="btn btn-ghost px-3">Später einrichten</button>
        </header>

        <div className="mt-6 flex items-center gap-2 sm:mt-8" aria-label={`Schritt ${stepIndex + 1} von ${steps.length}`}>
          {steps.map((step, index) => (
            <div key={step.id} className="flex min-w-0 flex-1 items-center gap-2">
              <span className={`h-1.5 flex-1 rounded-full transition-colors ${index <= stepIndex ? 'bg-primary-500' : 'bg-surface-200 dark:bg-surface-800'}`} />
              <span className={`hidden text-[11px] font-medium sm:block ${index === stepIndex ? 'text-primary-700 dark:text-primary-300' : 'text-surface-400'}`}>{step.label}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-1 items-center py-8 lg:py-10">
          <section key={activeStep.id} className="mx-auto w-full min-w-0 max-w-3xl animate-fade-in">
            {activeStep.id === 'welcome' && (
              <div className="max-w-2xl">
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300">
                  <SparklesIcon className="h-6 w-6" />
                </div>
                <p className="mb-3 text-sm font-semibold text-primary-700 dark:text-primary-300">Willkommen, {displayName}</p>
                <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Mach Lanis zu deinem Schulportal.</h1>
                <p className="mt-5 max-w-xl text-base leading-7 text-surface-600 dark:text-surface-300 sm:text-lg">
                  Lanis holt Stundenplan, Nachrichten, Kurse und Kalender aus dem Schulportal Hessen und bringt alles in eine schnellere, übersichtlichere Oberfläche.
                </p>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-surface-200 bg-white/80 p-4 dark:border-surface-800 dark:bg-surface-900/80">
                    <CloudArrowUpIcon className="h-5 w-5 text-primary-600" />
                    <p className="mt-3 font-medium">Auf allen Geräten</p>
                    <p className="mt-1 text-sm text-surface-500">Deine Auswahl wird mit deinem Lanis-Konto synchronisiert.</p>
                  </div>
                  <div className="rounded-2xl border border-surface-200 bg-white/80 p-4 dark:border-surface-800 dark:bg-surface-900/80">
                    <Cog6ToothIcon className="h-5 w-5 text-primary-600" />
                    <p className="mt-3 font-medium">Jederzeit änderbar</p>
                    <p className="mt-1 text-sm text-surface-500">Alles bleibt später unter Einstellungen erreichbar.</p>
                  </div>
                </div>
              </div>
            )}

            {activeStep.id === 'appearance' && (
              <div className="max-w-2xl">
                <StepHeading icon={PaintBrushIcon} eyebrow="Dein Stil" title="Wie soll sich Lanis anfühlen?" description="Die Vorschau reagiert sofort. Darstellung und Farbe folgen dir auf andere Geräte." />
                <fieldset className="mt-7">
                  <legend className="mb-3 text-sm font-semibold">Darstellung</legend>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {themeModes.map(mode => (
                      <button key={mode.id} type="button" onClick={() => setDraftThemeMode(mode.id)} className={`rounded-2xl border p-3 text-left transition-all ${themeMode === mode.id ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/15 dark:bg-primary-950/40' : 'border-surface-200 bg-white hover:border-primary-300 dark:border-surface-800 dark:bg-surface-900'}`}>
                        <span className="block text-sm font-semibold">{mode.label}</span>
                        <span className="mt-1 block text-xs text-surface-500">{mode.note}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="mt-7">
                  <legend className="mb-3 text-sm font-semibold">Akzentfarbe</legend>
                  <div className="flex flex-wrap gap-3">
                    {themeColors.map(color => (
                      <button key={color.id} type="button" onClick={() => setDraftThemeColor(color.id)} className={`group flex items-center gap-2 rounded-full border bg-white py-2 pl-2 pr-3 text-sm font-medium transition-all dark:bg-surface-900 ${themeColor === color.id ? 'border-primary-500 ring-2 ring-primary-500/15' : 'border-surface-200 dark:border-surface-800'}`} aria-pressed={themeColor === color.id}>
                        <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: color.hex }}>{themeColor === color.id && <CheckIcon className="h-4 w-4 text-white" />}</span>
                        {color.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>
            )}

            {activeStep.id === 'dashboard' && (
              <div className="max-w-2xl">
                <StepHeading icon={StarIcon} eyebrow="Schnell erreichbar" title="Was brauchst du jeden Tag?" description="Favoriten stehen oben auf deinem Dashboard. Wähle bis zu sechs – den Rest findest du weiterhin darunter oder über die Suche." />
                <div className="onboarding-scroll-region mt-7 grid max-h-[25rem] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                  {modulesLoading && Array.from({ length: 6 }).map((_, index) => <div key={index} className="skeleton h-16 rounded-2xl" />)}
                  {!modulesLoading && modules.map(module => {
                    const selected = pinnedModules.includes(module.name);
                    return (
                      <button key={module.name} type="button" onClick={() => toggleModule(module.name)} className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-all ${selected ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40' : 'border-surface-200 bg-white hover:border-primary-300 dark:border-surface-800 dark:bg-surface-900'}`} aria-pressed={selected}>
                        <ModuleIcon name={module.name} logo={module.logo} color={module.color} size="small" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{module.name}</span>
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${selected ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-400 dark:bg-surface-800'}`}>{selected ? <CheckIcon className="h-4 w-4" /> : <StarIcon className="h-4 w-4" />}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-sm text-surface-500">{pinnedModules.length} von 6 ausgewählt</p>
              </div>
            )}

            {activeStep.id === 'timetable' && (
              <div className="max-w-2xl">
                <StepHeading icon={CalendarDaysIcon} eyebrow="Deine Woche" title="Wie möchtest du deinen Stundenplan sehen?" description="Beide Ansichten berücksichtigen A-/B-Wochen und deine eigenen Stundenplananpassungen." />
                <div className="mt-7 grid gap-4 sm:grid-cols-2">
                  <TimetableChoice selected={timetableMode === 'rolling'} title="Kommende Schultage" description="Zeigt ab heute, was als Nächstes ansteht – ideal auf dem Handy." days={['HEUTE', 'MORGEN', 'MO', 'DI']} onClick={() => setTimetableMode('rolling')} />
                  <TimetableChoice selected={timetableMode === 'week'} title="Feste Schulwoche" description="Zeigt immer Montag bis Freitag – ideal zum Planen." days={['MO', 'DI', 'MI', 'DO', 'FR']} onClick={() => setTimetableMode('week')} />
                </div>
              </div>
            )}

            {activeStep.id === 'homework' && (
              <div className="max-w-2xl">
                <StepHeading
                  icon={BookOpenIcon}
                  eyebrow="Klare Prioritäten"
                  title="Sollen erledigte Hausaufgaben aus der Übersicht verschwinden?"
                  description="In den Kursdetails bleiben alle Hausaufgaben sichtbar. Hier entscheidest du nur über die Übersicht in „Mein Unterricht“."
                />
                <div className="mt-7 grid gap-4 sm:grid-cols-2">
                  <HomeworkChoice
                    selected={hideCompletedHomeworkInOverview}
                    title="Aus der Übersicht ausblenden"
                    description="Nach dem Abhaken verschwindet die Hausaufgabe aus „Mein Unterricht“."
                    hiddenInOverview
                    onClick={() => setHideCompletedHomeworkInOverview(true)}
                  />
                  <HomeworkChoice
                    selected={!hideCompletedHomeworkInOverview}
                    title="Weiterhin anzeigen"
                    description="Erledigte Hausaufgaben bleiben auch in der Übersicht sichtbar."
                    onClick={() => setHideCompletedHomeworkInOverview(false)}
                  />
                </div>
              </div>
            )}

            {activeStep.id === 'guide' && (
              <div className="max-w-2xl">
                <StepHeading icon={AcademicCapIcon} eyebrow="Gut zu wissen" title="So findest du dich sofort zurecht." description="Vier Dinge reichen für den Start. Alles Weitere entdeckst du dort, wo du es brauchst." />
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  <GuideCard icon={Bars3Icon} title="Bereiche wechseln" text="Die Navigation bringt dich zu Nachrichten, Kursen, Stundenplan und Kalender." />
                  <GuideCard icon={MagnifyingGlassIcon} title="Alles durchsuchen" text="Öffne die Suche in der Navigation oder mit Strg/⌘ + K." />
                  <GuideCard icon={CalendarDaysIcon} title="Stunden korrigieren" text="Unter Einstellungen › Stundenplan kannst du wiederkehrende Stunden ändern oder ausblenden." />
                  <GuideCard icon={Cog6ToothIcon} title="Später weiter anpassen" text="Farben, Benachrichtigungen, Installation und weitere Optionen bleiben in den Einstellungen." />
                </div>
                <div className="mt-6 rounded-2xl border border-primary-200 bg-primary-50 p-4 text-sm text-primary-800 dark:border-primary-900 dark:bg-primary-950/30 dark:text-primary-200">
                  Benachrichtigungen fragen wir erst an, wenn du sie selbst aktivierst. So behältst du die Kontrolle über Browser-Berechtigungen.
                </div>
              </div>
            )}

            {(localError || syncError) && <p className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">{localError || syncError}</p>}

            <div className="mt-8 flex items-center justify-between gap-3">
              <button type="button" onClick={goBack} className={`btn btn-ghost ${stepIndex === 0 ? 'invisible' : ''}`} disabled={stepIndex === 0}><ArrowLeftIcon className="mr-2 h-4 w-4" />Zurück</button>
              {activeStep.id === 'guide' ? (
                <button type="button" onClick={complete} className="btn btn-primary px-6">Zum Dashboard<ArrowRightIcon className="ml-2 h-4 w-4" /></button>
              ) : (
                <button type="button" onClick={() => saveCurrentStep(stepIndex + 1)} className="btn btn-primary px-6">{activeStep.id === 'welcome' ? 'Lanis einrichten' : 'Weiter'}<ArrowRightIcon className="ml-2 h-4 w-4" /></button>
              )}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
};

const StepHeading: React.FC<{ icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; eyebrow: string; title: string; description: string }> = ({ icon: Icon, eyebrow, title, description }) => (
  <>
    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300"><Icon className="h-5 w-5" /></div>
    <p className="text-sm font-semibold text-primary-700 dark:text-primary-300">{eyebrow}</p>
    <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
    <p className="mt-4 max-w-xl leading-7 text-surface-600 dark:text-surface-300">{description}</p>
  </>
);

const TimetableChoice: React.FC<{ selected: boolean; title: string; description: string; days: string[]; onClick: () => void }> = ({ selected, title, description, days, onClick }) => (
  <button type="button" onClick={onClick} className={`rounded-2xl border p-4 text-left transition-all ${selected ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/15 dark:bg-primary-950/40' : 'border-surface-200 bg-white hover:border-primary-300 dark:border-surface-800 dark:bg-surface-900'}`} aria-pressed={selected}>
    <div className="mb-4 flex gap-1">{days.map((day, index) => <span key={day} className={`flex h-8 min-w-8 flex-1 items-center justify-center rounded-lg text-[9px] font-semibold ${index === 0 ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-500 dark:bg-surface-800'}`}>{day}</span>)}</div>
    <p className="font-semibold">{title}</p>
    <p className="mt-1 text-sm leading-5 text-surface-500">{description}</p>
  </button>
);

const HomeworkChoice: React.FC<{
  selected: boolean;
  title: string;
  description: string;
  hiddenInOverview?: boolean;
  onClick: () => void;
}> = ({ selected, title, description, hiddenInOverview = false, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-2xl border p-4 text-left transition-all ${selected ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/15 dark:bg-primary-950/40' : 'border-surface-200 bg-white hover:border-primary-300 dark:border-surface-800 dark:bg-surface-900'}`}
    aria-pressed={selected}
  >
    <div className={`mb-4 rounded-xl border-l-4 p-3 ${hiddenInOverview ? 'border-dashed border-surface-300 bg-surface-50 dark:border-surface-600 dark:bg-surface-800/70' : 'border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-950/35'}`}>
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
        <CheckCircleIcon className="h-3.5 w-3.5" />
        {hiddenInOverview ? 'In der Übersicht ausgeblendet' : 'Erledigt · sichtbar'}
      </span>
      <span className="mt-1.5 block text-xs text-surface-500 line-through decoration-surface-400">Arbeitsblatt fertigstellen</span>
    </div>
    <p className="font-semibold">{title}</p>
    <p className="mt-1 text-sm leading-5 text-surface-500">{description}</p>
  </button>
);

const GuideCard: React.FC<{ icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; title: string; text: string }> = ({ icon: Icon, title, text }) => (
  <div className="rounded-2xl border border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-900">
    <Icon className="h-5 w-5 text-primary-600" />
    <p className="mt-3 font-semibold">{title}</p>
    <p className="mt-1 text-sm leading-5 text-surface-500">{text}</p>
  </div>
);

export default Onboarding;
