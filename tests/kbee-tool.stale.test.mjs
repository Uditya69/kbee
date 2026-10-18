import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { staleness, setSynced, loadManifest, KbeeError } from '../shared/scripts/kbee-tool.mjs';
import { makeWorkspace, gitT, writeJson } from './helpers/fixture-repos.mjs';

// The reference KB arrives in Task 5; each test writes its own cited file.
function citeOrders(kbDir, sha) {
  const file = path.join(kbDir, 'repos/shop-api/overview.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `Orders live in [shop-api@${sha.slice(0, 7)}:src/orders.ts:1].\n`);
  const other = path.join(kbDir, 'repos/shop-web/overview.md');
  fs.mkdirSync(path.dirname(other), { recursive: true });
  fs.writeFileSync(other, 'No citations of shop-api here.\n');
}

function pushUpstream(ws, name, edit) {
  const clone = path.join(ws.root, `.clone-${name}`);
  gitT(ws.root, ['clone', '-q', ws.repos[name].origin, clone]);
  edit(clone);
  gitT(clone, ['add', '-A']);
  gitT(clone, ['commit', '-q', '-m', 'upstream change']);
  gitT(clone, ['push', '-q', 'origin', 'main']);
}

const byName = (list) => Object.fromEntries(list.map((r) => [r.name, r]));

test('a fresh workspace is fresh everywhere', async () => {
  const ws = await makeWorkspace();
  citeOrders(ws.kbDir, ws.repos['shop-api'].sha);
  for (const r of staleness(ws.kbDir)) {
    assert.equal(r.status, 'fresh', r.name);
    assert.deepEqual(r.changedFiles, []);
    assert.equal(r.fetchFailed, false);
  }
});

test('an upstream edit marks the repo stale and lists the citing KB files', async () => {
  const ws = await makeWorkspace();
  citeOrders(ws.kbDir, ws.repos['shop-api'].sha);
  pushUpstream(ws, 'shop-api', (d) => fs.appendFileSync(path.join(d, 'src/orders.ts'), 'export const d = 4;\n'));
  const r = byName(staleness(ws.kbDir))['shop-api'];
  assert.equal(r.status, 'stale');
  assert.ok(r.changedFiles.includes('src/orders.ts'));
  assert.deepEqual(r.affectedKbFiles, ['repos/shop-api/overview.md']);
  assert.notEqual(r.currentSha, r.syncedSha);
});

test('without fetching, an unseen upstream edit still reads as fresh', async () => {
  const ws = await makeWorkspace();
  citeOrders(ws.kbDir, ws.repos['shop-api'].sha);
  pushUpstream(ws, 'shop-api', (d) => fs.appendFileSync(path.join(d, 'src/orders.ts'), 'x\n'));
  assert.equal(byName(staleness(ws.kbDir, { fetch: false }))['shop-api'].status, 'fresh');
});

test('deleting a cited file upstream flags the citing KB file', async () => {
  const ws = await makeWorkspace();
  citeOrders(ws.kbDir, ws.repos['shop-api'].sha);
  pushUpstream(ws, 'shop-api', (d) => fs.rmSync(path.join(d, 'src/orders.ts')));
  const r = byName(staleness(ws.kbDir))['shop-api'];
  assert.ok(r.changedFiles.includes('src/orders.ts'));
  assert.deepEqual(r.affectedKbFiles, ['repos/shop-api/overview.md']);
});

test('a missing repo dir reports missing instead of throwing', async () => {
  const ws = await makeWorkspace();
  fs.rmSync(ws.repos['shop-web'].dir, { recursive: true, force: true });
  assert.equal(byName(staleness(ws.kbDir))['shop-web'].status, 'missing');
});

test('no origin remote falls back to the local branch and flags fetchFailed', async () => {
  const ws = await makeWorkspace();
  const dir = ws.repos['shop-api'].dir;
  gitT(dir, ['remote', 'remove', 'origin']);
  fs.appendFileSync(path.join(dir, 'src/orders.ts'), 'x\n');
  gitT(dir, ['commit', '-q', '-am', 'local']);
  const r = byName(staleness(ws.kbDir))['shop-api'];
  assert.equal(r.status, 'stale');
  assert.equal(r.fetchFailed, true);
});

test('a synced SHA missing locally means stale with every citing file affected', async () => {
  const ws = await makeWorkspace();
  citeOrders(ws.kbDir, ws.repos['shop-api'].sha);
  const m = loadManifest(ws.kbDir);
  m.repos.find((r) => r.name === 'shop-api').syncedSha = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
  writeJson(path.join(ws.kbDir, 'manifest.json'), m);
  const r = byName(staleness(ws.kbDir))['shop-api'];
  assert.equal(r.status, 'stale');
  assert.deepEqual(r.changedFiles, ['*']);
  assert.deepEqual(r.affectedKbFiles, ['repos/shop-api/overview.md']);
});

test('setSynced updates the manifest and rejects unknown SHAs', async () => {
  const ws = await makeWorkspace();
  const dir = ws.repos['shop-api'].dir;
  fs.appendFileSync(path.join(dir, 'src/orders.ts'), 'x\n');
  gitT(dir, ['commit', '-q', '-am', 'next']);
  const sha = gitT(dir, ['rev-parse', 'HEAD']);
  setSynced(ws.kbDir, 'shop-api', sha);
  const repo = loadManifest(ws.kbDir).repos.find((r) => r.name === 'shop-api');
  assert.equal(repo.syncedSha, sha);
  assert.ok(!Number.isNaN(Date.parse(repo.syncedAt)));
  assert.ok(fs.readFileSync(path.join(ws.kbDir, 'manifest.json'), 'utf8').endsWith('}\n'));
  assert.throws(() => setSynced(ws.kbDir, 'shop-api', 'deadbee'), (e) => e instanceof KbeeError && e.code === 'SHA_NOT_FOUND');
});
