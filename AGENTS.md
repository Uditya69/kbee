# Agent instructions for this repo

You're working on **kbee**, a set of Agent Skills for a multi-repo AI SDLC. Read [CONTRIBUTING.md](CONTRIBUTING.md) first. The rules that matter most:

- Edit `shared/` or `skills/*/SKILL.md` only. `skills/*/{references,scripts,templates}` are generated: run `npm run sync` after changing `shared/`.
- Run `npm test` before every commit, and keep it green.
- **Test first:**
  - For skill behavior, add phrases to `tests/skill-contracts.test.mjs` first.
  - For helper code, add a `node:test` case using `tests/helpers/fixture-repos.mjs` first.
- `shared/scripts/kbee-tool.mjs` stays dependency-free (Node 18 or later), and every command has a manual fallback documented in `shared/references/accuracy-rules.md`.
- Never add organization-specific names, URLs, or conventions. Use the "shop" example.
- The design lives in `docs/specs/`. If a change contradicts it, raise that, and don't silently diverge.
