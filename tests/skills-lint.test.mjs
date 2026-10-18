import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = path.join(ROOT, 'skills');

export function skillNames() {
  if (!fs.existsSync(SKILLS)) return [];
  return fs.readdirSync(SKILLS, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
}

// Single-line `key: value` frontmatter only (see CONTRIBUTING.md).
export function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return null;
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-z-]+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return { data: out, body: text.slice(m[0].length) };
}

for (const name of skillNames()) {
  test(`skill ${name} follows the Agent Skills format`, () => {
    const file = path.join(SKILLS, name, 'SKILL.md');
    assert.ok(fs.existsSync(file), 'SKILL.md missing');
    const text = fs.readFileSync(file, 'utf8');
    const fm = frontmatter(text);
    assert.ok(fm, 'frontmatter missing');
    assert.equal(fm.data.name, name, 'name must equal folder name');
    assert.match(name, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.ok(name.length <= 64);
    assert.ok(fm.data.description && fm.data.description.length <= 1024, 'description must be 1..1024 chars');
    assert.ok(fm.body.split('\n').length <= 500, 'body must be <= 500 lines');
    for (const [, link] of text.matchAll(/\]\(((?:references|templates|scripts)\/[^)#\s]+)\)/g)) {
      assert.ok(fs.existsSync(path.join(SKILLS, name, link)), `broken link ${link}`);
    }
  });
}

const EXPECTED_SKILLS = ['kbee-build', 'kbee-feature', 'kbee-init', 'kbee-kb', 'kbee-plan', 'kbee-review', 'kbee-ship', 'kbee-spec', 'kbee-sync'];

test('exactly the nine kbee skills ship', () => {
  assert.deepEqual(skillNames(), EXPECTED_SKILLS);
});

test('README shows the install command and the first skill to run', () => {
  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  assert.ok(readme.includes('npx skills add'));
  assert.ok(readme.includes('kbee-init'));
});

// Organization-specific terms that must never appear in this repo. Extend as needed.
const DENYLIST = ['example-corp'];

test('no tracked file mentions an organization-specific term', async () => {
  const { execFileSync } = await import('node:child_process');
  const files = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
  const self = path.relative(ROOT, fileURLToPath(import.meta.url)).split(path.sep).join('/');
  const hits = [];
  for (const f of files) {
    if (f === self || f.startsWith('docs/plans/')) continue; // plans quote this list
    const text = fs.readFileSync(path.join(ROOT, f), 'utf8').toLowerCase();
    for (const term of DENYLIST) if (text.includes(term)) hits.push(`${f}: ${term}`);
  }
  assert.deepEqual(hits, []);
});
