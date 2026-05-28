import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { dsbAPI } from '../../services/api';
import { DSBPlanTable } from '../../types';
import {
  CalendarDaysIcon,
  ArrowLeftIcon,
  ExclamationCircleIcon,
  ClockIcon,
  UserIcon,
  MapPinIcon,
  BookOpenIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import clsx from 'clsx';

interface DsbCredentials {
  username: string;
  password: string;
}

const Dsbmobile: React.FC = () => {
  const { token, user } = useAuth();
  const [credentials, setCredentials] = useState<DsbCredentials | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [menuItems, setMenuItems] = useState<string[]>([]);
  const [planUrls, setPlanUrls] = useState<string[]>([]);
  const [htmlPlanUrl, setHtmlPlanUrl] = useState<string | null>(null);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);
  const [tables, setTables] = useState<DSBPlanTable[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [error, setError] = useState('');
  const [planTitle, setPlanTitle] = useState('');

  const userClass = user?.klasse || user?.class || user?.Klasse || '';

  useEffect(() => {
    const savedCreds = localStorage.getItem('dsb_credentials');
    if (savedCreds) {
      setCredentials(JSON.parse(savedCreds));
    }
  }, []);

  useEffect(() => {
    if (credentials && token) {
      loginAndFetchPlans();
    }
  }, [credentials, token]);

  const loginAndFetchPlans = async () => {
    if (!credentials || !token) return;
    setIsLoading(true);
    setError('');

    try {
      const loginResponse = await dsbAPI.login(token, credentials);
      if (!loginResponse.success) {
        setError(loginResponse.error || 'Anmeldung bei DSBmobile fehlgeschlagen.');
        setIsLoading(false);
        return;
      }

      const urlsResponse = await dsbAPI.getPlanUrls(token, credentials);
      if (!urlsResponse.success) {
        setError(urlsResponse.error || 'Abrufen der Plan-URLs fehlgeschlagen.');
        setIsLoading(false);
        return;
      }

      setPlanUrls(urlsResponse.plan_urls);
      setMenuItems(urlsResponse.menu_items);
      setHtmlPlanUrl(urlsResponse.html_plan_url || null);
      setIsLoggedIn(true);

      if (urlsResponse.html_plan_url) {
        await fetchPlan(urlsResponse.html_plan_url);
      } else if (urlsResponse.plan_urls.length > 0) {
        await fetchPlan(urlsResponse.plan_urls[0]);
      }
    } catch (err) {
      console.error('DSB login error:', err);
      setError('Verbindung zu DSBmobile fehlgeschlagen.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlan = async (planUrl: string) => {
    if (!credentials || !token) return;
    setIsLoadingPlan(true);
    setError('');
    setTables([]);
    setPlanTitle('');

    try {
      const response = await dsbAPI.getPlan(token, credentials, {
        plan_url: planUrl,
        include_raw: false,
      });

      if (!response.success) {
        setError(response.error || 'Abrufen des Plans fehlgeschlagen.');
        setIsLoadingPlan(false);
        return;
      }

      setTables(response.tables || []);
      setPlanTitle(response.title || '');
    } catch (err) {
      console.error('DSB plan fetch error:', err);
      setError('Abrufen des Vertretungsplans fehlgeschlagen.');
    } finally {
      setIsLoadingPlan(false);
    }
  };

  const handleCredentialSave = async (username: string, password: string) => {
    const creds = { username, password };
    setCredentials(creds);
    localStorage.setItem('dsb_credentials', JSON.stringify(creds));
  };

  const handleLogout = () => {
    setCredentials(null);
    setIsLoggedIn(false);
    setTables([]);
    setPlanUrls([]);
    setMenuItems([]);
    setHtmlPlanUrl(null);
    localStorage.removeItem('dsb_credentials');
  };

  const filterRowsByClass = (table: DSBPlanTable) => {
    if (!userClass) return table.rows;

    const classColumnIndex = table.headers.findIndex(
      h => h.toLowerCase().includes('klasse') || h.toLowerCase() === 'klasse(n)'
    );

    if (classColumnIndex === -1) return table.rows;

    return table.rows.filter(row => {
      if (Array.isArray(row)) {
        return row[classColumnIndex]?.toString().includes(userClass);
      }
      const classValue = row[table.headers[classColumnIndex]];
      if (!classValue) return false;
      return classValue.toString().toLowerCase().includes(userClass.toLowerCase());
    });
  };

  const renderCellValue = (row: Record<string, string> | string[], header: string, index: number) => {
    if (Array.isArray(row)) {
      return row[index] || '';
    }
    return row[header] || '';
  };

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

  if (!credentials || !isLoggedIn) {
    return <DsbLogin onLogin={handleCredentialSave} />;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">Vertretungsplan</h1>
        <p className="page-subtitle">
          {userClass ? `Vertretungen für Klasse ${userClass}` : 'Ihr persönlicher Vertretungsplan'}
        </p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {menuItems.length > 0 && (
            <select
              value={selectedPlanIndex}
              onChange={(e) => {
                const idx = parseInt(e.target.value);
                setSelectedPlanIndex(idx);
                if (planUrls[idx]) {
                  fetchPlan(planUrls[idx]);
                }
              }}
              className="input w-auto"
            >
              {menuItems.map((item, idx) => (
                <option key={idx} value={idx}>{item}</option>
              ))}
            </select>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="btn btn-secondary text-sm"
        >
          Abmelden
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm animate-scale-in">
          {error}
        </div>
      )}

      {isLoadingPlan && (
        <div className="space-y-4">
          <div className="skeleton h-6 w-48 mb-4" />
          <div className="skeleton h-48 w-full" />
          <div className="skeleton h-48 w-full" />
        </div>
      )}

      {!isLoadingPlan && tables.length === 0 && !error && (
        <div className="card text-center py-12">
          <CalendarDaysIcon className="mx-auto h-12 w-12 text-surface-400 dark:text-surface-500" />
          <h3 className="mt-2 text-sm font-medium text-surface-900 dark:text-surface-100">Keine Vertretungen</h3>
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
            Für heute sind keine Vertretungen vorhanden.
          </p>
        </div>
      )}

      {!isLoadingPlan && tables.length > 0 && (
        <div className="space-y-6">
          {tables.map((table, tableIdx) => {
            const filteredRows = filterRowsByClass(table);
            if (filteredRows.length === 0) return null;

            return (
              <div key={tableIdx} className="card overflow-hidden">
                <div className="px-4 py-3 bg-surface-50 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700">
                  <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                    {table.caption}
                  </h3>
                  {planTitle && tableIdx === 0 && (
                    <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">{planTitle}</p>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-surface-50 dark:bg-surface-800/50">
                        {table.headers.map((header, idx) => (
                          <th
                            key={idx}
                            className="px-4 py-3 text-left text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
                      {filteredRows.map((row, rowIdx) => (
                        <tr
                          key={rowIdx}
                          className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
                        >
                          {table.headers.map((header, colIdx) => (
                            <td
                              key={colIdx}
                              className="px-4 py-3 text-sm text-surface-700 dark:text-surface-300"
                            >
                              {renderCellValue(row, header, colIdx)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {userClass && (
                  <div className="px-4 py-2 bg-primary-50 dark:bg-primary-950/30 border-t border-primary-100 dark:border-primary-900">
                    <p className="text-xs text-primary-700 dark:text-primary-300 flex items-center gap-1.5">
                      <InformationCircleIcon className="h-4 w-4" />
                      Gefiltert nach Klasse {userClass}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface DsbLoginProps {
  onLogin: (username: string, password: string) => void;
}

const DsbLogin: React.FC<DsbLoginProps> = ({ onLogin }) => {
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Bitte geben Sie Ihre DSBmobile-Zugangsdaten ein.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      onLogin(username.trim(), password);
    } catch (err) {
      setError('Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Zugangsdaten.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <div className="page-header mb-6">
        <h1 className="page-title">DSBmobile Anmeldung</h1>
        <p className="page-subtitle">Melden Sie sich mit Ihren DSBmobile-Zugangsdaten an</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              Benutzername
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input w-full"
              placeholder="z.B. F1234"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input w-full"
              placeholder="Ihr DSBmobile Passwort"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary w-full"
          >
            {isSubmitting ? 'Anmeldung...' : 'Anmelden'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-surface-50 dark:bg-surface-800 rounded-xl">
          <h4 className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
            Wo finde ich meine Zugangsdaten?
          </h4>
          <p className="text-sm text-surface-500 dark:text-surface-400">
            Ihre DSBmobile-Zugangsdaten werden von der Schulleitung bereitgestellt. 
            Diese unterscheiden sich von Ihren Schulportal Hessen Zugangsdaten.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dsbmobile;