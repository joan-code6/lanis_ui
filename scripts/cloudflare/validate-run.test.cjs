const {test} = require('node:test');
const assert = require('node:assert/strict');
const {selectTarget} = require('./validate-run.cjs');
const repo = 'joan-code6/lanis_ui';
const sha = 'a'.repeat(40);
const run = {repository: {full_name: repo}, head_repository: {full_name: repo},
  path: '.github/workflows/build.yml', conclusion: 'success', head_sha: sha,
  head_branch: 'main', event: 'push'};
const pr = {state: 'open', number: 123, base: {repo: {full_name: repo}}, head: {sha}};

test('only the latest main push deploys production', () => {
  assert.deepEqual(selectTarget(run, repo, sha, []), {kind: 'production', sha, pr: ''});
  for (const change of [{head_branch: 'feature'}, {head_repository: {full_name: 'attacker/fork'}},
    {head_sha: 'b'.repeat(40)}, {event: 'workflow_dispatch'}]) {
    assert.equal(selectTarget({...run, ...change}, repo, sha, []), null);
  }
});

test('successful PR builds only deploy previews for the current open head', () => {
  const preview = {...run, event: 'pull_request', head_branch: 'feature'};
  assert.deepEqual(selectTarget(preview, repo, sha, [pr]), {kind: 'preview', sha, pr: 123});
  for (const change of [{state: 'closed'}, {head: {sha: 'b'.repeat(40)}},
    {base: {repo: {full_name: 'attacker/fork'}}}, {number: '123; command'}]) {
    assert.equal(selectTarget(preview, repo, sha, [{...pr, ...change}]), null);
  }
});

test('rejects counterfeit workflows, foreign repositories, failed builds and malformed SHAs', () => {
  for (const change of [{path: '.github/workflows/attacker.yml'},
    {repository: {full_name: 'attacker/fork'}}, {conclusion: 'failure'}, {head_sha: 'invalid'}]) {
    assert.equal(selectTarget({...run, ...change}, repo, sha, [pr]), null);
  }
});
