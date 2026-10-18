import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncShared } from '../scripts/sync-shared.mjs';
import { tempDir } from './helpers/fixture-repos.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['.git', 'node_modules', '.superpowers']);

function copyRepo() {
  const dest = tempDir('kbee-copy-');
  fs.cpSync(ROOT, dest, { recursive: true, filter: (src) => !SKIP.has(path.basename(src)) });
  return dest;
}

function tree(dir) {
  const out = {};
  const walk = (p) => {
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      const full = path.join(p, e.name);
      if (e.isDirectory()) walk(full);
      else out[path.relative(dir, full)] = fs.readFileSync(full, 'utf8');
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return out;
}

test('syncShared copies shared files into each skill with a generated header, idempotently', () => {
  const root = copyRepo();
  fs.mkdirSync(path.join(root, 'skills/dummy'), { recursive: true });
  fs.writeFileSync(path.join(root, 'skills/dummy/SKILL.md'), 'x');
  syncShared({ root });
  const ref = fs.readFileSync(path.join(root, 'skills/dummy/references/accuracy-rules.md'), 'utf8');
  assert.ok(ref.startsWith('<!-- generated from shared/references/accuracy-rules.md; edit the source, then run npm run sync -->'));
  assert.ok(fs.existsSync(path.join(root, 'skills/dummy/scripts/kbee-tool.mjs')));
  assert.ok(fs.existsSync(path.join(root, 'skills/dummy/templates/kb/README.md')));
  const first = tree(path.join(root, 'skills'));
  syncShared({ root });
  assert.deepEqual(tree(path.join(root, 'skills')), first);
});

test('syncShared removes stale generated files', () => {
  const root = copyRepo();
  fs.mkdirSync(path.join(root, 'skills/dummy/references'), { recursive: true });
  fs.writeFileSync(path.join(root, 'skills/dummy/references/old.md'), 'old');
  syncShared({ root });
  assert.ok(!fs.existsSync(path.join(root, 'skills/dummy/references/old.md')));
});

test('the committed skills are in sync with shared/', () => {
  const root = copyRepo();
  syncShared({ root });
  assert.deepEqual(tree(path.join(root, 'skills')), tree(path.join(ROOT, 'skills')), 'run npm run sync');
});
