# kbee — Design

> Partly superseded by [2026-10-26-kbee-audit-and-in-repo-kb-design.md](2026-10-26-kbee-audit-and-in-repo-kb-design.md): KBs can now live inside the code repo, with their updates in the same PR as the code, and `/kbee audit` adopts existing KBs.


## Intent

AI coding agents work one repo at a time and forget everything between sessions. Real systems span many repos: a backend, a frontend, shared libraries, workers. So an agent building a feature in one repo has no idea what the others look like, what contracts they depend on, or what conventions the team follows. Every session starts from zero, and changes break things in repos the agent never saw.

kbee is an open-source, plug-and-play AI software development lifecycle with a shared, multi-repo **knowledge base (KB)** at its core. A developer installs it, runs one setup command, gives it their repo links, and from then on any coding agent can take a feature from idea to shipped PRs across all their repos, with the KB kept accurate and in sync.

The bar for effort is tools like Graphify: install, run one command, it works.

## Goals

1. **Plug and play.** Install with one command, set up with one command that asks only for repo links. No config files to fill in.
2. **Works in any coding agent.** Claude Code, Cursor, Codex, Copilot, Gemini CLI, and others. Not tied to one vendor.
3. **A shared, multi-repo knowledge base** that the whole team shares through git.
4. **A complete, standalone SDLC.** Six stages built in (spec, plan, build, review, ship, sync). No dependency on other skill packs.
5. **The KB stays accurate on its own.** It detects gaps and staleness, proposes fixes, and applies them with permission.
6. **Publishable to skills.sh** and open to contributors from anywhere.

## Non-goals

- Not a hosted service, database, or server. Everything is files and git.
- Not a replacement for the coding agent. kbee instructs agents; it doesn't run models itself.
- Not a CI/CD or deployment tool. "Ship" ends at linked pull requests.
- v1 isn't tied to any one company's stack, conventions, or repos. Nothing organization-specific gets hardcoded.

## Anti-goals (failure even if it technically works)

- **Complexity.** If a new user needs to read long docs, memorise many commands, or fill in config before getting value, it has failed.
- **Inaccuracy.** If the KB contains made-up or stale facts that agents trust, it does more harm than having no KB. A wrong KB is worse than an empty one.
- **Silent changes.** The KB must never be rewritten without the user seeing and approving it.

## Constraints

- **Format:** every capability is an Agent Skill (`skills/<name>/SKILL.md` following the open Agent Skills standard), so it installs through `npx skills add <owner>/<repo>` (skills.sh). Anything beyond instructions (helper scripts, templates) ships inside the skill folders, because skills.sh installs only skill folders.
- **Agents without skill support** get an `AGENTS.md` pointer that tells them where the skills and KB are.
- **No required runtime beyond git and the agent itself.** Helper scripts are allowed but must be optional or ship with a fallback the agent can follow by hand. Required tools must work on macOS, Linux, and Windows.
- **Agent-agnostic model use.** Skills may suggest model tiers, but must work correctly on whatever single model the agent is running.

## Decided design

### User-facing entry points

Three skills cover everything a user needs to know:

| Skill | What it does |
|-------|--------------|
| `kbee-init` | One-time setup: ask for repo links, build the KB. |
| `kbee-feature` | Take a feature from idea to linked PRs, running all six stages in order. |
| `kbee-kb` | Ask the KB questions, expand it ("document how payments work", "add this repo"), or fix it. |

Each of the six stages is also its own skill (`kbee-spec`, `kbee-plan`, `kbee-build`, `kbee-review`, `kbee-ship`, `kbee-sync`). Users can run any stage alone, but never have to: `kbee-feature` runs them for you.

### The knowledge base lives in a dedicated repo

The KB is its own git repo (for example `myorg-kb`), separate from the code repos. Cross-repo knowledge such as "how repo A talks to repo B" has one home there, and the team shares it by pushing and pulling like any repo. Copies inside each code repo aren't used, because they drift apart.

The KB is plain Markdown plus a small machine-readable manifest. It has to be readable by people as well as agents: a teammate should be able to open any file and understand it.

Proposed layout (the builder may refine names):

```
myorg-kb/
  README.md              # what this KB is, how to use it
  manifest.json          # repos (name, url, local path hint), commit SHA each was last synced at, KB format version
  system-map.md          # all repos, what each owns, how they connect (with a diagram)
  repos/<repo>/
    overview.md          # purpose, stack, entry points, how to run/test/deploy
    conventions.md       # coding, naming, testing patterns found in this repo
  contracts/             # APIs, events, shared types, shared DB tables, and who produces/consumes each
  decisions/             # architecture decisions and why (ADR style)
  features/<slug>/       # in-flight feature work: spec, plan, status, linked PRs
  gaps.md                # known gaps and open questions, pending user approval
```

### Accuracy rules (apply everywhere the KB is written)

1. **Every fact cites its source**, e.g. `api-server@a1b2c3d:src/routes/orders.ts:42`. A fact without a citation doesn't go in.
2. **Verify before writing.** After facts are extracted, a separate pass rereads each cited source and confirms the claim. Claims that fail verification are dropped or moved to `gaps.md` as questions.
3. **Track freshness.** `manifest.json` records the commit each repo was synced at. When a repo's HEAD has moved past it, the KB sections citing that repo are flagged as possibly stale.
4. **Uncertain means ask.** When the agent can't confirm something, it records a question in `gaps.md` instead of guessing.

### Init flow (`kbee-init`)

1. Ask where the KB repo should live: create a new one or use an existing one.
2. Ask for the code repos: GitHub/GitLab URLs or local paths, any number (one repo is fine too).
3. Clone or locate each repo in a workspace folder.
4. **Scan:** extract raw facts per repo (stack, entry points, routes, exported types, dependencies, configs, cross-repo calls). When the agent supports subagents and model choice (as Claude Code does), fan this out in parallel on a fast, cheap model.
5. **Synthesize:** a stronger model writes the KB files from the extracted facts, including cross-repo connections.
6. **Verify** per the accuracy rules.
7. Show a short summary of what it understood and what it was unsure of. The user doesn't approve each fact.
8. Commit to the KB repo. Ask before pushing.
9. Offer, with permission, to add a small pointer (an `AGENTS.md`/`CLAUDE.md` snippet) to each code repo so agents opened there find the KB. Skip this if the user declines.

After init, the user shouldn't need to babysit the KB.

### Gap detection and KB changes

- **Automatic detection:** every stage reads the KB before it starts and notices mismatches: an unlisted repo, an API that changed shape, code that breaks a recorded convention, stale sections (manifest SHA vs HEAD), or a question the KB can't answer.
- **Report, propose, ask, then write.** The agent states the gap, shows the proposed KB change, and writes it only after the user says yes. Declined proposals go into `gaps.md` so they aren't re-raised every session.
- **Explicit expansion** through `kbee-kb`: the user asks for new knowledge and the agent researches the code, follows the accuracy rules, shows the result, and writes it on approval.

### The six stages

`kbee-feature` **pauses for the user's approval after Spec and after Plan**. Once the plan is approved, it runs Build, Review, and Ship preparation on its own, and asks again only before pushing or opening PRs. (User decision.)

Each stage reads the KB first and records its output under `features/<slug>/` in the KB repo, so another teammate or agent session can pick the feature up where it left off.

1. **Spec:** turn the idea or ticket into a clear spec with acceptance criteria, and use the KB to list which repos and contracts it touches.
2. **Plan:** break the spec into tasks per repo, ordered by dependency (e.g. API change before the frontend that uses it).
3. **Build:** implement each task test-first in the correct repo.
4. **Review:** check each change for correctness, and check it against contracts recorded in the KB so consumers in other repos don't break.
5. **Ship:** create branches and PRs in each affected repo, cross-linked to each other and to the feature's spec. Ask before pushing or opening PRs. If no PR tool is available (e.g. no `gh`), prepare the branches and PR descriptions for the user to open.
6. **Sync:** update the KB with what changed (contracts, conventions, decisions), following the gap rules. Sync also runs at the end of every other stage, not only at the end of the feature.

### Open-source project

- Public repo with `README.md` (quick start of three steps or fewer), `CONTRIBUTING.md`, and a license.
- Nothing organization-specific in the skills, docs, or examples.
- An example set of small multi-repo fixtures (e.g. an API, a web app, a shared types package) used to demo and test `kbee-init` and the stages.

### What the KB describes: the default branch

- The KB's facts describe each repo's **default branch** (usually `main`), as of the SHA in `manifest.json`. Staleness compares that SHA against the remote default branch, not local HEAD.
- Changes made on feature branches during Build and Ship are **not** written into the KB's facts. Sync records them as pending changes under `features/<slug>/`.
- When a feature's PRs merge, the next sync (or any stage that notices the merge) folds those pending changes into the KB facts, re-verified against the merged code.

### Which writes need approval

- **Bookkeeping is written without asking:** feature records under `features/<slug>/` (spec, plan, status, PR links, pending changes), manifest SHA updates after a verified sync, staleness flags, and new `gaps.md` entries. None of these change what the KB claims is true.
- **Changes to facts are shown and need a yes:** anything in `system-map.md`, `repos/`, `contracts/`, `decisions/`.
- **Init** gets one approval: the user reviews the summary and approves the first KB as a whole, not fact by fact.
- **Pushing** the KB repo always needs a yes.

### Sources that aren't code

- Code citations (`repo@sha:path:line`) are preferred and required wherever the fact is about code.
- Facts the code can't show (mostly `decisions/`, and the "why" behind things) may cite a non-code source: the user (`source: user, YYYY-MM-DD`), a doc or PR/ticket URL. These are marked as such, aren't re-verified against code, and aren't subject to SHA staleness.
- Spec and plan files under `features/` are working documents and don't need citations, except where they state a fact about existing code.

### Working as a team

- A teammate joining an existing KB runs `kbee-init` and points it at the existing KB repo. It reads `manifest.json`, clones the listed code repos (or finds them locally), and skips the build.
- By default the KB is committed to its main branch, with a pull before every write and a push only on approval. Teams that want KB changes reviewed can set PR mode, where KB changes go on a branch and open a PR instead.
- Conflicts are handled as ordinary git conflicts. Since KB files are small and split by repo and topic, they should be rare. When one happens, the agent resolves it by re-verifying both sides against the code.

### v1 scope

- **Agents tested for v1:** Claude Code, Codex, Cursor, and GitHub Copilot. Others that read the Agent Skills format should work, but aren't a release gate.
- **Agents without subagents or model choice** run every step one after another on the current model. Same results, just slower.
- **Agents with no skill support** aren't supported in v1, apart from the `AGENTS.md` pointer that lets them read the KB.
- **Repo size:** small-to-medium repos (up to roughly 100k lines each) and up to about 10 repos. In a monorepo, each package/app is treated as its own "repo" entry in the manifest.
- **KB depth:** summary-level by default: overview, stack, entry points, conventions, and the contracts that cross repo boundaries. It doesn't list every internal route or type. Users get deeper coverage on demand through `kbee-kb`.

## Calls made by the designer (not explicitly confirmed by the user)

- Exact KB file layout above.
- MIT license.
- Specs live in `docs/specs/` in this repo.
- One-repo setups are supported (KB repo with a single code repo).
- Pointer snippets in code repos are optional and need permission.
- The KB describes default branches; feature-branch changes stay pending until merge.
- Which writes need approval (the split above).
- Non-code sources allowed for decisions and the "why".
- Team flow: commit-to-main by default, PR mode optional.
- v1 agent list, repo size limits, and summary-level KB depth.
- Manifest is JSON (`manifest.json`), so the helper script needs no YAML parser.

## Left to the builder

- Exact wording and structure of each `SKILL.md`, and how much to split shared instructions into referenced files.
- Whether helper scripts are worth shipping (e.g. for manifest/staleness checks) and in what language, within the constraints above.
- Fact-extraction heuristics per language and framework.
- How to test skills (fixture repos, scripted agent runs, evals).
- Exact format of `manifest.json` and the citation syntax, as long as citations include repo, commit, path, and line.
