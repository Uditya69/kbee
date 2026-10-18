#!/usr/bin/env node
// Copies shared/{references,scripts,templates} into every skills/<name>/ folder.
// skills.sh installs each skill folder on its own, so each one carries its own copy.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PARTS = ['references', 'scripts', 'templates'];

function copyTree(src, dest, relFromShared, written) {
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const from = path.join(src, e.name);
    const to = path.join(dest, e.name);
    const rel = `${relFromShared}/${e.name}`;
    if (e.isDirectory()) copyTree(from, to, rel, written);
    else {
      let content = fs.readFileSync(from);
      if (e.name.endsWith('.md')) {
        content = Buffer.concat([Buffer.from(`<!-- generated from shared/${rel}; edit the source, then run npm run sync -->\n`), content]);
      }
      fs.writeFileSync(to, content);
      written.push(to);
    }
  }
}

export function syncShared({ root }) {
  const shared = path.join(root, 'shared');
  const skillsDir = path.join(root, 'skills');
  const written = [];
  if (!fs.existsSync(skillsDir)) return { written };
  for (const e of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    for (const part of PARTS) {
      const dest = path.join(skillsDir, e.name, part);
      fs.rmSync(dest, { recursive: true, force: true });
      if (fs.existsSync(path.join(shared, part))) copyTree(path.join(shared, part), dest, part, written);
    }
  }
  return { written };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const { written } = syncShared({ root });
  console.log(`synced ${written.length} files`);
}
