#!/usr/bin/env node
// kbee-tool: optional helper for kbee skills. Node >= 18, no dependencies.
// Every command has a manual fallback described in references/accuracy-rules.md.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export class KbeeError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const NAME_RE = /^[a-z0-9][a-z0-9._-]*$/;

export function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }).trim();
}

export function validateManifest(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return ['manifest must be a JSON object'];
  if (obj.kbeeVersion !== 1) errors.push('kbeeVersion must be 1');
  if (obj.mode !== undefined && obj.mode !== 'direct' && obj.mode !== 'pr') errors.push("mode must be 'direct' or 'pr'");
  if (!Array.isArray(obj.repos)) return [...errors, 'repos must be an array'];
  const seen = new Set();
  obj.repos.forEach((r, i) => {
    if (!r || typeof r !== 'object') return errors.push(`repos[${i}] must be an object`);
    if (!r.name) errors.push(`repos[${i}].name is required`);
    else if (!NAME_RE.test(r.name)) errors.push(`repos[${i}].name must match ${NAME_RE}`);
    else if (seen.has(r.name)) errors.push(`duplicate repo name: ${r.name}`);
    else seen.add(r.name);
    for (const key of ['defaultBranch', 'pathHint']) {
      if (typeof r[key] !== 'string' || !r[key]) errors.push(`repos[${i}].${key} is required`);
    }
    if (r.syncedSha != null && !/^[0-9a-f]{7,40}$/.test(r.syncedSha)) errors.push(`repos[${i}].syncedSha must be a hex commit SHA or null`);
  });
  return errors;
}

export function loadManifest(kbDir) {
  const file = path.join(kbDir, 'manifest.json');
  if (!fs.existsSync(file)) throw new KbeeError('MANIFEST_MISSING', `no manifest.json in ${kbDir}`);
  let obj;
  try {
    obj = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new KbeeError('MANIFEST_INVALID', `manifest.json is not valid JSON: ${e.message}`);
  }
  const errors = validateManifest(obj);
  if (errors.length) throw new KbeeError('MANIFEST_INVALID', `manifest.json is invalid: ${errors.join('; ')}`);
  return obj;
}

function loadLocal(kbDir) {
  const file = path.join(kbDir, '.kbee.local.json');
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new KbeeError('LOCAL_INVALID', `.kbee.local.json is not valid JSON: ${e.message}`);
  }
}

export function resolveRepo(kbDir, name) {
  const repo = loadManifest(kbDir).repos.find((r) => r.name === name);
  if (!repo) throw new KbeeError('REPO_UNKNOWN', `repo "${name}" is not in manifest.json`);
  const tried = [];
  const override = loadLocal(kbDir).repos?.[name];
  if (override) tried.push(path.resolve(kbDir, override));
  tried.push(path.resolve(kbDir, repo.pathHint));
  const found = tried.find((p) => fs.existsSync(p));
  if (!found) throw new KbeeError('REPO_NOT_FOUND', `repo "${name}" not found locally; tried: ${tried.join(', ')}`);
  return found;
}

function isKb(dir) {
  try {
    return validateManifest(JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'))).length === 0;
  } catch {
    return false;
  }
}

function gitRoot(dir) {
  try {
    return git(dir, ['rev-parse', '--show-toplevel']);
  } catch {
    return null;
  }
}

const POINTER_RE = /<!-- kbee:start -->[\s\S]*?kbee-kb-path:\s*(\S+)[\s\S]*?<!-- kbee:end -->/;

export function findKb(startDir) {
  const start = path.resolve(startDir);
  for (let d = start; ; d = path.dirname(d)) {
    if (isKb(d)) return d;
    if (path.dirname(d) === d) break;
  }
  const root = gitRoot(start);
  if (!root) return null;
  const rootDir = path.resolve(root);
  for (const f of ['AGENTS.md', 'CLAUDE.md']) {
    const file = path.join(rootDir, f);
    if (!fs.existsSync(file)) continue;
    const m = fs.readFileSync(file, 'utf8').match(POINTER_RE);
    if (m) {
      const p = path.resolve(rootDir, m[1]);
      if (isKb(p)) return p;
    }
  }
  const parent = path.dirname(rootDir);
  for (const entry of fs.readdirSync(parent, { withFileTypes: true })) {
    const p = path.join(parent, entry.name);
    if (entry.isDirectory() && p !== rootDir && isKb(p)) return p;
  }
  return null;
}

const COMMANDS = {
  find: ([dir = process.cwd()]) => ({ kbDir: findKb(dir) }),
  resolve: ([kbDir, name]) => ({ path: resolveRepo(kbDir, name) }),
};

function main(argv) {
  const [cmd, ...args] = argv;
  const fn = COMMANDS[cmd];
  if (!fn) {
    process.stdout.write(JSON.stringify({ error: { code: 'USAGE', message: `usage: kbee-tool <${Object.keys(COMMANDS).join('|')}> ...` } }) + '\n');
    return 1;
  }
  try {
    const out = fn(args);
    process.stdout.write(typeof out === 'string' ? out : JSON.stringify(out, null, 2) + '\n');
    return 0;
  } catch (e) {
    if (!(e instanceof KbeeError)) throw e;
    process.stdout.write(JSON.stringify({ error: { code: e.code, message: e.message } }) + '\n');
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
