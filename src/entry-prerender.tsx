import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { HelmetProvider, type HelmetServerState } from 'react-helmet-async';
import { ThemeProvider } from './contexts/ThemeContext';
import Landingpage from './components/landing/Landingpage';
import StatusPage from './components/status/StatusPage';

// These public pages have useful HTML without running effects or calling an API.
// Live status and the consent-based school map load in the browser as usual.
export const routes = [
  { path: '/', file: 'index.html' },
  { path: '/status', file: 'status/index.html' },
];

export function render(path: string) {
  const Page = path === '/' ? Landingpage : path === '/status' ? StatusPage : null;
  if (!Page) throw new Error(`No prerender component for ${path}`);
  const context: { helmet?: HelmetServerState | null } = {};
  const body = renderToString(
    <HelmetProvider context={context}>
      <StaticRouter location={path}>
        <ThemeProvider><Page /></ThemeProvider>
      </StaticRouter>
    </HelmetProvider>,
  );
  const helmet = context.helmet;
  if (!helmet) throw new Error(`Missing SEO metadata for ${path}`);
  return {
    body,
    head: [helmet.title, helmet.meta, helmet.link, helmet.script]
      .map((tags) => tags.toString()).join('\n'),
  };
}
