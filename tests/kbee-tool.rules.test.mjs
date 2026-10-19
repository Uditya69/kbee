import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { rulesStatus, setRulesVersion, loadManifest, validateManifest, showCitation, RULES_VERSION } from '../shared/scripts/kbee-tool.mjs';
import { makeWorkspace, writeJson } from './helpers/fixture-repos.mjs';

test('the shipped rules version is at least 2 and has a changelog entry', () => {
  assert.ok(RULES_VERSION >= 2);
  const log = fs.readFileSync(new URL('../shared/references/rules-changelog.md', import.meta.url), 'utf8');
  assert.match(log, new RegExp(`^## v${RULES_VERSION}\\b`, 'm'));
});

test('validateManifest accepts an optional positive integer rulesVersion', () => {
  const base = { kbeeVersion: 1, mode: 'direct', repos: [] };
  assert.deepEqual(validateManifest(base), []);
  assert.deepEqual(validateManifest({ ...base, rulesVersion: 2 }), []);
  assert.ok(validateManifest({ ...base, rulesVersion: 0 }).includes('rulesVersion must be a positive integer'));
});

test('a KB without rulesVersion counts as v1 and is outdated, with the newer changelog entries', async () => {
  const { kbDir } = await makeWorkspace();
  const m = loadManifest(kbDir);
  delete m.rulesVersion;
  writeJson(path.join(kbDir, 'manifest.json'), m);
  const s = rulesStatus(kbDir);
  assert.equal(s.kbRulesVersion, 1);
  assert.equal(s.currentRulesVersion, RULES_VERSION);
  assert.equal(s.outdated, true);
  assert.equal(s.changes[0].version, 2);
  assert.match(s.changes[0].text, /data flow/i);
});

test('setRulesVersion records an upgrade and refuses to go backwards or past current', async () => {
  const { kbDir } = await makeWorkspace();
  setRulesVersion(kbDir, RULES_VERSION);
  assert.equal(rulesStatus(kbDir).outdated, false);
  assert.throws(() => setRulesVersion(kbDir, 1), (e) => e.code === 'RULES_BACKWARDS');
  assert.throws(() => setRulesVersion(kbDir, RULES_VERSION + 1), (e) => e.code === 'RULES_UNKNOWN');
});

test('show accepts a citation without square brackets', async () => {
  const { kbDir, repos } = await makeWorkspace();
  const sha = repos['shop-api'].sha.slice(0, 7);
  assert.equal(showCitation(kbDir, `shop-api@${sha}:src/orders.ts:2`, 0), showCitation(kbDir, `[shop-api@${sha}:src/orders.ts:2]`, 0));
});
