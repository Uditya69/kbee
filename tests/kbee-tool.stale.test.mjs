import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { staleness, setSynced, loadManifest, KbeeError } from '../shared/scripts/kbee-tool.mjs';
import { makeWorkspace, gitT, writeJson } from './helpers/fixture-repos.mjs';

// KB fact files (relative, sorted) whose text cites `repo@...:<path>`, or any path of repo when path is omitted.
function citing(kbDir, repo, file) {
  const out = [];
  const walk = (p) => {
    for (const e of fs.readdirSync(p, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(p, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.md') && new RegExp(`\\[${repo}@[0-9a-f]+:${file ?? '[^:\\]]+'}:`).test(fs.readFileSync(full, 'utf8'))) {
        out.push(path.relative(kbDir, full).split(path.sep).join('/'));
      }
    }
  };
  for (const f of ['system-map.md', 'repos', 'contracts', 'decisions']) {
    const full = path.join(kbDir, f);
    if (!fs.existsSync(full)) continue;
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (new RegExp(`\\[${repo}@[0-9a-f]+:${file ?? '[^:\\]]+'}:`).test(fs.readFileSync(full, 'utf8'))) out.push(f);
  }
  return out.sort();
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
  for (const r of staleness(ws.kbDir)) {
    assert.equal(r.status, 'fresh', r.name);
    assert.deepEqual(r.changedFiles, []);
    assert.equal(r.fetchFailed, false);
  }
});

test('an upstream edit marks the repo stale and lists the citing KB files', async () => {
  const ws = await makeWorkspace();
  pushUpstream(ws, 'shop-api', (d) => fs.appendFileSync(path.join(d, 'src/orders.ts'), 'export const d = 4;\n'));
  const r = byName(staleness(ws.kbDir))['shop-api'];
  assert.equal(r.status, 'stale');
  assert.ok(r.changedFiles.includes('src/orders.ts'));
  assert.deepEqual([...r.affectedKbFiles].sort(), citing(ws.kbDir, 'shop-api', 'src/orders.ts'));
  assert.ok(r.affectedKbFiles.includes('contracts/orders-api.md'));
  assert.ok(!r.affectedKbFiles.includes('repos/shop-types/overview.md'));
  assert.notEqual(r.currentSha, r.syncedSha);
});

test('without fetching, an unseen upstream edit still reads as fresh', async () => {
  const ws = await makeWorkspace();
  pushUpstream(ws, 'shop-api', (d) => fs.appendFileSync(path.join(d, 'src/orders.ts'), 'x\n'));
  assert.equal(byName(staleness(ws.kbDir, { fetch: false }))['shop-api'].status, 'fresh');
});

test('deleting a cited file upstream flags the citing KB file', async () => {
  const ws = await makeWorkspace();
  pushUpstream(ws, 'shop-api', (d) => fs.rmSync(path.join(d, 'src/orders.ts')));
  const r = byName(staleness(ws.kbDir))['shop-api'];
  assert.ok(r.changedFiles.includes('src/orders.ts'));
  assert.deepEqual([...r.affectedKbFiles].sort(), citing(ws.kbDir, 'shop-api', 'src/orders.ts'));
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
  const m = loadManifest(ws.kbDir);
  m.repos.find((r) => r.name === 'shop-api').syncedSha = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
  writeJson(path.join(ws.kbDir, 'manifest.json'), m);
  const r = byName(staleness(ws.kbDir))['shop-api'];
  assert.equal(r.status, 'stale');
  assert.deepEqual(r.changedFiles, ['*']);
  assert.deepEqual([...r.affectedKbFiles].sort(), citing(ws.kbDir, 'shop-api'));
  assert.ok(r.affectedKbFiles.includes('repos/shop-api/conventions.md'));
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
