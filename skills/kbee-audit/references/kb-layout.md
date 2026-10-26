<!-- generated from shared/references/kb-layout.md; edit the source, then run npm run sync -->
# KB layout

The KB holds plain Markdown that people can read, plus `manifest.json`. It lives in one of two places, recorded as `"location"` in `manifest.json`:

- **`"separate"`** (the default when `location` is missing): its own git repo, for example `../shop-kb`, next to the code repos. Use it for several separate repos.
- **`"in-repo"`**: a folder inside the code repo, `kb/` at the git root by default. Use it for a single repo or a monorepo. Every manifest entry must live in that same git repo. See [In-repo KBs](#in-repo-kbs).

```
<name>-kb/   (or <repo>/kb/)
  README.md              # what this KB is and the rules (from templates/kb/README.md)
  manifest.json          # repos and the commit each was synced at
  system-map.md          # all repos, what each owns, how they connect (Mermaid diagram)
  repos/<repo>/
    overview.md          # purpose, stack, entry points, how to run/test/deploy
    conventions.md       # coding, naming, testing patterns found in this repo
  contracts/<topic>.md   # an API, event, shared type, or shared table: producer, consumers, shape
  decisions/NNNN-<title>.md  # architecture decisions and why (ADR style)
  features/<slug>/       # in-flight feature work (bookkeeping, see approval-rules.md)
  gaps.md                # open questions and declined proposals
  .kbee.local.json       # per-person local paths; git-ignored, never committed
```

Fact files are `system-map.md`, `repos/`, `contracts/`, and `decisions/`. They describe each repo's **default branch** only. Keep them summary-level: no per-function detail, but enough that a developer could add a field end to end across the repos without rediscovering the code.

## Required sections

- `system-map.md`: a repo table, a Mermaid diagram, links to the contracts, and `## Common changes` (the 1–3 most likely cross-repo changes: the files to touch in producer → consumer order, each cited, plus known traps).
- `repos/<repo>/overview.md`: purpose, stack, entry points, run/test/build, and these sections:
  - `## Data flow and domain model` for repos that own data: source → transforms → stored shape → readers, and how derived stores are rebuilt or backfilled
  - `## Scripts`: every file under `scripts/`, `bin/` or `tools/`
  - `## Runtime model`: jobs, in-memory state, whether it can run more than one instance, health checks, and what CI gates
- `contracts/shared-logic.md` when code is mirrored across repos: every copy cited, and any drift.

## manifest.json

```json
{
  "kbeeVersion": 1,
  "mode": "direct",
  "rulesVersion": 2,
  "repos": [
    {
      "name": "shop-api",
      "url": "https://github.com/example/shop-api.git",
      "defaultBranch": "main",
      "pathHint": "../shop-api",
      "syncedSha": "<full sha or null>",
      "syncedAt": "<ISO time or null>"
    }
  ]
}
```

- `name` matches `^[a-z0-9][a-z0-9._-]*$` and is used in citations. In a monorepo, each package or app gets its own entry, and `pathHint` points at the package folder.
- `rulesVersion` is the kbee rules version this KB was built or last upgraded to (missing means 1). See `rules-changelog.md`. **kbee-sync** upgrade mode brings an older KB up to date.
- `mode` is `"direct"` (commit KB changes to the default branch) or `"pr"` (KB changes go through PRs).
- `pathHint` is relative to the KB folder. In an in-repo KB at `kb/`, a package's `pathHint` looks like `../apps/api`, and a single repo's is `..`.
- `location` is `"separate"` or `"in-repo"`. Missing means `"separate"`.
- `teamDocs` (optional) lists the team's own docs that kbee looks after, as paths relative to the KB folder, for example `["use-cases/place-an-order.md"]`. **kbee-audit** fills it in when it keeps an existing KB alongside kbee's files. Team docs don't use kbee's citation syntax. kbee tracks the file paths they mention (in backticks or relative links), flags them as stale when those files change, and proposes fixes like any fact change. `validate` only checks that they exist.

## .kbee.local.json

```json
{ "repos": { "shop-api": "/home/me/code/shop-api" } }
```

This file overrides `pathHint` for one person. Add it to the KB's `.gitignore`.

## contracts/<topic>.md

Each contract names its **producer** (the repo that defines it), its **consumers** (repos that use it), and its shape, each with citations. Reviews check changes against this file.

**Shape is field-level:**
- every field (name, type, required or optional) of every request body, query param set and response, including nested objects
- the semantics consumers rely on: units, time zone, defaults, inclusive or exclusive bounds

A type name with a citation is not a shape.

## features/<slug>/

| File | Written by | Content |
|------|------------|---------|
| `status.json` | every stage | see below |
| `spec.md` | kbee-spec | problem, acceptance criteria, affected repos and contracts |
| `plan.md` | kbee-plan | tasks per repo in dependency order, each with its test |
| `review.md` | kbee-review | findings, marked blocking or not |
| `pending.md` | kbee-sync | proposed KB fact changes waiting for the PRs to merge |

`status.json`:

```json
{
  "slug": "order-cancellation",
  "title": "Order cancellation",
  "stage": "spec",
  "approved": { "spec": false, "plan": false },
  "repos": ["shop-types", "shop-api", "shop-web"],
  "branches": { "shop-api": "kbee/order-cancellation" },
  "prs": { "shop-api": "https://github.com/example/shop-api/pull/12" },
  "pending": ["contracts/orders-api.md: add POST /orders/:id/cancel"],
  "source": { "type": "jira", "key": "SHOP-42", "url": "https://example.atlassian.net/browse/SHOP-42", "figma": [] }
}
```

`source` records where the requirements came from: `type` is `jira`, `github`, `figma`, or `text`. It's empty for plain text.

`stage` is one of `spec`, `plan`, `build`, `review`, `ship`, `shipped`, or `done`. In-repo features stop at `shipped`: the records merge with the code. A `shipped` record on the default branch counts as done, because its being there proves the merge, even after a squash merge.

`branches` and `prs` are keyed by manifest entry. Monorepo packages share **one branch per git repo** and one PR, so entries that live in the same git repo (see `kbee-tool.mjs roots`) have the same branch and PR URL.

## In-repo KBs

When `"location": "in-repo"`, the KB and the code share one git history, so:

- **Citations name no commit:** `[repo:path:line]` or `[repo:path:start-end]`, with `path` relative to the git root. It means "the code in this same commit". `syncedSha` stays `null` and `set-synced` isn't used.
- **Freshness comes from history:** a KB file is stale when a file it cites changed in a commit after the KB file's own last commit.
- **Feature work lives on the feature branch.** `kbee-spec` creates `kbee/<slug>` and commits `features/<slug>/` there. KB fact changes are written on that branch too, verified, and merge in the same PR as the code. There is no `pending.md` and nothing to do after merge.
- To find in-flight features, list local and remote `kbee/*` branches and read `features/<slug>/status.json` on each: `git show kbee/<slug>:<kb>/features/<slug>/status.json`, where `<kb>` is the KB folder's path from the git root (usually `kb`).
- **Init, audit and sync read and commit on the default branch** (or a `kbee/kb-*` branch cut from it in `"pr"` mode), so commit-less citations match the code they're committed with. On another branch, switch first, and stop and ask if the tree is dirty.
