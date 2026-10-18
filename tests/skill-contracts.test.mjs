import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILLS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../skills');

// Behaviors each skill must state. Add a row (or phrases) for every new behavior.
const CONTRACTS = {
  'kbee-init': ['existing KB', 'repo links', 'one summary', 'before pushing', 'pointer', 'only with permission', 'subagents', 'current model', 'references/accuracy-rules.md', 'references/approval-rules.md', 'kbee-tool.mjs validate', 'If Node is not available'],
  'kbee-sync': ['default branch', 'pending.md', 'merged', 'affectedKbFiles', 'show the proposed change', 'gaps.md', 'set-synced', 'without asking'],
  'kbee-kb': ['ask', 'expand', 'fix', 'add a repo', 'cite', 'approval', "I don't know"],
  'kbee-spec': ['read the KB first', 'acceptance criteria', 'affected repos', 'status.json', 'slug'],
  'kbee-plan': ['approved.spec', 'per repo', 'dependency order', 'contracts', 'test', 'status.json'],
  'kbee-build': ['read the KB first', 'approved.plan', 'failing test', 'kbee/<slug>', 'resolve', 'one repo at a time'],
  'kbee-review': ['read the KB first', 'contracts', 'consumers', 'review.md', 'blocking'],
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
