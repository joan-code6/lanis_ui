import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { EyeIcon, EyeSlashIcon, SunIcon, MoonIcon, ServerStackIcon } from '@heroicons/react/24/outline';
import SEO from '../seo/SEO';
import AppIcon from '../AppIcon';

import { schoolListAPI } from '../../services/api';
import axios from 'axios';
import { School, District } from '../../types';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function setCookie(name: string, value: string, maxAge: number = COOKIE_MAX_AGE) {
  document.cookie = `${name}=${encodeURIComponent(value)};max-age=${maxAge};path=/;SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Uint16Array(n + 1);
  let curr = new Uint16Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    const ai = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = ai === b.charCodeAt(j - 1) ? 0 : 1;
      const d1 = prev[j] + 1;
      const d2 = curr[j - 1] + 1;
      const d3 = prev[j - 1] + cost;
      curr[j] = d1 < d2 ? (d1 < d3 ? d1 : d3) : (d2 < d3 ? d2 : d3);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function fuzzyScore(query: string, target: string): number {
  const q = normalize(query);
  const t = normalize(target);
  if (!q || !t) return 0;

  if (t.includes(q)) return q.length / t.length + 1;

  const qTokens = q.split(/\s+/);
  const tTokens = t.split(/\s+/);

  let total = 0;
  for (const qToken of qTokens) {
    let best = 0;
    for (const tToken of tTokens) {
      if (tToken === qToken) {
        best = Math.max(best, 1);
      } else if (tToken.includes(qToken)) {
        best = Math.max(best, 0.7);
      } else if (qToken.includes(tToken)) {
        best = Math.max(best, 0.5);
      } else {
        const dist = levenshtein(qToken, tToken);
        const maxLen = Math.max(qToken.length, tToken.length);
        if (dist <= 2 && dist / maxLen <= 0.5) {
          best = Math.max(best, 0.3 * (1 - dist / maxLen));
        }
      }
    }
    total += best;
  }
  return total / qTokens.length;
}

const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const { isDark, isOled, themeMode, setThemeMode } = useTheme();
  const [formData, setFormData] = useState({
    school_id: '',
    username: '',
    password: '',
  });
  const [schoolSearch, setSchoolSearch] = useState('');
  const [schoolResults, setSchoolResults] = useState<School[]>([]);
  const [allDistricts, setAllDistricts] = useState<District[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
  const [resultTruncated, setResultTruncated] = useState(false);
  const schoolInputRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedSchoolId = getCookie('lastSchoolId');
    const savedSchoolName = getCookie('lastSchoolName');
    const savedSchoolLocation = getCookie('lastSchoolLocation');
    if (savedSchoolId && savedSchoolName) {
      setFormData((prev) => ({ ...prev, school_id: savedSchoolId }));
      setSchoolSearch(`${savedSchoolName} (${savedSchoolLocation || ''})`.replace(' ()', ''));
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError('');
  };

  const handleSchoolSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSchoolSearch(value);
    setShowSchoolDropdown(value.trim().length >= 2);
    setSelectedSchool(null);
    setFormData((prev) => ({ ...prev, school_id: '' }));
  };

  useEffect(() => {
    const abortController = new AbortController();
    schoolListAPI.getAllSchools(abortController.signal).then(res => {
      setAllDistricts(Array.isArray(res?.districts) ? res.districts : []);
    }).catch((err) => {
      if (axios.isCancel(err)) return;
    });
    return () => abortController.abort();
  }, []);

  const MAX_RESULTS = 50;

  useEffect(() => {
    const timer = setTimeout(() => {
      const q = schoolSearch.trim();
      if (q.length < 2) {
        setSchoolResults([]);
        return;
      }
      const scored: { school: School & { district_id?: string; district_name?: string }; score: number }[] = [];
      for (const district of allDistricts) {
        for (const school of Array.isArray(district.schools) ? district.schools : []) {
          const s1 = fuzzyScore(q, school.name);
          const s2 = fuzzyScore(q, school.location);
          const bestScore = Math.max(s1, s2);
          if (bestScore > 0) {
            scored.push({ school: { ...school, district_id: district.id, district_name: district.name }, score: bestScore });
          }
        }
      }
      scored.sort((a, b) => b.score - a.score);
      setResultTruncated(scored.length > MAX_RESULTS);
      const results = scored.slice(0, MAX_RESULTS);
      setSchoolResults(results.map(s => s.school));
    }, 150);

    return () => clearTimeout(timer);
  }, [schoolSearch, allDistricts]);

  const handleSelectSchool = (school: School & { district_id?: string; district_name?: string }) => {
    setSelectedSchool(school);
    setSchoolSearch(`${school.name} (${school.location})${school.district_name ? ' – ' + school.district_name : ''}`);
    setFormData((prev) => ({ ...prev, school_id: school.id }));
    setShowSchoolDropdown(false);
    setCookie('lastSchoolId', school.id);
    setCookie('lastSchoolName', school.name);
    setCookie('lastSchoolLocation', school.location);
    if (schoolInputRef.current) schoolInputRef.current.blur();
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (schoolInputRef.current && !schoolInputRef.current.contains(e.target as Node)) {
        setShowSchoolDropdown(false);
      }
    };
    if (showSchoolDropdown) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSchoolDropdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const success = await login(formData);
    if (!success) {
      setError('Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Anmeldedaten.');
    }
    setIsLoading(false);
  };

  const cycleTheme = () => {
    const nextMode = themeMode === 'light'
      ? 'dark'
      : themeMode === 'dark'
        ? 'oled'
        : 'light';
    setThemeMode(nextMode);
  };

  return (
    <div className="min-h-[100dvh] bg-surface-50 dark:bg-surface-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <SEO
        title="Anmelden"
        description="Melde dich bei Lanis an — der modernen Benutzeroberfläche für das Schulportal Hessen. Wähle deine Schule aus und logge dich ein."
        path="/login"
      />
      <button
        onClick={cycleTheme}
        className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-all duration-200 active:scale-95"
        title="Design wechseln"
      >
        {isOled ? <MoonIcon className="h-4 w-4" /> : isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
        {isOled ? 'OLED' : isDark ? 'Dunkel' : 'Hell'}
      </button>
      <Link
        to="/set-custom-backend"
        className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200"
        title="Server auswählen"
      >
        <ServerStackIcon className="h-3.5 w-3.5" aria-hidden="true" />
        Server auswählen
      </Link>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
            <AppIcon alt="Schulportal" className="mx-auto h-14 w-14 rounded-2xl mb-6 shadow-soft-md" />
          <h2 className="text-3xl font-bold text-surface-900 dark:text-surface-100 tracking-tight">
            Schulportal Hessen
          </h2>
          <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">
            Inoffizielle, moderne Benutzeroberfläche
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit} autoComplete="off">
          <div className="space-y-4">
            <div className="relative">
              <label htmlFor="school_search" className="label">
                Schule suchen
              </label>
              <input
                id="school_search"
                name="school_search"
                type="text"
                className="input"
                placeholder="Schulname oder Ort eingeben..."
                value={schoolSearch}
                onChange={handleSchoolSearch}
                autoComplete="off"
                ref={schoolInputRef}
                required
                onFocus={() => { if (schoolSearch.trim().length >= 2 && allDistricts.length > 0) setShowSchoolDropdown(true); }}
              />
              {showSchoolDropdown && allDistricts.length > 0 && (
                <div className="absolute left-0 right-0 z-10 mt-1.5 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-soft-lg max-h-60 overflow-y-auto">
                  {schoolResults.length === 0 ? (
                    <div className="px-4 py-3 text-surface-400 dark:text-surface-500 text-sm">Keine Schulen gefunden</div>
                  ) : (
                    <>
                      {schoolResults.map((school, idx) => (
                        <div
                          key={school.id + idx}
                          className="px-4 py-2.5 hover:bg-primary-50 dark:hover:bg-primary-950 cursor-pointer text-sm transition-colors first:rounded-t-xl"
                          onMouseDown={e => { e.preventDefault(); handleSelectSchool(school); }}
                        >
                          <span className="font-medium text-surface-900 dark:text-surface-100">{school.name}</span>
                          <span className="text-surface-400"> ({school.location})</span>
                          {school.district_name && (
                            <span className="ml-2 text-xs text-surface-400">{school.district_name}</span>
                          )}
                        </div>
                      ))}
                      {resultTruncated && (
                        <div className="px-4 py-2 text-xs text-surface-400 italic rounded-b-xl">
                          Zeige die besten {MAX_RESULTS} Treffer. Bitte genauer suchen.
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="username" className="label">
                Benutzername
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="input"
                placeholder="vorname.nachname"
                value={formData.username}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                Passwort
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="input pr-11"
                  placeholder="Passwort eingeben"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-surface-400 hover:text-surface-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm animate-scale-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !formData.school_id}
              className="btn btn-primary w-full h-11 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Anmelden...
                </span>
              ) : (
                'Anmelden'
              )}
            </button>
          </div>

          <p className="text-center whitespace-nowrap text-[9px] sm:text-[10px] tracking-tight text-surface-400 dark:text-surface-500 leading-none">
            Mit der Anmeldung akzeptierst du unsere{' '}
            <Link
              to="/privacy-policy"
              className="underline underline-offset-2 hover:text-surface-600 dark:hover:text-surface-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-sm"
            >
              Datenschutzerklärung
            </Link>.
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
