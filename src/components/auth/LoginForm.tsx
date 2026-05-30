import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { EyeIcon, EyeSlashIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import SEO from '../seo/SEO';

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

const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const { isDark, toggleDark } = useTheme();
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
    setShowSchoolDropdown(true);
    setSelectedSchool(null);
    setFormData((prev) => ({ ...prev, school_id: '' }));
  };

  useEffect(() => {
    const abortController = new AbortController();
    schoolListAPI.getAllSchools(abortController.signal).then(res => {
      setAllDistricts(res.districts);
    }).catch((err) => {
      if (axios.isCancel(err)) return;
    });
    return () => abortController.abort();
  }, []);

  useEffect(() => {
    const q = schoolSearch.toLowerCase();
    const results: (School & { district_id?: string; district_name?: string })[] = [];
    for (const district of allDistricts) {
      for (const school of district.schools) {
        if (q.length >= 2) {
          if (school.name.toLowerCase().includes(q) || school.location.toLowerCase().includes(q)) {
            results.push({ ...school, district_id: district.id, district_name: district.name });
          }
        } else {
          results.push({ ...school, district_id: district.id, district_name: district.name });
        }
      }
    }
    setSchoolResults(results);
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

  return (
    <div className="min-h-[100dvh] bg-surface-50 dark:bg-surface-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <SEO
        title="Anmelden"
        description="Melde dich bei Lanis an — der modernen Benutzeroberfläche für das Schulportal Hessen. Wähle deine Schule aus und logge dich ein."
        path="/login"
      />
      <button
        onClick={toggleDark}
        className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-all duration-200 active:scale-95"
        title={isDark ? 'Helles Design' : 'Dunkles Design'}
      >
        {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
        {isDark ? 'Hell' : 'Dunkel'}
      </button>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
            <img src="/favicon/android-chrome-192x192.png" alt="Schulportal" className="mx-auto h-14 w-14 rounded-2xl mb-6 shadow-soft-md" />
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
                onFocus={() => setShowSchoolDropdown(allDistricts.length > 0)}
              />
              {showSchoolDropdown && allDistricts.length > 0 && (
                <div className="absolute left-0 right-0 z-10 mt-1.5 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-soft-lg max-h-60 overflow-y-auto">
                  {schoolResults.length === 0 ? (
                    <div className="px-4 py-3 text-surface-400 dark:text-surface-500 text-sm">Keine Schulen gefunden</div>
                  ) : (
                    schoolResults.map((school, idx) => (
                      <div
                        key={school.id + idx}
                        className="px-4 py-2.5 hover:bg-primary-50 dark:hover:bg-primary-950 cursor-pointer text-sm transition-colors first:rounded-t-xl last:rounded-b-xl"
                        onMouseDown={e => { e.preventDefault(); handleSelectSchool(school); }}
                      >
                        <span className="font-medium text-surface-900 dark:text-surface-100">{school.name}</span>
                        <span className="text-surface-400"> ({school.location})</span>
                        {school.district_name && (
                          <span className="ml-2 text-xs text-surface-400">{school.district_name}</span>
                        )}
                      </div>
                    ))
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

          <p className="text-center text-xs text-surface-400 leading-relaxed">
            Dies ist eine inoffizielle Benutzeroberfläche für das Schulportal Hessen.
            <br />
            Ihre Anmeldedaten werden sicher an die offiziellen Server übertragen.
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
