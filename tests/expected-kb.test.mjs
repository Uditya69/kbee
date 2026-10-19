import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { validateKb, staleness } from '../shared/scripts/kbee-tool.mjs';
import { makeWorkspace, REPO_NAMES } from './helpers/fixture-repos.mjs';

test('the reference KB validates against the fixture repos and is fresh', async () => {
  const { kbDir } = await makeWorkspace();
  assert.ok(fs.existsSync(path.join(kbDir, 'system-map.md')), 'reference KB not copied');
  assert.deepEqual(validateKb(kbDir).errors, []);
  for (const r of staleness(kbDir, { fetch: false })) assert.equal(r.status, 'fresh', r.name);
});

test('the orders contract names producer and consumer with citations', async () => {
  const { kbDir } = await makeWorkspace();
  const text = fs.readFileSync(path.join(kbDir, 'contracts/orders-api.md'), 'utf8');
  assert.match(text, /producer[^\n]*shop-api[^\n]*\[shop-api@[0-9a-f]{7,40}:/i);
  assert.match(text, /consumer[^\n]*shop-web[^\n]*\[shop-web@[0-9a-f]{7,40}:/i);
});

test('the system map has a Mermaid diagram naming every repo', async () => {
  const { kbDir } = await makeWorkspace();
  const mermaid = fs.readFileSync(path.join(kbDir, 'system-map.md'), 'utf8').match(/```mermaid\n([\s\S]*?)```/);
  assert.ok(mermaid, 'no mermaid block');
  for (const name of REPO_NAMES) assert.ok(mermaid[1].includes(name), name);
});

test('the reference KB meets the current rules version', async () => {
  const { RULES_VERSION, rulesStatus } = await import('../shared/scripts/kbee-tool.mjs');
  const { kbDir } = await makeWorkspace();
  assert.equal(rulesStatus(kbDir).kbRulesVersion, RULES_VERSION);
  const read = (f) => fs.readFileSync(path.join(kbDir, f), 'utf8');
  assert.match(read('system-map.md'), /^## Common changes/m);
  for (const s of ['## Data flow and domain model', '## Scripts', '## Runtime model']) assert.ok(read('repos/shop-api/overview.md').includes(s), s);
  assert.match(read('contracts/orders-api.md'), /\| *Field *\|/, 'field-level shape table');
  assert.ok(fs.existsSync(path.join(kbDir, 'features/.gitkeep')));
});
