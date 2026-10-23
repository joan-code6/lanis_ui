import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
import { loadSchools } from './school-cache.mjs';
import { rendererFingerprint } from './school-renderer-fingerprint.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = join(root, 'dist');
const cacheDir = join(root, '.cache/school-pages');
const origin = 'https://lanis.arg-server.de';
const hash = (value) => createHash('sha256').update(value).digest('hex');
const serialize = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

async function prerender() {
  if (process.env.SKIP_PRERENDER === '1') {
    console.log('SKIP_PRERENDER=1, skipping prerender step.');
    return;
  }
  // Vite loads the real TSX components without an HTTP listener or browser.
  const vite = await createServer({
    root, mode: 'production', appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
  });
  try {
    const { routes, render, DEFAULT_API_BASE_URL: apiBase, ...validators } = await vite.ssrLoadModule('/src/entry-prerender.tsx');
    const template = await readFile(join(dist, 'index.html'), 'utf8');
    if (!template.includes('<div id="root"></div>')) throw new Error('Expected an empty React root; run after Vite.');
    const shell = template
      .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
      .replace(/<meta\b[^>]*>/gi, (tag) => (
        /\b(?:name|property)=["'](?:title|description|robots|og:[^"']*|twitter:[^"']*)["']/i.test(tag) ? '' : tag
      ))
      .replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi, '');

    async function writePage(route, result, bootstrap = '') {
      if (!result.body.includes('<h1') || !result.head.includes('rel="canonical"')) {
        throw new Error(`Missing public content or canonical metadata for ${route.path}`);
      }
      // The shell is always from THIS build. Only asset-independent React
      // markup is cached, so old JS/CSS filenames cannot leak across releases.
      const html = shell.replace('<html lang="de">', () => `<html lang="de" data-theme="${result.theme}">`)
        .replace('</head>', () => `${result.head}\n</head>`)
        .replace('<div id="root"></div>', () => `${bootstrap}<div id="root">${result.body}</div>`);
      const output = join(dist, route.file);
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, html);
    }

    // Fail on component/import problems before fetching thousands of profiles.
    for (const route of routes.filter((route) => route.path !== '/schulen')) {
      await writePage(route, render(route.path));
      console.log(`Prerendered ${route.path} -> dist/${route.file}`);
    }
    const { schools, entries } = await loadSchools({ cacheDir, apiBase, ...validators });
    const directoryRoute = routes.find((route) => route.path === '/schulen');
    await writePage(directoryRoute, render('/schulen', { schools }),
      `<script id="school-directory-data" type="application/json">${serialize({ success: true, schools })}</script>`);

    const fingerprint = await rendererFingerprint(root, apiBase);
    const markupDir = join(cacheDir, 'markup');
    let previousFingerprint;
    try { previousFingerprint = await readFile(join(cacheDir, 'renderer'), 'utf8'); } catch { /* Cache miss. */ }
    if (previousFingerprint !== fingerprint) await rm(markupDir, { recursive: true, force: true });
    await mkdir(markupDir, { recursive: true });
    await writeFile(join(cacheDir, 'renderer'), fingerprint);
    let rendered = 0, reused = 0;
    const sitemap = [`<url><loc>${origin}/</loc></url>`, `<url><loc>${origin}/status</loc></url>`, `<url><loc>${origin}/schulen</loc></url>`];
    // Sequential rendering keeps peak memory bounded to one school's markup.
    for (const entry of entries) {
      const { school } = entry;
      const route = { path: `/schule/${school.school_id}`, file: `schule/${school.school_id}.html` };
      const key = hash(`${fingerprint}:${JSON.stringify(school)}`);
      const cachedFile = join(markupDir, `${school.school_id}.json`);
      let result;
      try {
        const cached = JSON.parse(await readFile(cachedFile, 'utf8'));
        if (cached.key === key && typeof cached.body === 'string' && typeof cached.head === 'string'
          && ['cyan', 'emerald', 'sapphire', 'amethyst', 'ruby', 'amber', 'coral', 'blush', 'moss'].includes(cached.theme)) result = cached;
      } catch { /* Corrupt/missing cache entries are rendered again. */ }
      if (result) reused++;
      else {
        result = render(route.path, { school });
        await writeFile(cachedFile, JSON.stringify({ key, ...result }));
        rendered++;
      }
      await writePage(route, result, `<script id="school-page-data" type="application/json">${serialize(school)}</script>`);
      sitemap.push(`<url><loc>${origin}${route.path}</loc><lastmod>${new Date(entry.changedAt).toISOString()}</lastmod></url>`);
    }
    await writeFile(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.join('\n')}\n</urlset>\n`);
    console.log(`Prerendered ${schools.length} school pages: ${rendered} rendered, ${reused} markup cache hits; sitemap written.`);
  } finally { await vite.close(); }
}

prerender().catch((error) => {
  console.error('Prerender failed:', error);
  process.exitCode = 1;
});
