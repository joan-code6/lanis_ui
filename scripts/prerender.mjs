import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = join(root, 'dist');

async function prerender() {
  if (process.env.SKIP_PRERENDER === '1') {
    console.log('SKIP_PRERENDER=1, skipping prerender step.');
    return;
  }

  // Use Vite only to load TSX and resolve the same imports as the client build.
  // Middleware mode opens no HTTP port; no browser or network data is needed.
  const vite = await createServer({
    root,
    mode: 'production',
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
  });
  try {
    const { routes, render } = await vite.ssrLoadModule('/src/entry-prerender.tsx');
    const template = await readFile(join(dist, 'index.html'), 'utf8');
    if (!template.includes('<div id="root"></div>')) {
      throw new Error('Expected an empty React root in dist/index.html; run after Vite.');
    }

    // Replace metadata owned by SEO.tsx rather than duplicating canonical,
    // Open Graph and Twitter tags from the generic app shell.
    const shell = template
      .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
      .replace(/<meta\b[^>]*>/gi, (tag) => (
        /\b(?:name|property)=["'](?:title|description|robots|og:[^"']*|twitter:[^"']*)["']/i.test(tag) ? '' : tag
      ))
      .replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi, '');

    // Render every route before writing. Errors fail the build rather than
    // silently deploying empty pages or separate fallback templates.
    const pages = routes.map((route) => {
      const { body, head } = render(route.path);
      if (!body.includes('<h1') || !head.includes('rel="canonical"')) {
        throw new Error(`Missing public content or canonical metadata for ${route.path}`);
      }
      return {
        ...route,
        html: shell.replace('</head>', () => `${head}\n</head>`)
          .replace('<div id="root"></div>', () => `<div id="root">${body}</div>`),
      };
    });
    for (const page of pages) {
      const output = join(dist, page.file);
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, page.html);
      console.log(`Prerendered ${page.path} -> dist/${page.file}`);
    }
  } finally {
    await vite.close();
  }
}

prerender().catch((error) => {
  console.error('Prerender failed:', error);
  process.exitCode = 1;
});
