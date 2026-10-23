import { readFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import ts from 'typescript';

// Follow school-rendering dependencies instead of invalidating on every module
// change. Shared providers, landing content, SEO and theme helpers count too.
export async function rendererFingerprint(root, apiBase) {
  const digest = createHash('sha256').update(`renderer-v2:${process.versions.node.split('.')[0]}:${apiBase}`);
  const visited = new Set();
  async function visit(name) {
    if (visited.has(name)) return;
    visited.add(name);
    const source = await readFile(join(root, name), 'utf8');
    digest.update(name).update(source);
    if (!/\.[cm]?[jt]sx?$/.test(name)) return;
    for (const { fileName } of ts.preProcessFile(source, true, true).importedFiles) {
      if (!fileName.startsWith('.')) continue;
      const base = join(root, dirname(name), fileName);
      let dependency;
      for (const suffix of ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx']) {
        try { await readFile(base + suffix); dependency = relative(root, base + suffix); break; } catch { /* Try next extension. */ }
      }
      if (!dependency) throw new Error(`Cannot resolve renderer dependency ${fileName} in ${name}`);
      await visit(dependency);
    }
  }
  for (const name of [
    'src/entry-prerender.tsx', 'src/index.css', 'package-lock.json',
    'scripts/prerender.mjs', 'scripts/school-renderer-fingerprint.mjs',
    'vite.config.ts', 'tailwind.config.js', 'postcss.config.js',
  ]) await visit(name);
  return digest.digest('hex');
}
