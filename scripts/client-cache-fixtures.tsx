// Dev-only browser test fixture for elections, which has no demo route.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { AuthContext } from '../src/contexts/AuthContext';
import { demoUser } from '../src/components/demo/demoData';
import Wahlen from '../src/components/wahlen/Wahlen';
import { useResourceKey } from '../src/hooks/useCachedResource';
import { refreshResource } from '../src/utils/resourceCache';
import { wahlenAPI } from '../src/services/api';

export function mountElections(host: HTMLElement) {
  const root = createRoot(host);
  let resourceKey: string | null = null;
  function Fixture() {
    resourceKey = useResourceKey('wahlen');
    return <Wahlen />;
  }
  root.render(<HelmetProvider><AuthContext.Provider value={{
    user: demoUser, token: 'demo-election-cache-test', isAuthenticated: true,
    login: async () => true, logout: async () => {}, refreshToken: async () => true,
  }}><Fixture /></AuthContext.Provider></HelmetProvider>);
  return {
    unmount: () => root.unmount(),
    refresh: () => resourceKey && refreshResource(resourceKey, async signal => (await wahlenAPI.getElections('demo-election-cache-test', signal)).elections),
  };
}
