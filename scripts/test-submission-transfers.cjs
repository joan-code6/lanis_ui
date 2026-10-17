const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
const axios = require('axios');

// Exercise the real courses API methods through Axios' config merging and body
// transformation, with an adapter that captures requests instead of sending them.
const source = ts.createSourceFile('api.ts', fs.readFileSync('src/services/api.ts', 'utf8'), ts.ScriptTarget.Latest, true);
const courses = source.statements.find(statement => ts.isVariableStatement(statement)
  && statement.declarationList.declarations.some(declaration => declaration.name.getText(source) === 'coursesAPI'));
assert(courses, 'Expected the courses API export');
const compiled = ts.transpileModule(courses.getText(source), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function captureClient(data = { success: true, files: [] }) {
  const requests = [];
  const apiClient = axios.create({
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
    adapter: async config => {
      requests.push(config);
      return { data, status: 200, statusText: 'OK', headers: {}, config };
    },
  });
  const loaded = { exports: {} };
  vm.runInNewContext(compiled, { module: loaded, exports: loaded.exports, apiClient, FormData, URLSearchParams });
  return { api: loaded.exports.coursesAPI, requests };
}

const detail = { course_id: '42', entry_id: '7', upload_id: '9' };

test('submission uploads preserve multipart bytes without the ordinary request deadline', async () => {
  const { api, requests } = captureClient();
  const controller = new AbortController();
  await api.uploadSubmissionFiles('test-token', detail,
    [new File(['original file bytes'], 'Prüfung.pdf', { type: 'application/pdf' })], controller.signal);
  const request = requests[0];
  assert.equal(request.url, '/meinunterricht/submissions/upload');
  assert.equal(request.timeout, 0);
  assert.equal(request.signal, controller.signal);
  assert.equal(request.headers.get('X-Session-Token'), 'test-token');
  assert(request.data instanceof FormData);
  for (const [key, value] of Object.entries(detail)) assert.equal(request.data.get(key), value);
  const uploaded = request.data.getAll('files');
  assert.equal(uploaded.length, 1);
  assert.equal(uploaded[0].name, 'Prüfung.pdf');
  assert.equal(await uploaded[0].text(), 'original file bytes');
  await api.getSubmissions('test-token');
  assert.equal(requests[1].timeout, 30000, 'Ordinary reads keep their existing deadline');
});

test('submission uploads remain cancellable before sending a request', async () => {
  const { api, requests } = captureClient();
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(api.uploadSubmissionFiles('test-token', detail,
    [new File(['pdf'], 'work.pdf')], controller.signal), error => axios.isCancel(error));
  assert.equal(requests.length, 0);
});


test('submission downloads preserve blob data without the ordinary request deadline', async () => {
  const blob = new Blob(['downloaded file bytes'], { type: 'application/pdf' });
  const { api, requests } = captureClient(blob);
  const controller = new AbortController();
  const result = await api.downloadSubmissionFile('test-token', 'file/ref?value=1', controller.signal);
  const request = requests[0];
  assert.equal(request.url, '/meinunterricht/submissions/file/file%2Fref%3Fvalue%3D1');
  assert.equal(request.timeout, 0);
  assert.equal(request.signal, controller.signal);
  assert.equal(request.responseType, 'blob');
  assert.equal(request.headers.get('X-Session-Token'), 'test-token');
  assert.equal(result, blob);
  assert.equal(await result.text(), 'downloaded file bytes');
});

test('submission downloads remain cancellable before sending a request', async () => {
  const { api, requests } = captureClient();
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(api.downloadSubmissionFile('test-token', 'ref', controller.signal),
    error => axios.isCancel(error));
  assert.equal(requests.length, 0);
});
