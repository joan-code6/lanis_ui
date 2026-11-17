// Dev-only integration fixture. No real credentials or portal requests.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthContext } from '../src/contexts/AuthContext';
import { DEFAULT_USER_PREFERENCES, PreferencesProvider, usePreferences } from '../src/contexts/PreferencesContext';
import { useCachedResource } from '../src/hooks/useCachedResource';
import SavedDataNotice from '../src/components/status/SavedDataNotice';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { settingsAPI } from '../src/services/api';

export function mount() {
  const state = { complete: (_value: string) => {}, fail: () => {} };
  settingsAPI.getPreferences = () => new Promise(() => {});
  const user = JSON.parse(localStorage.getItem('auth_user')!);
  const preferencesKey = `lanis_preferences:${user.school_id}:${user.username}`;
  localStorage.setItem(preferencesKey, JSON.stringify({ preferences: DEFAULT_USER_PREFERENCES, dirty: false }));
  function View() {
    const preferences = usePreferences();
    const result = useCachedResource<string>('fixture-lesson', () => new Promise((resolve, reject) => {
      state.complete = resolve;
      state.fail = () => reject(Error('Offline fixture'));
    }));
    return <><SavedDataNotice /><div id="preferences">{preferences.isLoading ? 'Waiting for preferences' : 'Preferences ready'}</div>
      <div id="lesson">{result.data || 'Loading lesson'}</div><div id="failure">{result.error}</div></>;
  }
  createRoot(document.getElementById('root')!).render(<ThemeProvider><AuthContext.Provider value={{
    user, token: 'fixture-token', isAuthenticated: true,
    login: async () => true, logout: async () => {}, refreshToken: async () => true,
  }}><PreferencesProvider><View /></PreferencesProvider></AuthContext.Provider></ThemeProvider>);
  return state;
}
