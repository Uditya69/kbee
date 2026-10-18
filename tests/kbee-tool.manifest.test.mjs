import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadManifest, validateManifest, resolveRepo, findKb } from '../shared/scripts/kbee-tool.mjs';
import { makeWorkspace, tempDir, writeJson } from './helpers/fixture-repos.mjs';

const TOOL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shared/scripts/kbee-tool.mjs');

const repo = (o = {}) => ({ name: 'shop-api', url: 'u', defaultBranch: 'main', pathHint: '../shop-api', syncedSha: null, syncedAt: null, ...o });

test('loadManifest throws MANIFEST_MISSING when there is no manifest', () => {
  assert.throws(() => loadManifest(tempDir()), (e) => e.code === 'MANIFEST_MISSING');
});

test('loadManifest throws MANIFEST_INVALID with the parse message on broken JSON', () => {
  const dir = tempDir();
  fs.writeFileSync(path.join(dir, 'manifest.json'), '{"kbeeVersion":1,');
  let msg = '';
  try { JSON.parse('{"kbeeVersion":1,'); } catch (e) { msg = e.message; }
  assert.throws(() => loadManifest(dir), (e) => e.code === 'MANIFEST_INVALID' && e.message.includes(msg));
});

test('validateManifest reports version, missing name, duplicate and bad names', () => {
  assert.ok(validateManifest({ kbeeVersion: 2, mode: 'direct', repos: [] }).includes('kbeeVersion must be 1'));
  assert.ok(validateManifest({ kbeeVersion: 1, mode: 'direct', repos: [repo({ name: undefined })] }).includes('repos[0].name is required'));
  assert.ok(validateManifest({ kbeeVersion: 1, mode: 'direct', repos: [repo(), repo()] }).includes('duplicate repo name: shop-api'));
  assert.ok(validateManifest({ kbeeVersion: 1, mode: 'direct', repos: [repo({ name: 'Shop API' })] }).includes('repos[0].name must match /^[a-z0-9][a-z0-9._-]*$/'));
  assert.deepEqual(validateManifest({ kbeeVersion: 1, mode: 'direct', repos: [repo()] }), []);
});

test('resolveRepo uses pathHint relative to the KB', async () => {
  const { kbDir } = await makeWorkspace();
  assert.equal(resolveRepo(kbDir, 'shop-api'), path.resolve(kbDir, '../shop-api'));
});

test('.kbee.local.json overrides pathHint', async () => {
  const { kbDir } = await makeWorkspace();
  const other = tempDir();
  writeJson(path.join(kbDir, '.kbee.local.json'), { repos: { 'shop-api': other } });
  assert.equal(resolveRepo(kbDir, 'shop-api'), other);
});

test('resolveRepo throws REPO_UNKNOWN and REPO_NOT_FOUND listing paths tried', async () => {
  const { kbDir, repos } = await makeWorkspace();
  assert.throws(() => resolveRepo(kbDir, 'nope'), (e) => e.code === 'REPO_UNKNOWN');
  fs.rmSync(repos['shop-web'].dir, { recursive: true, force: true });
  assert.throws(() => resolveRepo(kbDir, 'shop-web'), (e) => e.code === 'REPO_NOT_FOUND' && e.message.includes(path.resolve(kbDir, '../shop-web')));
});

test('findKb finds the KB from itself and from a subfolder', async () => {
  const { kbDir } = await makeWorkspace();
  fs.mkdirSync(path.join(kbDir, 'repos'));
  assert.equal(findKb(kbDir), kbDir);
  assert.equal(findKb(path.join(kbDir, 'repos')), kbDir);
});

test('findKb follows the pointer block in a code repo AGENTS.md', async () => {
  const { root, kbDir, repos } = await makeWorkspace();
  const moved = path.join(root, 'elsewhere', 'kb');
  fs.mkdirSync(path.dirname(moved), { recursive: true });
  fs.renameSync(kbDir, moved);
  fs.writeFileSync(path.join(repos['shop-api'].dir, 'AGENTS.md'), '# Agents\n\n<!-- kbee:start -->\nkbee-kb-path: ../elsewhere/kb\n<!-- kbee:end -->\n');
  assert.equal(findKb(path.join(repos['shop-api'].dir, 'src')), moved);
});

test('findKb falls back to a sibling KB, and returns null when none exists', async () => {
  const { kbDir, repos } = await makeWorkspace();
  assert.equal(findKb(repos['shop-web'].dir), kbDir);
  assert.equal(findKb(tempDir()), null);
});

test('CLI resolve prints a JSON error and exits 1 for an unknown repo', async () => {
  const { kbDir } = await makeWorkspace();
  let out;
  try {
    execFileSync(process.execPath, [TOOL, 'resolve', kbDir, 'nope'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    assert.fail('expected exit 1');
  } catch (e) {
    assert.equal(e.status, 1);
    out = JSON.parse(e.stdout);
  }
  assert.equal(out.error.code, 'REPO_UNKNOWN');
});
