import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseCitations, checkCitation, validateKb, showCitation } from '../shared/scripts/kbee-tool.mjs';
import { makeWorkspace, gitT } from './helpers/fixture-repos.mjs';

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

test('parseCitations reads single-line and range code citations', () => {
  const [c] = parseCitations('x [shop-api@a1b2c3d:src/orders.ts:42] y');
  assert.equal(c.kind, 'code');
  assert.equal(c.repo, 'shop-api');
  assert.equal(c.sha, 'a1b2c3d');
  assert.equal(c.path, 'src/orders.ts');
  assert.equal(c.line, 42);
  assert.equal(c.endLine, 42);
  assert.equal(c.lineNo, 1);
  assert.equal(parseCitations('[shop-api@a1b2c3d:src/orders.ts:10-20]')[0].endLine, 20);
});

test('parseCitations reads source citations and reports their line numbers', () => {
  const cs = parseCitations('a\n[source: user, 2026-10-18]\n[source: https://example.com/pr/1]');
  assert.deepEqual(cs.map((c) => [c.kind, c.lineNo]), [['source', 2], ['source', 3]]);
});

test('a malformed source parses but fails the check with BAD_SOURCE', async () => {
  const { kbDir } = await makeWorkspace();
  const [c] = parseCitations('[source: someone said]');
  assert.equal(c.kind, 'source');
  assert.deepEqual(checkCitation(kbDir, c), { ok: false, problem: 'BAD_SOURCE' });
});

test('uppercase and 6-char SHAs are not citations', () => {
  assert.equal(parseCitations('[shop-api@A1B2C3D:src/a.ts:1] [shop-api@a1b2c3:src/a.ts:1]').length, 0);
});

test('checkCitation accepts a real line and rejects bad file, line and sha', async () => {
  const { kbDir, repos } = await makeWorkspace();
  const sha = repos['shop-api'].sha.slice(0, 7);
  const check = (s) => checkCitation(kbDir, parseCitations(s)[0]);
  assert.deepEqual(check(`[shop-api@${sha}:src/orders.ts:2]`), { ok: true });
  assert.deepEqual(check(`[shop-api@${sha}:src/missing.ts:2]`), { ok: false, problem: 'FILE_NOT_FOUND' });
  assert.deepEqual(check(`[shop-api@${sha}:src/orders.ts:9999]`), { ok: false, problem: 'LINE_OUT_OF_RANGE' });
  assert.deepEqual(check(`[shop-api@deadbee:src/orders.ts:2]`), { ok: false, problem: 'SHA_NOT_FOUND' });
  assert.deepEqual(check(`[nope@${sha}:src/orders.ts:2]`), { ok: false, problem: 'REPO_UNKNOWN' });
});

test('CRLF files count lines correctly', async () => {
  const { kbDir, repos } = await makeWorkspace();
  const dir = repos['shop-api'].dir;
  fs.writeFileSync(path.join(dir, 'crlf.txt'), 'a\r\nb\r\nc\r\n');
  gitT(dir, ['-c', 'core.autocrlf=false', 'add', 'crlf.txt']);
  gitT(dir, ['commit', '-q', '-m', 'crlf']);
  const sha = gitT(dir, ['rev-parse', 'HEAD']);
  const check = (n) => checkCitation(kbDir, parseCitations(`[shop-api@${sha}:crlf.txt:${n}]`)[0]);
  assert.deepEqual(check(3), { ok: true });
  assert.deepEqual(check(4), { ok: false, problem: 'LINE_OUT_OF_RANGE' });
});

test('validateKb reports exactly the bad citation with file and line, and ignores features/', async () => {
  const { kbDir, repos } = await makeWorkspace();
  const sha = repos['shop-api'].sha.slice(0, 7);
  write(path.join(kbDir, 'repos/shop-api/overview.md'), `# shop-api\n\nGood [shop-api@${sha}:src/orders.ts:1].\nBad [shop-api@${sha}:src/orders.ts:50].\n`);
  write(path.join(kbDir, 'features/x/spec.md'), `[shop-api@${sha}:src/nothing.ts:1]\n`);
  const { errors } = validateKb(kbDir);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].file, 'repos/shop-api/overview.md');
  assert.equal(errors[0].lineNo, 4);
  assert.equal(errors[0].problem, 'LINE_OUT_OF_RANGE');
});

test('showCitation prints numbered context with the cited line marked', async () => {
  const { kbDir, repos } = await makeWorkspace();
  const sha = repos['shop-api'].sha.slice(0, 7);
  const out = showCitation(kbDir, `[shop-api@${sha}:src/orders.ts:2]`, 1);
  assert.match(out, /> 2 \| export const b = 2;/);
  assert.match(out, /  1 \| export const a = 1;/);
});
