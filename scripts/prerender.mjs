import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = join(__dirname, '..');
const distDir = join(projectRoot, 'dist');
const port = 5179;

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

function serveFile(filePath, res) {
  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }
  const ext = extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';
  const content = readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': mime, 'Content-Length': content.length });
  res.end(content);
}

function staticSeoRoutes() {
  return [
    {
      path: '/',
      file: 'index.html',
      title: 'Das Schulportal Hessen, neu gedacht | Lanis',
      description: 'Lanis ist die modernere, inoffizielle Oberfläche für das Schulportal Hessen: Hausaufgaben direkt im Stundenplan, Push-Benachrichtigungen und schnellere Ladezeiten.',
      content: `<main style="max-width:72rem;margin:0 auto;padding:2rem 1.5rem 4rem;font-family:system-ui,sans-serif;color:#1a1a1a;line-height:1.65">
        <nav style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5rem"><a href="/" style="font-weight:700;color:inherit;text-decoration:none">Lanis</a><a href="/login">Login</a></nav>
        <header style="max-width:52rem;margin-bottom:5rem"><h1 style="font-size:clamp(2.5rem,7vw,5rem);line-height:1.05;letter-spacing:-.04em;margin:0 0 1.5rem">Schulportal 2.0 – modern und verlässlich</h1><p style="font-size:1.25rem;color:#555">Die gleichen Daten und Funktionen des Schulportals Hessen – mit einer klareren Oberfläche, schnellerem Zugriff und weniger Klicks.</p><p><a href="/login">Lanis jetzt nutzen</a> · <a href="/demo">Demo ansehen</a></p></header>
        <section><h2>Hausaufgaben direkt im Stundenplan</h2><p>Sieh auf einen Blick, welche Aufgaben anstehen, und hake Erledigtes direkt ab.</p></section>
        <section><h2>Wichtige Änderungen mitbekommen</h2><p>Web-Push-Benachrichtigungen informieren dich über neue Nachrichten und Änderungen am Vertretungsplan.</p></section>
        <section><h2>Deine Daten bleiben verfügbar</h2><p>Bereits geladene Inhalte bleiben bei Störungen des Schulportals bis zu 24 Stunden verfügbar.</p></section>
        <section><h2>Schneller zu deinen Modulen</h2><p>Direkte Navigation, globale Suche und anpinnbare Module bringen dich mit wenigen Klicks ans Ziel.</p></section>
        <section><h2>Ein Design, das zu dir passt</h2><p>Dark Mode und sechs Farbthemen sorgen für eine aufgeräumte, anpassbare Oberfläche.</p></section>
        <footer style="margin-top:5rem;border-top:1px solid #ddd;padding-top:1.5rem"><a href="/status">Status des Schulportals Hessen</a> · <a href="/impressum">Impressum</a> · <a href="/privacy-policy">Datenschutz</a></footer>
      </main>`,
    },
    {
      path: '/status',
      file: 'status/index.html',
      title: 'Schulportal Hessen Status & Uptime | Lanis',
      description: 'Aktuelle Verfügbarkeit und Störungen des Schulportal Hessen. Beobachte den Status von Anmeldung und Modulen sowie den Verlauf der letzten 24 Stunden bis 90 Tage.',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Schulportal Hessen Status & Uptime',
        description: 'Uptime, Verfügbarkeit und aktuelle Störungen des Schulportal Hessen – ein Status-Feature von Lanis.',
        url: 'https://lanis.arg-server.de/status',
        isPartOf: { '@type': 'WebSite', name: 'Lanis', url: 'https://lanis.arg-server.de' },
      },
      content: `<main style="max-width:56rem;margin:0 auto;padding:2rem 1.5rem 4rem;font-family:system-ui,sans-serif;color:#1a1a1a;line-height:1.65">
        <nav style="margin-bottom:4rem"><a href="/" style="font-weight:700;color:inherit;text-decoration:none">Lanis</a></nav>
        <h1 style="font-size:clamp(2.25rem,6vw,3.5rem);line-height:1.1;letter-spacing:-.03em">Schulportal Hessen Status</h1>
        <p>Diese Statusseite überwacht die Erreichbarkeit der Anmeldung und der Module des Schulportal Hessen.</p>
        <h2>Verfügbarkeit und Verlauf</h2>
        <p>Die Lanis-Statusseite zeigt aktuelle Verfügbarkeit, bestätigte Störungen und den Messverlauf für 24 Stunden, 7 Tage, 30 Tage und 90 Tage. Die Live-Messwerte werden nach dem Laden der Seite ergänzt.</p>
        <p><a href="/">Mehr über Lanis</a> · <a href="/login">Zur App</a></p>
      </main>`,
    },
  ];
}

function writeStaticSeoFallbacks() {
  const baseHtml = readFileSync(join(distDir, 'index.html'), 'utf-8');
  for (const route of staticSeoRoutes()) {
    let html = baseHtml
      .replace(/<title>[\s\S]*?<\/title>/i, `<title>${route.title}</title>`)
      .replace(/<meta name="description" content="[^"]*"\s*\/>/i, `<meta name="description" content="${route.description}" />`)
      .replace(/<link rel="canonical" href="[^"]*"\s*\/>/i, `<link rel="canonical" href="https://lanis.arg-server.de${route.path}" />`)
      .replace(/<meta property="og:title" content="[^"]*"\s*\/>/i, `<meta property="og:title" content="${route.title}" />`)
      .replace(/<meta property="og:description" content="[^"]*"\s*\/>/i, `<meta property="og:description" content="${route.description}" />`)
      .replace(/<meta property="og:url" content="[^"]*"\s*\/>/i, `<meta property="og:url" content="https://lanis.arg-server.de${route.path}" />`)
      .replace(/<meta name="twitter:title" content="[^"]*"\s*\/>/i, `<meta name="twitter:title" content="${route.title}" />`)
      .replace(/<meta name="twitter:description" content="[^"]*"\s*\/>/i, `<meta name="twitter:description" content="${route.description}" />`);

    if (!html.includes('<div id="root"></div>')) {
      throw new Error(`Could not find the root mount in dist/${route.file}`);
    }
    html = html.replace('<div id="root"></div>', `<div id="root">${route.content}</div>`);
    if (route.structuredData) {
      html = html.replace('</head>', `    <script type="application/ld+json">${JSON.stringify(route.structuredData)}</script>\n  </head>`);
    }

    const outputPath = join(distDir, ...route.file.split('/'));
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, html, 'utf-8');
    console.log(`  Wrote crawlable fallback for ${route.path} -> dist/${route.file}`);
  }
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  let pathname = url.pathname;

  if (pathname === '/favicon.ico') {
    serveFile(join(distDir, 'favicon', 'favicon.ico'), res);
    return;
  }

  if (pathname === '/robots.txt') {
    serveFile(join(distDir, 'robots.txt'), res);
    return;
  }

  if (pathname === '/sitemap.xml') {
    serveFile(join(distDir, 'sitemap.xml'), res);
    return;
  }

  if (pathname.startsWith('/favicon/') || pathname.startsWith('/landing/')) {
    serveFile(join(distDir, pathname), res);
    return;
  }

  if (pathname.startsWith('/assets/')) {
    serveFile(join(distDir, pathname), res);
    return;
  }

  if (pathname === '/icon.webp') {
    serveFile(join(distDir, 'icon.webp'), res);
    return;
  }

  serveFile(join(distDir, 'index.html'), res);
});

const routes = [
  { path: '/', file: 'index.html' },
  { path: '/status', file: 'status/index.html' },
];

function hasUnavailableBrowser(error) {
  const message = String(error?.message || error || '');
  const normalized = message.toLowerCase();
  return (
    normalized.includes('could not find chrome') ||
    normalized.includes('browser was not found') ||
    normalized.includes('executable doesn\'t exist') ||
    normalized.includes('no executable was found') ||
    (normalized.includes('failed to launch the browser process') &&
      (normalized.includes('error loading shared library') ||
        normalized.includes('error while loading shared libraries') ||
        normalized.includes('cannot open shared object file') ||
        normalized.includes('symbol not found')))
  );
}

async function prerender() {
  if (process.env.SKIP_PRERENDER === '1') {
    console.log('SKIP_PRERENDER=1, skipping prerender step.');
    return;
  }

  console.log('Starting prerender server...');

  await new Promise((resolve) => server.listen(port, resolve));
  console.log(`Server running at http://localhost:${port}`);

  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  } catch (error) {
    server.close();
    if (hasUnavailableBrowser(error)) {
      console.warn('\nChrome is unavailable; writing static, route-specific SEO HTML instead.');
      writeStaticSeoFallbacks();
      return;
    }
    throw error;
  }

  try {
    for (const route of routes) {
      console.log(`\nPrerendering ${route.path} -> dist/${route.file}`);

      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });

      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const url = req.url();
        if (req.resourceType() === 'fetch' && new URL(url).pathname === '/status') {
          const now = new Date().toISOString();
          const empty = { checks: 0, available_checks: 0, failed_checks: 0, unknown_checks: 0, uptime_percent: null, coverage_percent: 0 };
          req.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              service: 'Schulportal Hessen',
              generated_at: now,
              current: { status: 'unknown', checked_at: null, stale: true, features: [] },
              summary: { ...empty, period_days: 90 },
              daily: Array.from({ length: 90 }, (_, index) => ({ ...empty, day: String(index), status: 'unknown' })),
              incidents: [],
              measurement: { interval_seconds: 300, stale_after_seconds: 600, period_start: now, period_end: now, description: 'Regelmäßige Prüfungen von Anmeldung und Modulen.' },
            }),
          });
        } else if (url.includes('/api/school-list')) {
          req.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, districts: [] }),
          });
        } else {
          req.continue();
        }
      });

      await page.goto(`http://localhost:${port}${route.path}`, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      await page.evaluate(() => new Promise((r) => setTimeout(r, 2000)));

      const html = await page.content();
      const outputPath = join(distDir, ...route.file.split('/'));

      const dir = dirname(outputPath);
      if (dir !== distDir) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(outputPath, html, 'utf-8');
      console.log(`  Written ${(html.length / 1024).toFixed(1)} KB`);

      await page.close();
    }

    console.log('\nPrerendering complete!');
    console.log('  dist/index.html              — Landing page');
    console.log('  dist/status/index.html       — Public status');
  } finally {
    await browser.close();
    server.close();
  }
}

prerender().catch((err) => {
  console.error('Prerender failed:', err);
  server.close();
  process.exit(1);
});
