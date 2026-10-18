// Builds a throwaway workspace: one git repo (+ bare origin) per shop fixture,
// and a sibling KB dir `shop-kb` with a valid manifest.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const REPO_NAMES = ['shop-api', 'shop-web', 'shop-types'];
const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../examples/fixtures');

export function gitT(cwd, args) {
  return execFileSync('git', ['-c', 'user.name=kbee-test', '-c', 'user.email=test@example.com', ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

export function tempDir(prefix = 'kbee-') {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
}

export function writeJson(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n');
}

export async function makeWorkspace() {
  const root = tempDir('kbee-ws-');
  const repos = {};
  for (const name of REPO_NAMES) {
    const dir = path.join(root, name);
    const src = path.join(FIXTURES, name);
    if (fs.existsSync(src)) fs.cpSync(src, dir, { recursive: true });
    else {
      fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'src', 'orders.ts'), 'export const a = 1;\nexport const b = 2;\nexport const c = 3;\n');
    }
    gitT(dir, ['init', '-q', '-b', 'main']);
    gitT(dir, ['add', '-A']);
    gitT(dir, ['commit', '-q', '-m', 'initial']);
    const origin = path.join(root, '.origins', `${name}.git`);
    fs.mkdirSync(path.dirname(origin), { recursive: true });
    gitT(root, ['clone', '-q', '--bare', dir, origin]);
    gitT(dir, ['remote', 'add', 'origin', origin]);
    gitT(dir, ['fetch', '-q', 'origin']);
    repos[name] = { dir, origin, sha: gitT(dir, ['rev-parse', 'HEAD']) };
  }
  const kbDir = path.join(root, 'shop-kb');
  writeJson(path.join(kbDir, 'manifest.json'), {
    kbeeVersion: 1,
    mode: 'direct',
    repos: REPO_NAMES.map((name) => ({
      name,
      url: `https://example.com/shop/${name}.git`,
      defaultBranch: 'main',
      pathHint: `../${name}`,
      syncedSha: repos[name].sha,
      syncedAt: '2026-10-18T00:00:00.000Z',
    })),
  });
  return { root, kbDir, repos };
}
