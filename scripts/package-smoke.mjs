import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import path from 'node:path';
import { root } from './build-files.mjs';

const require = createRequire(import.meta.url);
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const file of ['index.js', 'index.min.js', 'index.cjs', 'index.min.cjs',
  'daracl.datetimepicker.umd.js', 'daracl.datetimepicker.min.umd.js',
  'daracl.datetimepicker.css', 'daracl.datetimepicker.min.css',
  'index.d.ts', 'types/DateTimePickerOptions.d.ts', 'types/Message.d.ts', 'index.html',
  'demo.css', 'demo.js', 'theme-vars.css']) {
  assert.ok(existsSync(path.join(root, 'dist', file)), `Missing output: ${file}`);
}
assert.ok(existsSync(path.join(root, pkg.exports['./umd'].import)));
for (const file of ['index.js', 'index.min.js', 'index.cjs', 'index.min.cjs',
  'daracl.datetimepicker.umd.js', 'daracl.datetimepicker.min.umd.js']) {
  const code = readFileSync(path.join(root, 'dist', file), 'utf8');
  const map = JSON.parse(readFileSync(path.join(root, 'dist', `${file}.map`), 'utf8'));
  assert.ok(map.sources.every(source => existsSync(path.resolve(root, 'dist', source))), `Invalid source map: ${file}`);
  assert.ok(code.includes(pkg.name), `Missing license banner: ${file}`);
  if (file.endsWith('.umd.js')) {
    const window = { Daracl: { existing: true } };
    runInNewContext(code, { window });
    assert.equal(window.Daracl.existing, true);
    assert.equal(typeof window.Daracl.dateTimePicker, 'function');
    assert.equal(window.Daracl.dateTimePicker.VERSION, pkg.version);
  } else {
    const mod = file.endsWith('.cjs') ? require(path.join(root, 'dist', file))
      : await import(new URL(`../dist/${file}`, import.meta.url));
    assert.equal(typeof mod.DateTimePicker, 'function');
    assert.equal(mod.DateTimePicker.VERSION, pkg.version);
  }
}
console.log('Package outputs, exports, UMD registration, source maps and banners verified.');
