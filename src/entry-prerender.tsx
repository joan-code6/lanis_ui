import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { HelmetProvider, type HelmetServerState } from 'react-helmet-async';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import Landingpage from './components/landing/Landingpage';
import StatusPage from './components/status/StatusPage';
import { SchoolLandingPage, themeForColor } from './components/schools/SchoolPage';
import SchoolDirectoryPage from './components/schools/SchoolDirectoryPage';
import { schoolPath, type SchoolProfile, type SchoolListItem } from './components/schools/schoolData';
export { parseDirectory, parseProfile, directoryProfile } from './components/schools/schoolData';
export { DEFAULT_API_BASE_URL } from './utils/backendConfig';

export const routes = [
  { path: '/', file: 'index.html' },
  { path: '/status', file: 'status/index.html' },
  { path: '/schulen', file: 'schulen.html' },
];

export function render(path: string, data: { school?: SchoolProfile; schools?: SchoolListItem[] } = {}) {
  const { school, schools } = data;
  const page = school && path === schoolPath(school.school_id) ? <SchoolLandingPage school={school} />
    : path === '/' ? <Landingpage /> : path === '/status' ? <StatusPage />
      : path === '/schulen' && schools?.length ? <SchoolDirectoryPage initialSchools={schools} /> : null;
  if (!page) throw new Error(`No prerender data/component for ${path}`);
  const theme = school ? themeForColor(school.palette.primary) : 'ruby';
  const context: { helmet?: HelmetServerState | null } = {};
  const body = renderToString(
    <HelmetProvider context={context}>
      <StaticRouter location={path}>
        <ThemeProvider initialColor={theme}><AuthProvider>{page}</AuthProvider></ThemeProvider>
      </StaticRouter>
    </HelmetProvider>,
  );
  const helmet = context.helmet;
  if (!helmet) throw new Error(`Missing SEO metadata for ${path}`);
  return {
    body, theme,
    head: [helmet.title, helmet.meta, helmet.link, helmet.script]
      .map((tags) => tags.toString()).join('\n'),
  };
}
