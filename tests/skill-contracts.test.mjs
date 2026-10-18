import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILLS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../skills');

// Behaviors each skill must state. Add a row (or phrases) for every new behavior.
const CONTRACTS = {};

for (const [name, phrases] of Object.entries(CONTRACTS)) {
  test(`skill ${name} states its required behaviors`, () => {
    const file = path.join(SKILLS, name, 'SKILL.md');
    assert.ok(fs.existsSync(file), `${name}/SKILL.md missing`);
    const text = fs.readFileSync(file, 'utf8').toLowerCase();
    const missing = phrases.filter((p) => !text.includes(p.toLowerCase()));
    assert.deepEqual(missing, [], `${name} is missing required phrases`);
  });
}
