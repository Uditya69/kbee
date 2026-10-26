# kbee: audit, in-repo KBs, and monorepos — Design

Extends [2026-10-18-kbee-design.md](2026-10-18-kbee-design.md). Where the two disagree, this document wins; the overridden parts are listed under [Changes to the original design](#changes-to-the-original-design).

## Intent

kbee today assumes it starts from nothing: `kbee-init` builds a fresh KB in a separate repo. Real projects aren't like that.

- Many projects **already have a KB** of some kind, written by hand or by another tool, in its own layout. A monorepo with a root `kb/` folder (pages per DB table, per API route, per screen, plus end-to-end use-case walkthroughs) is a typical example. kbee can't use it, and `kbee-init` would build a second, competing one.
- Many projects are **one repo or one monorepo**. A separate KB repo is extra ceremony for them, and it splits docs from the code they describe.
- In a **monorepo**, a feature that touches several packages is one change, not several. kbee treats each package as its own "repo" entry already, but then tries to make one branch and one PR per package, which is wrong when they share one git repo.

The user wants kbee to be **plug and play anywhere**: point it at any project, whatever shape its knowledge is in, and the agent works out what's there, fixes what's missing or wrong, and from then on every kbee command just works. The agent does the judgment; the user doesn't configure anything.

## Goals

1. **An audit command** (`/kbee audit`) that finds any existing KB in a project, in any format, checks it against the code, reports, and — after a yes — brings it up to what kbee needs, so `/kbee build` etc. work immediately after.
2. **In-repo KBs.** The KB can live in a folder inside the code repo (default `kb/` at the root), as well as in its own repo. Every kbee skill works the same with either.
3. **Docs merge with code.** With an in-repo KB, a feature's KB updates are committed on the feature branch and land in the same PR as the code. Nothing else to do after merge.
4. **Monorepo features ship as one branch and one PR**, while still planning and reviewing per package (producers before consumers, contract checks between packages).
5. Generic: works on any project. The press_flow-style `kb/` is one example, not a target to hardcode.

## Non-goals

- Supporting a KB with no kbee structure at all at runtime. Other kbee skills keep reading kbee's layout; the audit is what makes a foreign KB usable, not a format-agnostic reader in every skill.
- Changing how separate-repo KBs work for multi-repo setups. Their flow (pending changes, merge-mode sync) stays as it is.
- Migrating a KB between in-repo and separate-repo locations after setup (could come later).

## Anti-goals

- **Destroying the team's docs.** The audit never moves, rewrites or deletes files a person wrote unless the user explicitly chose the rewrite.
- **Silent changes.** Same rule as before: what the KB claims is never changed without the user seeing it.
- **Config.** If the user has to tell kbee the KB's format or location by hand, it has failed. The agent finds and reads it.
- **Two KBs.** kbee must not end up with a kbee KB beside an existing KB that says different things with no link between them.

## Decided by the user

- **Audit, format choice:** when the existing KB isn't in kbee's format, the audit **asks** the user. Yes → rewrite it into kbee's layout. No → keep the team's files as they are and add kbee's structure alongside them.
- **In-repo KB updates go in the same PR** as the code, so docs and code merge together. No pending-then-sync step for in-repo KBs.
- **Monorepo:** one branch and one PR for the whole feature (packages are still separate entries for planning and review).
- **Where a new KB goes:** for a single repo or a monorepo, always ask, with **inside the repo** as the default (separate repo offered as the alternative).
- The agent is trusted to work out formats and layouts itself; no per-project setup.

## Design

### 1. The audit (`kbee-audit`, reached by `/kbee audit`)

A new skill, plus a router row in `kbee` (`/kbee audit`, "check our KB", "is our KB any good", "use our existing docs").

1. **Find.** Look for knowledge in the project, wherever it is:
   - a kbee KB (valid `manifest.json`, found through `kb-discovery.md`, including the new in-repo location);
   - a KB-like folder without a manifest (`kb/`, `docs/kb/`, `knowledge/`, `docs/architecture/`, a wiki folder… — the agent judges by content, not only names);
   - scattered knowledge: `CLAUDE.md`, `AGENTS.md`, `docs/`, ADRs, READMEs per package.
   If it finds nothing, say so and offer `kbee-init`.
2. **Check against the code**, at the default-branch SHA:
   - coverage: which repos/packages, routes, tables, screens, contracts the KB covers and which it misses;
   - accuracy: claims that don't match the code (spot-check broadly, verify every claim it reports as wrong);
   - unsourced claims (no file reference at all);
   - what kbee needs that's missing: manifest, system map, per-repo overview/conventions, field-level contracts with producer and consumers, citations, `gaps.md`;
   - for an existing kbee KB: `stale` and `rules` results (this replaces running sync's gap check by hand).
3. **One report.** What it found, where, how good it is, and what it proposes to change. Short, grouped, worst problems first.
4. **One format question** (only for a non-kbee KB): rewrite into kbee's layout, or keep the team's files and add kbee's structure alongside.
5. **Fix after a yes.** Same verify pass and `validate` as init. Then commit and ask before pushing. From here on it's a normal kbee KB.

**For an existing kbee KB** the audit is a health check: staleness → merge-mode sync, outdated rules → upgrade mode, plus coverage and accuracy gaps → proposed fact changes. It reuses `kbee-sync`'s modes rather than duplicating them.

**Keep-alongside mode** (the user said no to rewrite):
- kbee's files go into the same folder as the existing KB (e.g. `kb/manifest.json`, `kb/system-map.md`, `kb/contracts/…`). The team's files stay byte-for-byte unchanged, except for what's listed next.
- Where a name collides (most likely `README.md`), keep the team's file and add a short kbee section to it, with permission as a fact change.
- kbee files link to the team's docs they draw on, and the team's index gets one link to the system map, so people and agents can get from one to the other.
- Facts kbee takes from the team's docs are verified against the code and cited to the code, like any other fact. Where the team's doc and the code disagree, the code wins in kbee's files and the disagreement goes in `gaps.md`; the audit offers to fix the team's doc as a separate, shown change.

**After the audit, kbee keeps looking after the team's docs** (designer's call; the user delegated it). The manifest lists the team's doc files kbee maintains (exact field is the builder's). From then on they're treated like kbee fact files for reading and freshness: `/kbee ask` and spec read them; sync and the gap check flag a team doc when files it references change, and propose fixes with the usual yes. They're never required to use kbee's citation syntax: kbee checks the file paths they mention, and `validate` doesn't fail on their lack of citations.

**Rewrite mode** (the user said yes): build the kbee KB in the same folder using the team's docs as a source, then remove or replace the old files as part of the one shown change. Anything in the old docs that kbee's layout has no place for (e.g. long use-case walkthroughs) is kept as a file, not dropped — under a folder the builder chooses — and linked from the system map.

### 2. In-repo KBs

- **Location.** A folder inside the code repo, default `kb/` at the git root. If `kb/` is already taken by a non-kbee KB, that's an audit case, not a conflict: `kbee-init` hands over to the audit.
- **Manifest.** `manifest.json` records where the KB lives (an in-repo flag or a location field; exact shape is the builder's). In-repo KBs still list one entry per repo or package, with `pathHint` relative to the KB folder (e.g. `../apps/api`).
- **Discovery.** `kb-discovery.md` and `kbee-tool.mjs find` also check `<git root>/kb/manifest.json`, and, if the pointer block names an in-repo path, that path. If a KB-like folder without a manifest is found, the skill says so in one line and offers `/kbee audit`.
- **Init.** For a single repo or monorepo, `kbee-init` always asks where the KB goes, defaulting to inside the repo. For several separate repos it keeps defaulting to a separate KB repo, and asks the same way.
- **The pointer block** is still offered (CLAUDE.md/AGENTS.md), pointing at `kb/`.

### 3. Docs merge with code (in-repo KBs)

- During a feature, the feature records (`features/<slug>/`) and the KB fact changes are committed on the feature branch `kbee/<slug>`, next to the code. No `pending.md` for in-repo KBs, and no merge-mode step after the PR merges.
- **Approval:** fact changes are still shown before they're written. To keep the three-prompt promise (spec, plan, push), they're shown as part of the pre-push summary in `kbee-ship`, and the user's yes there covers them. The PR review is a second look by the team.
- **Citations and staleness** need a rule that works when the KB and the code live in the same commits and SHAs vanish after a squash merge. See *Left to the builder*.
- KB-only edits outside a feature (`/kbee ask` that grows the KB, an audit fix, a sync after someone else's change): committed on the current branch in the code repo after the usual yes, and pushing is asked as always. `"mode": "pr"` still means "put it on a branch and open a PR".

### 4. Monorepo features

- Each package/app stays its own manifest entry (as today). Spec and plan list affected packages; the plan still orders producers before consumers, each task with its test; review still checks contracts between packages.
- **Branches and PRs are per git repo, not per entry.** Entries that share a git root share one `kbee/<slug>` branch and one PR. `kbee-implement`, `kbee-ship` and `status.json` group by git root. A multi-repo feature where one repo is a monorepo gets one PR for the monorepo plus one per other repo, cross-linked as today.
- Commits on the shared branch stay per task (and so per package) so the history reads in plan order.
- The helper should expose the git root of an entry (e.g. in `resolve`) so skills can group without guessing.

### 5. Tests

Per CONTRIBUTING: skill contract phrases first (`tests/skill-contracts.test.mjs`), `node:test` cases with `tests/helpers/fixture-repos.mjs` for helper changes. New fixtures, all using the "shop" naming:
- a **shop monorepo** (`apps/api`, `apps/web`, `packages/types`) with an in-repo kbee KB;
- the same monorepo with a **hand-written, non-kbee `kb/`** (layered pages and a use-case walkthrough, a couple of deliberately stale or wrong claims) for audit acceptance runs.
New acceptance checklist rows in `docs/acceptance.md` for: audit on a foreign KB (both answers to the format question), audit on a stale kbee KB, init with in-repo default, a monorepo feature producing one PR that contains its KB changes.

## Changes to the original design

These parts of [2026-10-18-kbee-design.md](2026-10-18-kbee-design.md) are replaced (user decisions, 2026-10-26):

- *"The knowledge base lives in a dedicated repo … Copies inside each code repo aren't used, because they drift apart."* → The KB lives either in its own repo or in a folder inside the code repo. There's still exactly one KB; an in-repo one doesn't drift because it changes in the same PRs as the code.
- *"Changes made on feature branches … are not written into the KB's facts. Sync records them as pending changes"* → still true for separate-repo KBs. For in-repo KBs, fact changes are written on the feature branch and merge with the code.
- *Init step 1 "Ask where the KB repo should live"* → also offers an in-repo folder, the default for single repos and monorepos.
- *Ship "create branches and PRs in each affected repo"* → per git repo; monorepo packages share one.
- *User-facing entry points* gain `/kbee audit`.

`kb-layout.md` ("The KB is its own git repo"), `kb-discovery.md`, `approval-rules.md` (Git section) and the docs (`getting-started.md`, `kb-format.md`, `teams.md`, `troubleshooting.md`'s monorepo answer) need matching updates.

## Calls made by the designer (not explicitly confirmed by the user)

- The skill is named `kbee-audit`; for an existing kbee KB it reuses `kbee-sync`'s modes instead of re-implementing them.
- Keep-alongside puts kbee's files in the same folder as the team's KB, not a subfolder, and links both ways.
- On a doc-vs-code conflict in keep-alongside mode, kbee's files follow the code and the team's doc fix is offered separately.
- Rewrite mode keeps content kbee's layout has no slot for, rather than dropping it.
- In-repo fact changes are approved through the pre-push summary, not a separate prompt.
- Default in-repo folder name is `kb/`.
- For several separate repos, the default stays a separate KB repo (in-repo host repo remains possible if the user picks it).
- No in-repo ↔ separate-repo migration in this round.
- **In-repo is a property of the whole KB, and only offered when every manifest entry shares one git root** (a single repo or a monorepo). Several separate repos always get a separate KB repo, keeping today's pending-then-sync flow. This avoids a mixed flow where one repo's facts merge with another repo's PR.
- **In-repo citations name no commit.** In an in-repo KB a citation is `[repo:path:line]` (or `start-end`) and means "the code in this same commit". The KB on any commit is then checkable against the code on that commit, survives squash merges, and needs nothing after merge. `validate` checks the cited lines exist in the working tree (or at a given commit); `stale` flags a KB file when a file it cites changed in a later commit than the KB file's last change (`git log`). `syncedSha` isn't used for in-repo KBs. Separate-repo KBs keep `repo@sha`. Manual fallbacks for both go in `accuracy-rules.md`.
- **In-repo feature records live on the feature branch from the start.** `kbee-spec` creates `kbee/<slug>` (the dirty-tree stop applies there) and commits `features/<slug>/` on it. `/kbee` status and resume find in-flight features by listing local and remote `kbee/*` branches. Records stay in the repo after merge as history; ship sets the stage to `shipped`, and status treats a `shipped` feature whose branch has merged as done, so nothing has to be written after merge.
- **Audit with only scattered knowledge** (no KB folder): it reports what it found and hands over to `kbee-init`, which already reads `docs/`, ADRs and READMEs as sources; init asks the location question.
- **Name collisions in keep-alongside mode:** if the team's folder already uses one of kbee's fact-folder names (`contracts/`, `decisions/`, `repos/`) or `system-map.md`, kbee's structure goes in a `kbee/` subfolder of it instead, so `validate`, `stale` and the approval rules never treat the team's files as kbee facts.

## Left to the builder

- Exact manifest field(s) for KB location, and the `kbeeVersion`/`rulesVersion` bump if needed.
- How the audit scores coverage and how much it spot-checks on a large foreign KB, within the accuracy rules (anything it reports as wrong must be verified).
- Where rewrite mode keeps leftover content, and how use-case walkthroughs map (could become `contracts/` cross-links or a new optional `flows/` folder).
- Wording of every SKILL.md change, and how the in-repo/separate-repo differences are split between skills and shared references.
