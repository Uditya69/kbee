import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILLS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../skills');

// Behaviors each skill must state. Add a row (or phrases) for every new behavior.
const CONTRACTS = {
  'kbee-init': ['existing KB', 'repo links', 'one summary', 'before pushing', 'pointer', 'only with permission', 'subagents', 'current model', 'references/accuracy-rules.md', 'references/approval-rules.md', 'kbee-tool.mjs validate', 'If Node is not available'],
  'kbee-sync': ['leave that repo stale', 'before showing', "don't write facts or run set-synced", 'commit the KB', 'default branch', 'pending.md', 'merged', 'affectedKbFiles', 'show the proposed change', 'gaps.md', 'set-synced', 'without asking'],
  'kbee-kb': ['add it to manifest.json before verifying', 'ask', 'expand', 'fix', 'add a repo', 'cite', 'approval', "I don't know"],
  'kbee-spec': ['read the KB first', 'acceptance criteria', 'affected repos', 'status.json', 'slug'],
  'kbee-plan': ['approved.spec', 'per repo', 'dependency order', 'contracts', 'test', 'status.json'],
  'kbee-build': ['commit the KB', 'read the KB first', 'approved.plan', 'failing test', 'kbee/<slug>', 'resolve', 'one repo at a time'],
  'kbee-review': ['commit the KB', 'read the KB first', 'contracts', 'consumers', 'review.md', 'blocking'],
  'kbee-ship': ['read the KB first', 'ask before pushing', 'cross-link', 'gh', 'PR descriptions', 'status.json'],
  'kbee-feature': ['pause', 'after Spec', 'after Plan', 'resume', 'status.json', 'kbee-spec', 'kbee-plan', 'kbee-build', 'kbee-review', 'kbee-ship', 'kbee-sync', 'no KB'],
};

for (const [name, phrases] of Object.entries(CONTRACTS)) {
  test(`skill ${name} states its required behaviors`, () => {
    const file = path.join(SKILLS, name, 'SKILL.md');
    assert.ok(fs.existsSync(file), `${name}/SKILL.md missing`);
    const text = fs.readFileSync(file, 'utf8').toLowerCase();
    const missing = phrases.filter((p) => !text.includes(p.toLowerCase()));
    assert.deepEqual(missing, [], `${name} is missing required phrases`);
  });
}

// Shared reference docs carry rules every skill depends on.
const SHARED = path.resolve(SKILLS, '../shared/references');
const SHARED_CONTRACTS = {
  'accuracy-rules.md': ['relative to the git root', '--no-renames'],
};

for (const [file, phrases] of Object.entries(SHARED_CONTRACTS)) {
  test(`shared ${file} states its required rules`, () => {
    const text = fs.readFileSync(path.join(SHARED, file), 'utf8').toLowerCase();
    assert.deepEqual(phrases.filter((p) => !text.includes(p.toLowerCase())), []);
  });
}

test('skills call the helper by its skill-relative path', () => {
  const offenders = fs.readdirSync(SKILLS).filter((name) => {
    const file = path.join(SKILLS, name, 'SKILL.md');
    return fs.existsSync(file) && /node scripts\/kbee-tool\.mjs/.test(fs.readFileSync(file, 'utf8'));
  });
  assert.deepEqual(offenders, []);
});
