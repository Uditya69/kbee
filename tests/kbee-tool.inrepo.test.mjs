import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseCitations, validateKb, showCitation, findKb, findForeignKbs, KbeeError } from '../shared/scripts/kbee-tool.mjs';
import { makeMonorepo, makeWorkspace, gitT, tempDir, writeJson } from './helpers/fixture-repos.mjs';

const problems = (kbDir) => validateKb(kbDir).errors.map((e) => e.problem);
const editManifest = (kbDir, fn) => {
  const file = path.join(kbDir, 'manifest.json');
  const m = JSON.parse(fs.readFileSync(file, 'utf8'));
  fn(m);
  writeJson(file, m);
};

test('parses commit-less citations', () => {
  const [c] = parseCitations('see [shop-api:apps/api/src/orders.ts:3-5]');
  assert.equal(c.kind, 'code');
  assert.equal(c.repo, 'shop-api');
  assert.equal(c.sha, null);
  assert.equal(c.path, 'apps/api/src/orders.ts');
  assert.equal(c.line, 3);
  assert.equal(c.endLine, 5);
  assert.equal(parseCitations('[source: user, 2026-10-26]')[0].kind, 'source');
  assert.equal(parseCitations('[shop-api@abc1234:src/a.ts:1]')[0].sha, 'abc1234');
});

test('validates an in-repo KB against the working tree', async () => {
  const { kbDir } = await makeMonorepo();
  assert.deepEqual(validateKb(kbDir).errors, []);
  const file = path.join(kbDir, 'contracts/orders-api.md');
  fs.appendFileSync(file, 'Far [shop-api:apps/api/src/orders.ts:9999]\nGone [shop-web:apps/web/src/nope.ts:1]\n');
  assert.deepEqual(problems(kbDir).sort(), ['FILE_NOT_FOUND', 'LINE_OUT_OF_RANGE']);
});

test('a commit-less citation in a separate KB is NEEDS_SHA', async () => {
  const { kbDir } = await makeWorkspace();
  fs.appendFileSync(path.join(kbDir, 'contracts/orders-api.md'), '\nX [shop-api:src/orders.ts:1]\n');
  assert.deepEqual(problems(kbDir), ['NEEDS_SHA']);
});

test("in-repo entries must share the KB's git root", async () => {
  const { ws, kbDir } = await makeMonorepo();
  const other = path.join(ws, 'other');
  fs.mkdirSync(other);
  gitT(other, ['init', '-q', '-b', 'main']);
  editManifest(kbDir, (m) => m.repos.push({ name: 'other', defaultBranch: 'main', pathHint: '../../other', syncedSha: null }));
  const errors = validateKb(kbDir).errors;
  assert.deepEqual(errors.map((e) => [e.file, e.problem, e.raw]), [['manifest.json', 'IN_REPO_SPLIT', 'other']]);
});

test('team docs must exist, and location must be known', async () => {
  const { kbDir } = await makeMonorepo();
  editManifest(kbDir, (m) => (m.teamDocs = ['use-cases/missing.md']));
  assert.deepEqual(validateKb(kbDir).errors.map((e) => [e.file, e.problem]), [['use-cases/missing.md', 'TEAM_DOC_MISSING']]);
  editManifest(kbDir, (m) => (m.location = 'cloud'));
  assert.throws(() => validateKb(kbDir), (e) => e instanceof KbeeError && e.code === 'MANIFEST_INVALID');
  editManifest(kbDir, (m) => ((m.location = 'in-repo'), (m.teamDocs = ['../escape.md'])));
  assert.throws(() => validateKb(kbDir), (e) => e instanceof KbeeError && e.code === 'MANIFEST_INVALID');
});

test('show reads commit-less citations from the working tree', async () => {
  const { kbDir } = await makeMonorepo();
  assert.match(showCitation(kbDir, 'shop-api:apps/api/src/orders.ts:1'), /^> 1 \|/m);
});

test('finds kb/ from inside a package', async () => {
  const { root, kbDir } = await makeMonorepo();
  assert.equal(findKb(path.join(root, 'apps/api/src')), kbDir);
  assert.deepEqual(findForeignKbs(root), []);
});

test('reports a hand-written kb/ as foreign, not as a KB', async () => {
  const { root } = await makeMonorepo({ withKb: false });
  fs.mkdirSync(path.join(root, 'kb/be'), { recursive: true });
  fs.writeFileSync(path.join(root, 'kb/README.md'), '# Our KB\n');
  fs.writeFileSync(path.join(root, 'kb/be/orders.md'), '# Orders\n');
  assert.equal(findKb(path.join(root, 'apps/api')), null);
  assert.deepEqual(findForeignKbs(path.join(root, 'apps/api')), [path.join(root, 'kb')]);
});

test('a folder with one Markdown file is not a foreign KB', async () => {
  const { root } = await makeMonorepo({ withKb: false });
  fs.mkdirSync(path.join(root, 'docs/architecture'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs/architecture/overview.md'), '# Overview\n');
  assert.deepEqual(findForeignKbs(root), []);
});
