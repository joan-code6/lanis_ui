const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

const kind = process.env.DEPLOY_KIND;
if (!['production', 'preview'].includes(kind)) throw new Error('Invalid deployment kind');
if (kind === 'preview' && !/^[1-9][0-9]*$/.test(process.env.PR_NUMBER || '')) {
  throw new Error('Invalid PR number');
}
if (!process.env.CLOUDFLARE_API_TOKEN) throw new Error('CLOUDFLARE_API_TOKEN is missing');
const temp = process.env.RUNNER_TEMP;
if (!temp || !path.isAbsolute(temp)) throw new Error('RUNNER_TEMP must be an absolute path');
const assets = path.join(temp, 'frontend-dist');
const tool = path.join(temp, 'cloudflare-tool');

// Artifacts are untrusted data. Never run their scripts, npm hooks, Wrangler
// configuration, or Worker entry points. They are served as static files only.
function validateFiles(directory) {
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Symlinks are forbidden in deployment artifacts');
    if (entry.isDirectory()) validateFiles(file);
    else if (!entry.isFile() || fs.statSync(file).size > 25 * 1024 * 1024) {
      throw new Error('Invalid or oversized static asset');
    }
  }
}
validateFiles(assets);
for (const file of ['index.html', 'status/index.html', 'sw.js']) {
  if (!fs.statSync(path.join(assets, file)).isFile()) throw new Error(`Missing ${file}`);
}
if (kind === 'preview') {
  fs.appendFileSync(path.join(assets, '_headers'), '\n/*\n  X-Robots-Tag: noindex, nofollow\n');
}
const name = kind === 'production' ? 'lanis-ui' : 'lanis-ui-preview';
const config = {
  name, compatibility_date: '2026-10-17', workers_dev: true, preview_urls: true,
  assets: {directory: assets, html_handling: 'auto-trailing-slash', not_found_handling: 'single-page-application'},
};
// Custom Domains are provisioned separately. CI needs Workers Scripts Edit
// only, with no DNS or zone permissions. Deploying assets preserves domains.
const configPath = path.join(tool, 'deploy.json');
fs.writeFileSync(configPath, JSON.stringify(config));
const command = kind === 'production' ? ['deploy']
  : ['versions', 'upload', '--preview-alias', `pr-${process.env.PR_NUMBER}`];
const result = spawnSync(path.join(tool, 'node_modules/.bin/wrangler'), [
  ...command, '--config', configPath,
], {
  cwd: tool,
  env: {...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false'},
  stdio: 'inherit',
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
const url = kind === 'production' ? 'https://lanis.arg-server.de'
  : `https://pr-${process.env.PR_NUMBER}-lanis-ui-preview.bennetjoanwegener.workers.dev`;
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `url=${url}\n`);
console.log(`Deployment ready: ${url}`);
