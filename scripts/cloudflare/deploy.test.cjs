const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudflare-deploy-test-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const assets = path.join(root, 'frontend-dist');
  fs.mkdirSync(assets, {recursive: true});
  for (const file of ['index.html', 'status.html', 'sw.js']) {
    fs.writeFileSync(path.join(assets, file), 'static content');
  }
  const bin = path.join(root, 'cloudflare-tool/node_modules/.bin');
  fs.mkdirSync(bin, {recursive: true});
  fs.writeFileSync(path.join(bin, 'wrangler'), `#!/usr/bin/env node
const fs = require('node:fs');
fs.writeFileSync(process.env.RUNNER_TEMP + '/invocation.json', JSON.stringify({
  args: process.argv.slice(2), cwd: process.cwd(),
  config: JSON.parse(fs.readFileSync(process.argv.at(-1), 'utf8'))
}));
`, {mode: 0o700});
  const invoke = (overrides = {}) => spawnSync(process.execPath, [path.join(__dirname, 'deploy.cjs')], {
    env: {...process.env, RUNNER_TEMP: root, DEPLOY_KIND: 'preview', PR_NUMBER: '123',
      CLOUDFLARE_API_TOKEN: 'test-only-placeholder', ...overrides}, encoding: 'utf8',
  });
  return {root, assets, invoke};
}

test('artifact scripts, dotenv and configuration cannot change the deploy command', t => {
  const {root, assets, invoke} = fixture(t);
  const payload = 'throw new Error("artifact code must never execute")';
  fs.writeFileSync(path.join(assets, '_worker.js'), payload);
  fs.writeFileSync(path.join(assets, 'wrangler.json'), JSON.stringify({name: 'production', main: '_worker.js'}));
  fs.writeFileSync(path.join(assets, 'package.json'), JSON.stringify({scripts: {predeploy: payload}}));
  fs.writeFileSync(path.join(assets, '.env'), 'DEPLOY_KIND=production\nPR_NUMBER=evil');
  const result = invoke();
  assert.equal(result.status, 0, result.stderr);
  const invocation = JSON.parse(fs.readFileSync(path.join(root, 'invocation.json')));
  assert.deepEqual(invocation.args.slice(0, 4), ['versions', 'upload', '--preview-alias', 'pr-123']);
  assert.equal(invocation.config.name, 'lanis-ui-preview');
  assert.equal(invocation.config.assets.directory, assets);
  assert.equal(invocation.config.main, undefined);
  assert.equal(invocation.config.build, undefined);
  assert.equal(invocation.config.routes, undefined);
  assert.equal(invocation.cwd, path.join(root, 'cloudflare-tool'));
  assert.match(fs.readFileSync(path.join(assets, '_headers'), 'utf8'), /noindex/);
});

test('client-rendered previews deploy without prerendered status HTML', t => {
  const {root, assets, invoke} = fixture(t);
  fs.rmSync(path.join(assets, 'status.html'));
  const result = invoke();
  assert.equal(result.status, 0, result.stderr);
  const invocation = JSON.parse(fs.readFileSync(path.join(root, 'invocation.json')));
  assert.equal(invocation.config.name, 'lanis-ui-preview');
  assert.equal(invocation.config.assets.not_found_handling, 'single-page-application');
  assert.match(fs.readFileSync(path.join(assets, '_headers'), 'utf8'), /noindex/);
});

test('production still requires prerendered status HTML', t => {
  const {root, assets, invoke} = fixture(t);
  fs.rmSync(path.join(assets, 'status.html'));
  const result = invoke({DEPLOY_KIND: 'production'});
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing status\.html/);
  assert.equal(fs.existsSync(path.join(root, 'invocation.json')), false);
});

test('production with prerendered status HTML still deploys', t => {
  const {root, invoke} = fixture(t);
  const result = invoke({DEPLOY_KIND: 'production'});
  assert.equal(result.status, 0, result.stderr);
  const invocation = JSON.parse(fs.readFileSync(path.join(root, 'invocation.json')));
  assert.equal(invocation.config.name, 'lanis-ui');
  assert.equal(invocation.args[0], 'deploy');
});

test('symlinked artifacts fail before invoking Wrangler', t => {
  const {root, assets, invoke} = fixture(t);
  fs.symlinkSync(__filename, path.join(assets, 'linked-file'));
  const result = invoke();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Symlinks are forbidden/);
  assert.equal(fs.existsSync(path.join(root, 'invocation.json')), false);
});

test('invalid PR numbers fail before invoking Wrangler', t => {
  const {root, invoke} = fixture(t);
  for (const value of ['123; echo bad', '../main', '0', '-1', '']) {
    assert.notEqual(invoke({PR_NUMBER: value}).status, 0);
  }
  assert.equal(fs.existsSync(path.join(root, 'invocation.json')), false);
});
