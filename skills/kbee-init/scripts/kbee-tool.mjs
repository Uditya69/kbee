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

// Never let git block on a credential prompt or a GUI sign-in.
export function gitEnv() {
  return { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' };
}

function gitRaw(cwd, args, { timeout } = {}) {
  return execFileSync('git', args, { cwd, env: gitEnv(), timeout, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
}

export function git(cwd, args, opts) {
  return gitRaw(cwd, args, opts).trim();
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
  const candidates = siblingKbs(rootDir);
  const listing = candidates.filter((kb) => listsRepo(kb, rootDir));
  if (listing.length === 1) return listing[0];
  if (listing.length === 0 && candidates.length === 1) return candidates[0];
  return null; // none, or ambiguous: the caller asks the user (see findKbCandidates)
}

function siblingKbs(rootDir) {
  const parent = path.dirname(rootDir);
  let entries;
  try {
    entries = fs.readdirSync(parent, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => path.join(parent, e.name))
    .filter((p) => p !== rootDir && isKb(p))
    .sort();
}

function listsRepo(kbDir, rootDir) {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(kbDir, 'manifest.json'), 'utf8'));
    let local = {};
    try {
      local = loadLocal(kbDir);
    } catch {}
    return manifest.repos.some((r) => {
      const p = path.resolve(kbDir, local.repos?.[r.name] ?? r.pathHint);
      return p === rootDir || p.startsWith(rootDir + path.sep);
    });
  } catch {
    return false;
  }
}

// Sibling KBs of the current git repo, for asking the user when findKb can't decide.
export function findKbCandidates(startDir) {
  const root = gitRoot(path.resolve(startDir));
  return root ? siblingKbs(path.resolve(root)) : [];
}

// [repo@sha:path:line] or [repo@sha:path:start-end]; [source: ...];
// anything else shaped like [x@y] is a malformed citation, reported rather than skipped.
const CITATION_RE = /\[([a-z0-9][a-z0-9._-]*)@([0-9a-f]{7,40}):([^\]:\s]+):(\d+)(?:-(\d+))?\]|\[source:\s*([^\]]+)\]|(\[[^\]\s]+@[^\]\s]+\])/g;
const GOOD_SOURCE_RE = /^(user, \d{4}-\d{2}-\d{2}|https?:\/\/\S+)$/;
const FACT_PATHS = ['system-map.md', 'repos', 'contracts', 'decisions'];

export function parseCitations(text) {
  const out = [];
  text.split(/\r?\n/).forEach((lineText, i) => {
    for (const m of lineText.matchAll(CITATION_RE)) {
      if (m[7] !== undefined) out.push({ kind: 'malformed', raw: m[0], lineNo: i + 1 });
      else if (m[6] !== undefined) out.push({ kind: 'source', value: m[6].trim(), raw: m[0], lineNo: i + 1 });
      else {
        const line = Number(m[4]);
        out.push({ kind: 'code', repo: m[1], sha: m[2], path: m[3], line, endLine: m[5] ? Number(m[5]) : line, raw: m[0], lineNo: i + 1 });
      }
    }
  });
  return out;
}

function fileLines(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

function readAt(kbDir, c) {
  const dir = resolveRepo(kbDir, c.repo);
  try {
    git(dir, ['cat-file', '-e', `${c.sha}^{commit}`]);
  } catch {
    throw new KbeeError('SHA_NOT_FOUND', `commit ${c.sha} not found in ${c.repo}`);
  }
  try {
    return fileLines(gitRaw(dir, ['show', `${c.sha}:${c.path}`]));
  } catch {
    throw new KbeeError('FILE_NOT_FOUND', `${c.path} not found in ${c.repo}@${c.sha}`);
  }
}

export function checkCitation(kbDir, c) {
  if (c.kind === 'malformed') return { ok: false, problem: 'BAD_CITATION' };
  if (c.kind === 'source') return GOOD_SOURCE_RE.test(c.value) ? { ok: true } : { ok: false, problem: 'BAD_SOURCE' };
  try {
    const lines = readAt(kbDir, c);
    if (c.line < 1 || c.endLine < c.line || c.endLine > lines.length) return { ok: false, problem: 'LINE_OUT_OF_RANGE' };
    return { ok: true };
  } catch (e) {
    if (e instanceof KbeeError) return { ok: false, problem: e.code };
    throw e;
  }
}

function factFiles(kbDir) {
  const out = [];
  const walk = (p) => {
    if (!fs.existsSync(p)) return;
    if (fs.statSync(p).isDirectory()) fs.readdirSync(p).sort().forEach((n) => walk(path.join(p, n)));
    else if (p.endsWith('.md')) out.push(p);
  };
  FACT_PATHS.forEach((f) => walk(path.join(kbDir, f)));
  return out;
}

const rel = (kbDir, file) => path.relative(kbDir, file).split(path.sep).join('/');

export function validateKb(kbDir) {
  loadManifest(kbDir);
  const errors = [];
  for (const file of factFiles(kbDir)) {
    for (const c of parseCitations(fs.readFileSync(file, 'utf8'))) {
      const r = checkCitation(kbDir, c);
      if (!r.ok) errors.push({ file: rel(kbDir, file), lineNo: c.lineNo, raw: c.raw, problem: r.problem });
    }
  }
  return { errors };
}

export function showCitation(kbDir, raw, context = 3) {
  const [c] = parseCitations(raw);
  if (!c || c.kind !== 'code') throw new KbeeError('BAD_CITATION', `not a code citation: ${raw}`);
  const lines = readAt(kbDir, c);
  const from = Math.max(1, c.line - context);
  const to = Math.min(lines.length, c.endLine + context);
  const width = String(to).length;
  const out = [];
  for (let n = from; n <= to; n++) {
    const mark = n >= c.line && n <= c.endLine ? '>' : ' ';
    out.push(`${mark} ${String(n).padStart(width)} | ${lines[n - 1]}`);
  }
  return out.join('\n') + '\n';
}

function revParse(dir, ref) {
  try {
    return git(dir, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
  } catch {
    return null;
  }
}

function citingFiles(kbDir, repo, changedFiles) {
  const all = changedFiles.includes('*');
  const changed = new Set(changedFiles);
  return factFiles(kbDir)
    .filter((file) => parseCitations(fs.readFileSync(file, 'utf8')).some((c) => c.kind === 'code' && c.repo === repo && (all || changed.has(c.path))))
    .map((file) => rel(kbDir, file));
}

export function staleness(kbDir, { fetch = true } = {}) {
  return loadManifest(kbDir).repos.map((r) => {
    const status = { name: r.name, syncedSha: r.syncedSha, currentSha: null, status: 'unknown', fetchFailed: false, changedFiles: [], affectedKbFiles: [] };
    let dir;
    try {
      dir = resolveRepo(kbDir, r.name);
    } catch (e) {
      if (e instanceof KbeeError && e.code === 'REPO_NOT_FOUND') return { ...status, status: 'missing' };
      throw e;
    }
    if (fetch) {
      try {
        git(dir, ['-c', 'credential.interactive=never', 'fetch', '--quiet', 'origin', r.defaultBranch], { timeout: 30000 });
      } catch {
        status.fetchFailed = true;
      }
    }
    status.currentSha = revParse(dir, `origin/${r.defaultBranch}`) ?? revParse(dir, r.defaultBranch);
    if (!status.currentSha) return status;
    const synced = r.syncedSha && revParse(dir, r.syncedSha);
    if (!synced) status.changedFiles = ['*'];
    else if (synced !== status.currentSha) {
      status.changedFiles = git(dir, ['diff', '--name-only', '--no-renames', synced, status.currentSha]).split('\n').filter(Boolean);
    }
    status.status = synced === status.currentSha ? 'fresh' : 'stale';
    status.affectedKbFiles = status.status === 'stale' ? citingFiles(kbDir, r.name, status.changedFiles) : [];
    return status;
  });
}

export function setSynced(kbDir, name, sha) {
  const manifest = loadManifest(kbDir);
  const repo = manifest.repos.find((r) => r.name === name);
  if (!repo) throw new KbeeError('REPO_UNKNOWN', `repo "${name}" is not in manifest.json`);
  const dir = resolveRepo(kbDir, name);
  const full = revParse(dir, sha);
  if (!full) throw new KbeeError('SHA_NOT_FOUND', `commit ${sha} not found in ${name}`);
  const previous = repo.syncedSha && revParse(dir, repo.syncedSha);
  if (previous) {
    try {
      git(dir, ['merge-base', '--is-ancestor', previous, full]);
    } catch {
      throw new KbeeError('SHA_NOT_DESCENDANT', `${name}: ${full} does not descend from the current syncedSha ${previous}; refusing to move the KB backwards (fetch first?)`);
    }
  }
  repo.syncedSha = full;
  repo.syncedAt = new Date().toISOString();
  fs.writeFileSync(path.join(kbDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

const COMMANDS = {
  stale: ([kbDir, ...flags]) => staleness(kbDir, { fetch: !flags.includes('--no-fetch') }),
  'set-synced': ([kbDir, name, sha]) => setSynced(kbDir, name, sha),
  find: ([dir = process.cwd()]) => ({ kbDir: findKb(dir), candidates: findKbCandidates(dir) }),
  resolve: ([kbDir, name]) => ({ path: resolveRepo(kbDir, name) }),
  validate: ([kbDir]) => {
    const result = validateKb(kbDir);
    if (result.errors.length) process.exitCode = 1;
    return result;
  },
  show: ([kbDir, raw, context]) => showCitation(kbDir, raw, context === undefined ? 3 : Number(context)),
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
    return process.exitCode ?? 0;
  } catch (e) {
    if (!(e instanceof KbeeError)) throw e;
    process.stdout.write(JSON.stringify({ error: { code: e.code, message: e.message } }) + '\n');
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
