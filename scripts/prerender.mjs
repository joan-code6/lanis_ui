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
  { path: '/impressum', file: 'impressum/index.html' },
  { path: '/login', file: 'login/index.html' },
];

function hasMissingBrowserRuntime(error) {
  const message = String(error?.message || error || '');
  const normalized = message.toLowerCase();
  return (
    normalized.includes('failed to launch the browser process') &&
    (normalized.includes('error loading shared library') ||
      normalized.includes('error while loading shared libraries') ||
      normalized.includes('cannot open shared object file') ||
      normalized.includes('symbol not found'))
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

  const strictPrerender = process.env.PRERENDER_STRICT === '1';
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  } catch (error) {
    server.close();
    if (!strictPrerender && hasMissingBrowserRuntime(error)) {
      console.warn('\nSkipping prerender: browser runtime dependencies are unavailable in this build environment.');
      console.warn('Install required Chromium/Puppeteer system libraries (for example, libnss3/libatk/libx11) to enable prerendering.');
      console.warn('Set PRERENDER_STRICT=1 to fail the build instead.');
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
        if (url.includes('/api/school-list')) {
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
    console.log('  dist/impressum/index.html    — Impressum');
    console.log('  dist/login/index.html        — Login');
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
