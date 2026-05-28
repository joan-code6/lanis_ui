import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { dsbAPI } from '../../services/api';
import { DSBPlanTable } from '../../types';
import {
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

const Dsbmobile: React.FC = () => {
  const { token, user } = useAuth();
  const [menuItems, setMenuItems] = useState<string[]>([]);
  const [planUrls, setPlanUrls] = useState<string[]>([]);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);
  const [tables, setTables] = useState<DSBPlanTable[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [error, setError] = useState('');

  const credentials = { username: '282822', password: 'berlin' };
  const userClass = user?.klasse || user?.class || user?.Klasse || '';

  useEffect(() => {
    if (token) {
      loginAndFetchPlans();
    }
  }, [token]);

  const loginAndFetchPlans = async () => {
    if (!token) return;
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
    if (!token) return;
    setIsLoadingPlan(true);
    setError('');
    setTables([]);

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
    } catch (err) {
      console.error('DSB plan fetch error:', err);
      setError('Abrufen des Vertretungsplans fehlgeschlagen.');
    } finally {
      setIsLoadingPlan(false);
    }
  };

  const getCellValue = (row: Record<string, string> | string[], headerIndex: number, headers: string[]): string => {
    if (Array.isArray(row)) {
      return String(row[headerIndex] || '');
    }
    const header = headers[headerIndex];
    return String(row[header] || '');
  };

  const findClassColumnAndMatch = (row: Record<string, string> | string[], headers: string[]): boolean => {
    const classIndex = headers.findIndex(h => 
      h.toLowerCase().includes('klasse')
    );
    if (classIndex === -1) return true;
    
    let classValue = '';
    if (Array.isArray(row)) {
      classValue = String(row[classIndex] || '');
    } else {
      classValue = String(row[headers[classIndex]] || '');
    }
    
    if (!userClass) return true;
    return classValue.trim().toLowerCase().includes(userClass.toLowerCase());
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">Vertretungsplan</h1>
        <p className="page-subtitle">
          {userClass ? `Vertretungen für Klasse ${userClass}` : 'Aktuelle Vertretungen und Abwesenheiten'}
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
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm animate-scale-in">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="space-y-4">
          <div className="skeleton h-6 w-48 mb-4" />
          <div className="skeleton h-48 w-full" />
          <div className="skeleton h-48 w-full" />
        </div>
      )}

      {isLoadingPlan && (
        <div className="space-y-4">
          <div className="skeleton h-6 w-48 mb-4" />
          <div className="skeleton h-48 w-full" />
          <div className="skeleton h-48 w-full" />
        </div>
      )}

      {!isLoading && !isLoadingPlan && tables.length === 0 && !error && (
        <div className="card text-center py-12">
          <CalendarDaysIcon className="mx-auto h-12 w-12 text-surface-400 dark:text-surface-500" />
          <h3 className="mt-2 text-sm font-medium text-surface-900 dark:text-surface-100">Keine Vertretungen</h3>
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
            Für heute sind keine Vertretungen vorhanden.
          </p>
        </div>
      )}

      {!isLoading && !isLoadingPlan && tables.length > 0 && (
        <div className="space-y-6">
          {tables
            .filter(table => {
              if (table.headers.length === 0) return false;
              const caption = table.caption || '';
              if (caption.toLowerCase() === 'inhalte') return false;
              const filteredRows = table.rows ? table.rows.filter(row => findClassColumnAndMatch(row, table.headers)) : [];
              if (filteredRows.length === 0) return false;
              return true;
            })
            .map((table, tableIdx) => {
              const filteredRows = table.rows ? table.rows.filter(row => findClassColumnAndMatch(row, table.headers)) : [];
              const dateLabel = menuItems[selectedPlanIndex] || 'Vertretungen';
              
              return (
                <div key={tableIdx} className="card overflow-hidden">
                  <div className="px-4 py-3 bg-surface-50 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700">
                    <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                      {dateLabel}
                    </h3>
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
                            {table.headers.map((_, colIdx) => (
                              <td
                                key={colIdx}
                                className="px-4 py-3 text-sm text-surface-700 dark:text-surface-300"
                              >
                                {getCellValue(row, colIdx, table.headers)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default Dsbmobile;