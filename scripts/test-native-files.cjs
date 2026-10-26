const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

(async () => {
  const writes = [], opened = [], shared = [];
  let viewerError;
  const context = {
    exports: {},
    crypto: { randomUUID: () => 'unique-download' },
    FileReader: class {
      readAsDataURL() { this.result = 'data:application/pdf;base64,cGRm'; this.onload(); }
    },
    require(name) {
      if (name === '@capacitor/browser') return { Browser: {} };
      if (name === '@capacitor/filesystem') return {
        Directory: { Cache: 'CACHE' },
        Filesystem: { async writeFile(options) { writes.push(options); return { uri: 'file:///cache/lanis-share/test.pdf' }; } },
      };
      if (name === '@capacitor/share') return { Share: { async share(options) { shared.push(options); } } };
      assert.equal(name, './native');
      return { isAndroid: true, LanisNative: { async openFile(options) { opened.push(options); if (viewerError) throw viewerError; } } };
    },
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/platform/files.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  const blob = { type: 'application/pdf' };
  await context.exports.openBlob(blob, '../Arbeitsblatt.pdf');
  assert.equal(writes[0].directory, 'CACHE');
  assert.equal(writes[0].path, 'lanis-share/unique-download/.._Arbeitsblatt.pdf');
  assert.equal(writes[0].data, 'cGRm');
  assert.equal(opened[0].uri, 'file:///cache/lanis-share/test.pdf');
  assert.equal(opened[0].mimeType, 'application/pdf');
  assert.equal(shared.length, 0, 'Opening a supported file should launch its viewer');
  viewerError = { code: 'NO_FILE_VIEWER' };
  await context.exports.openBlob(blob, 'worksheet.pdf');
  assert.equal(shared.length, 1, 'A device without a viewer can still save or share the file');
  viewerError = new Error('write permission failure');
  await assert.rejects(context.exports.openBlob(blob, 'worksheet.pdf'), /permission failure/);
  assert.equal(shared.length, 1, 'Other errors must remain visible');
  await context.exports.saveBlob(blob, 'export.json');
  assert.equal(shared.length, 2, 'Exports keep the save/share flow');
  console.log('Android file opening regression checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
