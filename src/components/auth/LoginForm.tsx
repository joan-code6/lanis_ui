import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { EyeIcon, EyeSlashIcon, AcademicCapIcon } from '@heroicons/react/24/outline';

import { schoolListAPI } from '../../services/api';
import { School, District } from '../../types';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    school_id: '',
    username: '',
    password: '',
  });
  const [schoolSearch, setSchoolSearch] = useState('');
  const debouncedSchoolSearch = useDebounce(schoolSearch, 300); // 300ms debounce
  const [schoolResults, setSchoolResults] = useState<School[]>([]);
  const [allDistricts, setAllDistricts] = useState<District[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
  const schoolInputRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');


  // Handle username/password changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError('');
  };

  // Handle school search input (just update state, debounced effect does the API call)
  const handleSchoolSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSchoolSearch(value);
    setShowSchoolDropdown(true);
    setSelectedSchool(null);
    setFormData((prev) => ({ ...prev, school_id: '' }));
  };

  // Debounced API call for school search
  useEffect(() => {
    const abortController = new AbortController();

    const searchSchools = async () => {
      if (debouncedSchoolSearch.length < 2) {
        setSchoolResults([]);
        return;
      }
      try {
        const res = await schoolListAPI.searchSchools(debouncedSchoolSearch);
        if (!abortController.signal.aborted) {
          setSchoolResults(res.results.map(r => ({ ...r.school, district_id: r.district_id, district_name: r.district_name })));
        }
      } catch (e) {
        if (!abortController.signal.aborted) {
          setSchoolResults([]);
        }
      }
    };

    searchSchools();

    return () => {
      abortController.abort();
    };
  }, [debouncedSchoolSearch]);

  // Handle school selection
  const handleSelectSchool = (school: School & { district_id?: string; district_name?: string }) => {
    setSelectedSchool(school);
    setSchoolSearch(`${school.name} (${school.location})${school.district_name ? ' – ' + school.district_name : ''}`);
    setFormData((prev) => ({ ...prev, school_id: school.id }));
    setShowSchoolDropdown(false);
    if (schoolInputRef.current) schoolInputRef.current.blur();
  };

  // Hide dropdown on outside click
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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-600 rounded-full flex items-center justify-center mb-6">
            <AcademicCapIcon className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Schulportal Hessen
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Inoffizielle, moderne Benutzeroberfläche
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit} autoComplete="off">
          <div className="card">
            <div className="space-y-4">
              <div className="relative">
                <label htmlFor="school_search" className="block text-sm font-medium text-gray-700 mb-1">
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
                  onFocus={() => setShowSchoolDropdown(schoolSearch.length > 1)}
                />
                {showSchoolDropdown && schoolSearch.length > 1 && (
                  <div className="absolute left-0 right-0 z-10 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-60 overflow-y-auto w-full">
                    {schoolResults.length === 0 ? (
                      <div className="px-4 py-2 text-gray-500 text-sm">Keine Schulen gefunden</div>
                    ) : (
                      schoolResults.map((school, idx) => (
                        <div
                          key={school.id + idx}
                          className="px-4 py-2 hover:bg-primary-50 cursor-pointer text-sm"
                          onMouseDown={e => { e.preventDefault(); handleSelectSchool(school); }}
                        >
                          {school.name} <span className="text-gray-400">({school.location})</span>
                          {school.district_name && (
                            <span className="ml-2 text-xs text-gray-400">{school.district_name}</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Benutzername
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="input"
                  placeholder="Benutzername (vorname.nachname)"
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Passwort
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="input pr-10"
                    placeholder="Passwort"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm animate-slide-up">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !formData.school_id}
                className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Anmelden...
                  </div>
                ) : (
                  'Anmelden'
                )}
              </button>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Dies ist eine inoffizielle Benutzeroberfläche für das Schulportal Hessen.
              <br />
              Ihre Anmeldedaten werden sicher an die offiziellen Server übertragen.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;