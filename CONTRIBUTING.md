# Contributing to kbee

Thanks for helping! kbee is a set of [Agent Skills](https://agentskills.io) plus a small, optional Node helper.

## Layout

```
shared/        # the single source of truth for rules, templates, and the helper
  references/  # accuracy, approval, KB layout, KB discovery
  scripts/     # kbee-tool.mjs (Node >= 18, no dependencies)
  templates/   # files written into new KBs and code repos
skills/        # one folder per skill; each SKILL.md is hand-written
  kbee-*/references|scripts|templates   # GENERATED copies of shared/; don't edit
scripts/sync-shared.mjs                 # regenerates those copies
examples/      # the "shop" fixture repos and the reference KB built from them
tests/         # node:test suites
docs/          # design spec, plans, acceptance checklist
```

`skills.sh` installs each skill folder on its own, which is why every skill carries its own copy of `shared/`.

## Workflow

1. Edit `shared/` or a `skills/*/SKILL.md`. **Never edit the generated copies.**
2. Run `npm run sync && npm test`. CI fails if the copies are out of sync.
3. **New behavior means a new contract phrase.** Add the phrases a skill must state to `tests/skill-contracts.test.mjs`, and watch the test fail before you write the text.
4. **Helper changes are test-first.** Use `tests/helpers/fixture-repos.mjs` to build real temporary git repos, and don't mock git.
5. If you changed how a skill behaves, run [docs/acceptance.md](docs/acceptance.md) for at least one agent and note the result in your PR.

## Rules for skill text

- `SKILL.md` frontmatter holds only single-line `name:` and `description:` values. `name` equals the folder name.
- Keep each SKILL.md body under 500 lines. Move detail into `shared/references/`.
- **Agent-neutral:** write for any coding agent. Mention agent-specific features (subagents, model choice) only as "if your agent supports it", always with a fallback.
- **The helper is optional.** Every step that runs `kbee-tool.mjs` has a manual git fallback in `shared/references/accuracy-rules.md`.
- **Nothing organization-specific.** Use the made-up "shop" example. The denylist in `tests/skills-lint.test.mjs` enforces this, so add terms there if needed.
- Use plain language. These files are read by people as well as agents.

## Helper conventions

- Node 18 or later, ESM, **no dependencies**.
- Run git with `execFileSync` and never with shell strings, so it works on Windows.
- Handle CRLF line endings.
- Errors are a `KbeeError` with a `code`. The CLI prints `{"error":{"code","message"}}` and exits 1.
