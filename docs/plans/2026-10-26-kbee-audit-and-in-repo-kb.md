# kbee audit, in-repo KBs and monorepos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/kbee audit` (adopt and fix any existing KB), in-repo KBs whose updates merge in the same PR as the code, and one-branch-one-PR monorepo features.

**Architecture:** The helper (`shared/scripts/kbee-tool.mjs`) learns the in-repo location: commit-less citations checked against the working tree, history-based staleness, team-doc tracking, `kb/` discovery, foreign-KB detection, and git-root grouping. Skills (`skills/*/SKILL.md`) and shared references describe the behavior; a new `kbee-audit` skill drives adoption. Docs and acceptance rows follow.

**Tech Stack:** Node ≥ 18 ESM, no dependencies, `node:test`, git via `execFileSync`. Markdown skills.

**Spec:** `docs/specs/2026-10-26-kbee-audit-and-in-repo-kb-design.md` (extends `docs/specs/2026-10-18-kbee-design.md`).

## Global Constraints

- `shared/scripts/kbee-tool.mjs` stays dependency-free, Node 18+; every new command gets a manual fallback row in `shared/references/accuracy-rules.md`.
- Edit `shared/` and `skills/*/SKILL.md` only; run `npm run sync` after `shared/` changes. Never edit generated copies.
- Test first: contract phrases in `tests/skill-contracts.test.mjs` before skill text; `node:test` with real temp git repos (no git mocks) before helper code.
- `npm test` green before every commit.
- Nothing organization-specific; examples use "shop".
- SKILL.md body ≤ 500 lines; frontmatter single-line `name`/`description`.
- Manifest stays `kbeeVersion: 1`; new fields are optional: `location` (`"in-repo"` | `"separate"`, missing = separate) and `teamDocs` (array of KB-relative paths).
- In-repo citation form: `[repo:path:line]` / `[repo:path:start-end]`, path relative to the git root.
- Default in-repo folder: `kb/` at the git root.

## Review Focus

- An in-repo KB on a feature branch with uncommitted KB edits: `stale` must not flag a KB file that is itself modified in the working tree (it's being updated). Test in Task 3.
- A commit-less citation in a separate-repo KB must be an error (`NEEDS_SHA`), not silently ignored. Test in Task 1.
- A manifest marked `in-repo` whose entries live in another git repo must fail `validate` (`IN_REPO_SPLIT`). Test in Task 1.
- `find` from inside a monorepo package (`apps/api/src`) must find `<root>/kb`. Test in Task 2.
- Team docs mentioning a directory (`apps/api/src/`) or a path with a line suffix (`src/orders.ts:42`) must still be tracked. Test in Task 3.

---

### Task 1: Manifest fields and commit-less citations

**Files:**
- Modify: `shared/scripts/kbee-tool.mjs`
- Modify: `tests/helpers/fixture-repos.mjs` (add `makeMonorepo`)
- Create: `tests/kbee-tool.inrepo.test.mjs`

**Interfaces:**
- Produces: `makeMonorepo({ withKb = true } = {}) -> { root, kbDir, sha }` — one git repo (bare origin attached) with `apps/api` (shop-api fixture), `apps/web` (shop-web), `packages/types` (shop-types), and, when `withKb`, `kb/manifest.json` with `location: "in-repo"`, entries `shop-api`/`shop-web`/`shop-types`, `pathHint` `../apps/api` etc., `syncedSha: null`, plus `kb/contracts/orders-api.md` citing `[shop-api:apps/api/src/orders.ts:1]`, committed.
- Produces: `parseCitations` code citations of the new form have `sha: null`.
- Produces: `validateManifest` errors `"location must be 'in-repo' or 'separate'"`, `"teamDocs must be an array of relative paths"`.
- Produces: `validateKb` problems `NEEDS_SHA`, `IN_REPO_SPLIT` (file `manifest.json`, raw = repo name), `TEAM_DOC_MISSING` (file = the team doc path).

- [ ] **Step 1: Write failing tests** in `tests/kbee-tool.inrepo.test.mjs`:
  - `parses commit-less citations` — `parseCitations('[shop-api:apps/api/src/orders.ts:3-5]')[0]` deep-equals `{kind:'code', repo:'shop-api', sha:null, path:'apps/api/src/orders.ts', line:3, endLine:5, …}`; `[source: user, 2026-10-26]` still parses as source.
  - `validates an in-repo KB against the working tree` — `makeMonorepo()`; `validateKb(kbDir).errors` is `[]`; append a citation to line 9999 → one `LINE_OUT_OF_RANGE`; cite a missing file → `FILE_NOT_FOUND`.
  - `commit-less citation in a separate KB is NEEDS_SHA` — `makeWorkspace()`, append `[shop-api:src/orders.ts:1]` to `contracts/orders-api.md` → problem `NEEDS_SHA`.
  - `in-repo entries must share the KB's git root` — monorepo manifest gains an entry whose `pathHint` points at a separate `git init` dir → `IN_REPO_SPLIT`.
  - `team docs must exist` — `teamDocs: ['use-cases/missing.md']` → `TEAM_DOC_MISSING`; invalid `location: 'cloud'` → `MANIFEST_INVALID`.
  - `show reads commit-less citations from the working tree` — `showCitation(kbDir, 'shop-api:apps/api/src/orders.ts:1')` contains `> 1 |`.
- [ ] **Step 2:** `node --test tests/kbee-tool.inrepo.test.mjs` → FAIL.
- [ ] **Step 3: Implement.** Extend `CITATION_RE` with a commit-less alternative (`\[repo:path:line(-end)?\]`, path without whitespace, `]` or `:`), keeping the malformed `[x@y]` branch. `checkCitation(kbDir, c, manifest)`: for `sha === null`, `NEEDS_SHA` unless `manifest.location === 'in-repo'`, else read `path.join(gitRoot(resolveRepo(...)), c.path)` from disk (CRLF-safe `fileLines`). `showCitation` uses the same reader. `validateKb` loads the manifest once and passes it; adds the `IN_REPO_SPLIT` and `TEAM_DOC_MISSING` checks.
- [ ] **Step 4:** Run the file, then `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(tool): in-repo manifest fields and commit-less citations`.

### Task 2: Discovery — `kb/` in the repo and foreign KBs

**Files:** Modify `shared/scripts/kbee-tool.mjs`; Test `tests/kbee-tool.inrepo.test.mjs`.

**Interfaces:**
- Produces: `findKb(startDir)` order: parents → `<git root>/kb` → pointer → siblings.
- Produces: `findForeignKbs(startDir) -> string[]` — absolute paths of folders under the git root named `kb`, `docs/kb`, `knowledge`, `knowledge-base`, `docs/knowledge`, `wiki`, `docs/wiki`, `docs/architecture` that hold ≥ 2 `.md` files (recursive) and no valid manifest. Sorted.
- Produces: CLI `find` output `{ kbDir, candidates, foreign }`.

- [ ] **Step 1: Failing tests:** `finds kb/ from inside a package` — `findKb(path.join(root,'apps/api/src')) === kbDir`. `reports a hand-written kb/ as foreign` — `makeMonorepo({withKb:false})`, write `kb/README.md` and `kb/be/orders.md`; `findKb` → `null`, `findForeignKbs(root)` → `[root/kb]`. A `kb/` with one `.md` → `[]`.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** implement in `findKb` and new `findForeignKbs`; wire into `COMMANDS.find`.
- [ ] **Step 4:** run file + `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(tool): find in-repo and foreign KBs`.

### Task 3: In-repo staleness, team docs, git-root grouping

**Files:** Modify `shared/scripts/kbee-tool.mjs`; Test `tests/kbee-tool.inrepo.test.mjs`, `tests/kbee-tool.stale.test.mjs`.

**Interfaces:**
- Produces: `mentionedPaths(text) -> string[]` — targets of backtick spans and relative Markdown links that look like paths (contain `/` or a `.ext`), with leading `./`, trailing `/`, `:line[-end]` and `#anchor` stripped, de-duplicated, in order.
- Produces: `staleness(kbDir, opts)` — when `location === 'in-repo'`, per entry `{ name, syncedSha: null, currentSha: <HEAD>, status: 'fresh'|'stale'|'missing', fetchFailed: false, changedFiles, affectedKbFiles }`. Algorithm: for each fact file and team doc F not modified in the working tree, `base = git log -1 --format=%H -- F`; refs = its citation paths (fact files) or its mentioned paths that exist relative to the git root, else relative to F's folder (team docs); `git diff --name-only --no-renames base HEAD -- refs` → changed paths. A changed path belongs to the entry whose folder (relative to git root) is its longest prefix, falling back to the first entry; citation paths belong to the citation's repo. Entry is `stale` when it has any affected KB file. Separate-repo KBs: unchanged, except team docs are added to `affectedKbFiles` of a stale repo when one of their mentioned paths equals a changed file or is a folder prefix of one.
- Produces: `gitRoots(kbDir) -> [{ gitRoot: string|null, repos: string[] }]` (null for entries not found locally), CLI `roots <kb>`; `resolve` output gains `gitRoot`.

- [ ] **Step 1: Failing tests:**
  - `mentionedPaths` — ``'see `apps/api/src/orders.ts:42` and [x](../apps/web/src/) and `npm test`'`` → `['apps/api/src/orders.ts', '../apps/web/src']`.
  - `in-repo KB is fresh after it is committed`; `a later code commit makes the citing KB file stale` — edit `apps/api/src/orders.ts`, commit → `shop-api` stale, `affectedKbFiles` includes `contracts/orders-api.md`, `shop-web` fresh.
  - `a KB file being edited in the working tree is not flagged` — after the code commit, modify `kb/contracts/orders-api.md` without committing → `shop-api` fresh.
  - `team docs track the paths they mention` — `teamDocs: ['use-cases/orders.md']` mentioning `` `apps/api/src/` ``; commit a change under `apps/api/src` → `affectedKbFiles` includes `use-cases/orders.md`.
  - `separate KB: team doc flagged when a mentioned file changes` (in `kbee-tool.stale.test.mjs`) — add `teamDocs` + a doc mentioning `src/orders.ts`, push upstream change → doc in shop-api `affectedKbFiles`.
  - `gitRoots groups monorepo entries` — one group with all three names; `makeWorkspace()` gives three groups.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** implement `mentionedPaths`, `inRepoStaleness` (called from `staleness`), team-doc matching for separate KBs, `gitRoots`, `roots` command, `resolve` `gitRoot`.
- [ ] **Step 4:** run + `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(tool): in-repo staleness, team docs and git-root groups`.

### Task 4: Shared references

**Files:** Modify `shared/references/kb-layout.md`, `kb-discovery.md`, `accuracy-rules.md`, `approval-rules.md`, `shared/templates/pointer-snippet.md` (wording works for `kb`); Test `tests/skill-contracts.test.mjs` (`SHARED_CONTRACTS`); then `npm run sync`.

- [ ] **Step 1: Add phrases first:**
  - `kb-layout.md`: `'"location"'`, `'in-repo'`, `'teamDocs'`, `'shipped'`, `'one branch per git repo'`.
  - `kb-discovery.md` (new row): `'<git root>/kb'`, `'kbee-audit'`, `'foreign'`.
  - `accuracy-rules.md`: `'[repo:path:line]'`, `'NEEDS_SHA'`, `'roots <kb>'`, `'git log -1'`.
  - `approval-rules.md` (new row): `'pre-push summary'`, `'in-repo'`.
- [ ] **Step 2:** `npm test` → those rows FAIL.
- [ ] **Step 3: Write the text.** kb-layout: two locations, manifest `location`/`teamDocs`, in-repo feature records live on `kbee/<slug>` from spec, stage `shipped`, monorepo branches/PRs one branch per git repo (`status.json.branches`/`prs` keyed by entry, entries sharing a git root share values). kb-discovery: add `<git root>/kb` step, foreign KB → offer kbee-audit. accuracy-rules: in-repo citation form and meaning, fallback rows for in-repo `validate`/`show`/`stale` (`git log -1 --format=%H -- <kb file>` then `git diff --name-only --no-renames <that> HEAD -- <cited paths>`), `roots`, `find` `foreign`. approval-rules: in-repo fact changes during a feature are shown in kbee-ship's pre-push summary; in-repo KB-only edits commit on the current branch after the usual yes.
- [ ] **Step 4:** `npm run sync && npm test` → PASS.
- [ ] **Step 5: Commit** `feat(rules): in-repo KBs, team docs and monorepo branches in shared references`.

### Task 5: `kbee-audit` skill and `/kbee audit`

**Files:** Create `skills/kbee-audit/SKILL.md`; Modify `skills/kbee/SKILL.md`, `tests/skill-contracts.test.mjs`, `tests/skills-lint.test.mjs` (`EXPECTED_SKILLS` + test title "eleven"); `npm run sync` (creates its generated copies); `docs/skills.md` gets `## kbee-audit` (docs test requires it).

- [ ] **Step 1: Contracts first:**
  - `'kbee-audit'`: `'find'`, `'foreign'`, `'scattered'`, `'kbee-init'`, `'one report'`, `'rewrite'`, `'keep'`, `'alongside'`, `'kbee/ subfolder'`, `'teamDocs'`, `'byte-for-byte'`, `'the code wins'`, `'gaps.md'`, `'kbee-sync'`, `'upgrade mode'`, `'merge mode'`, `'kbee-tool.mjs validate'`, `'before pushing'`, `'If Node is not available'`, `'references/accuracy-rules.md'`, `'references/approval-rules.md'`.
  - `'kbee'` row adds `'/kbee audit'`, `'kbee-audit'`, `'kbee/*'`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3: Write `kbee-audit/SKILL.md`** per spec §1: Find (helper `find` incl. `foreign`, plus agent judgment for scattered knowledge; scattered-only → report and hand to kbee-init) → Check (coverage, accuracy with every reported error verified, unsourced claims, kbee needs; kbee KB → `stale` + `rules`, reuse kbee-sync merge/upgrade mode) → one report → one format question (rewrite vs keep alongside) → fix after yes (keep: same folder, team files byte-for-byte unchanged, collisions → `kbee/` subfolder, list team docs in `teamDocs`, link both ways, doc-vs-code: the code wins + `gaps.md`, offer the team-doc fix separately; rewrite: build from team docs, keep leftover content under `flows/` and link from the system map) → verify + `validate` → commit, ask before pushing. Router: `/kbee audit` row; `/kbee` status lists in-repo in-flight features from `kbee/*` branches; no-KB + foreign KB found → offer audit before init.
- [ ] **Step 4:** `npm run sync && npm test` → PASS.
- [ ] **Step 5: Commit** `feat: kbee-audit skill and /kbee audit`.

### Task 6: Stage skills learn in-repo KBs and monorepos

**Files:** Modify `skills/{kbee-init,kbee-spec,kbee-plan,kbee-implement,kbee-review,kbee-ship,kbee-sync,kbee-feature,kbee-kb}/SKILL.md`; Test `tests/skill-contracts.test.mjs`.

- [ ] **Step 1: Contracts first** (append to rows):
  - `kbee-init`: `'inside the repo'`, `'always ask'`, `'"location": "in-repo"'`, `'kbee-audit'`, `'separate KB repo'`.
  - `kbee-spec`: `'in-repo'`, `'create the branch'`, `'dirty'`.
  - `kbee-plan`: `'one branch per git repo'`.
  - `kbee-implement`: `'roots'`, `'one branch per git repo'`, `'in-repo'`.
  - `kbee-review`: `'one branch per git repo'`.
  - `kbee-ship`: `'one PR per git repo'`, `'pre-push summary'`, `'shipped'`, `'in-repo'`.
  - `kbee-sync`: `'in-repo'`, `'on the feature branch'`, `'teamDocs'`, `'no merge mode'`.
  - `kbee-feature`: `'in-repo'`, `'kbee/*'`, `'shipped'`.
  - `kbee-kb`: `'teamDocs'`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3: Write the text** per spec §2–4: init asks location (single repo/monorepo → default inside the repo `kb/`; several separate repos → default separate KB repo; always ask), in-repo writes `"location": "in-repo"`, commit-less citations, no `set-synced`; existing foreign KB → hand to kbee-audit. Spec: in-repo → create the branch `kbee/<slug>` (dirty tree stops) and commit records there. Plan/implement/review: group entries by `roots`, one branch per git repo, commits per task. Ship: one PR per git repo; in-repo pre-push summary lists the KB fact changes on the branch, the yes covers them; stage `shipped`. Sync: in-repo feature mode writes verified fact changes on the feature branch (no `pending.md`), no merge mode for in-repo, team docs in `teamDocs` are checked and fixed like fact files. Feature: in-repo resume via `kbee/*` branches; wrap-up says docs merge with the code and the feature counts as done once its PR merges. kb: Ask reads `teamDocs` too.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat: stage skills support in-repo KBs and monorepo features`.

### Task 7: Fixture, docs and acceptance

**Files:** Create `examples/fixtures/shop-legacy-kb/` (hand-written, non-kbee `kb/`: `README.md`, `be/orders.md`, `fe/checkout.md`, `use-cases/place-an-order.md`; one wrong claim — "orders are stored in Postgres" — and one path that doesn't exist); Modify `docs/acceptance.md` (monorepo setup + rows 10a–10e), `docs/skills.md`, `docs/getting-started.md`, `docs/kb-format.md`, `docs/teams.md`, `docs/troubleshooting.md` (monorepo answer), `README.md` (mention `/kbee audit`), `docs/specs/2026-10-18-kbee-design.md` (one line at top: partly superseded by the new spec).

- [ ] **Step 1:** Make sure no existing test globs `examples/fixtures/*` in a way the new folder breaks (`tests/expected-kb.test.mjs`); adjust only if it does.
- [ ] **Step 2:** Write the fixture and docs. Acceptance rows: 10a audit on the legacy `kb/` → one report flags Postgres claim and the missing path, asks rewrite vs keep; 10b keep → team files unchanged (`git diff --stat` shows only additions plus approved links), `validate` clean; 10c rewrite → kbee layout, walkthrough kept under `flows/`; 10d init in a monorepo defaults to `kb/` inside the repo after asking; 10e `/kbee build` in the monorepo → one branch, one PR, KB changes in that PR.
- [ ] **Step 3:** `npm test` → PASS (docs link test covers the new links).
- [ ] **Step 4: Commit** `docs: audit, in-repo KBs and monorepos`.
