import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { dsbAPI } from '../../services/api';
import axios from 'axios';
import { DSBPlanTable } from '../../types';
import SEO from '../seo/SEO';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';

function formatLastUpdated(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : `${date.toLocaleDateString('de-DE')}, ${date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;
}

const Dsbmobile: React.FC = () => {
  const { token, user } = useAuth();
  const [tables, setTables] = useState<DSBPlanTable[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAllClasses, setShowAllClasses] = useState(false);
  const userClass = user?.klasse || user?.class || user?.Klasse || '';

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setIsLoading(true);
    setTables([]);
    setLastUpdated(null);
    setError('');
    dsbAPI.getSchoolPlan(token, controller.signal)
      .then(response => {
        if (controller.signal.aborted) return;
        if (!response.success) throw new Error(response.error || 'Vertretungsplan konnte nicht geladen werden.');
        setTables(response.tables || []);
        setLastUpdated(response.last_updated || null);
      })
      .catch(error => {
        if (!axios.isCancel(error) && !controller.signal.aborted) setError(error.message || 'Vertretungsplan konnte nicht geladen werden.');
      })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [token]);

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

  const visibleTables = tables
    .map((table, tableIdx) => ({
      table,
      tableIdx,
      filteredRows: showAllClasses
        ? (table.rows || [])
        : (table.rows ? table.rows.filter(row => findClassColumnAndMatch(row, table.headers)) : []),
    }))
    .filter(({ table, filteredRows }) => table.headers.length > 0 && filteredRows.length > 0);

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
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <SEO
        title="Vertretungsplan"
        description="Lanis Vertretungsplan — Aktuelle Vertretungen, Abwesenheiten und Raumänderungen für deine Schule."
        path="/dsb"
        noindex
      />
      <div className="page-header">
        <h1 className="page-title">Vertretungsplan</h1>
        <p className="page-subtitle flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span>
            {showAllClasses ? 'Vertretungen für alle Klassen' : userClass ? `Vertretungen für Klasse ${userClass}` : 'Aktuelle Vertretungen und Abwesenheiten'}
          </span>
          {lastUpdated && (
            <span className="whitespace-nowrap text-xs text-surface-400 dark:text-surface-500">
              <time dateTime={lastUpdated}>Stand {formatLastUpdated(lastUpdated)}</time>
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {userClass && (
            <button
              type="button"
              onClick={() => setShowAllClasses(!showAllClasses)}
              className="w-40 px-3 py-2 text-sm font-medium rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
            >
              {showAllClasses ? 'Nur meine Klasse' : 'Alle Klassen'}
            </button>
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

      {!isLoading && tables.length === 0 && !error && (
        <div className="card text-center py-12">
          <CalendarDaysIcon className="mx-auto h-12 w-12 text-surface-400 dark:text-surface-500" />
          <h3 className="mt-2 text-sm font-medium text-surface-900 dark:text-surface-100">Keine Vertretungen</h3>
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
            Für heute sind keine Vertretungen vorhanden.
          </p>
        </div>
      )}

      {!isLoading && tables.length > 0 && visibleTables.length === 0 && !error && (
        <div className="card text-center py-12">
          <CalendarDaysIcon className="mx-auto h-12 w-12 text-surface-400 dark:text-surface-500" />
          <h3 className="mt-2 text-sm font-medium text-surface-900 dark:text-surface-100">
            {showAllClasses ? 'Keine Vertretungen vorhanden' : 'Keine Vertretungen für deine Klasse'}
          </h3>
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
            {showAllClasses
              ? 'Im aktuellen Plan sind keine Vertretungen eingetragen.'
              : userClass
                ? `Für Klasse ${userClass} sind aktuell keine Vertretungen eingetragen.`
                : 'Für deine Klasse sind aktuell keine Vertretungen eingetragen.'}
          </p>
        </div>
      )}

      {!isLoading && visibleTables.length > 0 && (
        <div className="space-y-6">
          {visibleTables
            .map(({ table, tableIdx, filteredRows }) => {
              const dateLabel = table.date
                ? new Date(table.date).toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                : 'Vertretungen';
              
              return (
                <div key={tableIdx} className="card overflow-hidden">
                  <div className="px-4 py-3 bg-surface-50 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700">
                    <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                      {dateLabel}
                    </h3>
                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                      {filteredRows.length} {filteredRows.length === 1 ? 'Eintrag' : 'Einträge'}
                    </p>
                  </div>

                  {/* Desktop table view */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-surface-50 dark:bg-surface-800/50">
                          {table.headers.map((header, idx) => (
                            <th
                              key={idx}
                              className="px-4 py-3 text-left text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider whitespace-nowrap"
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
                                className="px-4 py-3 text-sm text-surface-700 dark:text-surface-300 whitespace-nowrap"
                              >
                                {getCellValue(row, colIdx, table.headers)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile card view */}
                  <div className="md:hidden divide-y divide-surface-100 dark:divide-surface-700">
                    {filteredRows.map((row, rowIdx) => (
                      <div key={rowIdx} className="px-4 py-3 space-y-1.5">
                        {table.headers.map((header, colIdx) => {
                          const value = getCellValue(row, colIdx, table.headers);
                          if (!value) return null;
                          return (
                            <div key={colIdx} className="flex gap-2 text-sm">
                              <span className="text-[11px] font-medium text-surface-400 dark:text-surface-500 uppercase tracking-wider w-24 flex-shrink-0 pt-0.5">
                                {header}
                              </span>
                              <span className="text-surface-700 dark:text-surface-300 leading-snug">{value}</span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
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
