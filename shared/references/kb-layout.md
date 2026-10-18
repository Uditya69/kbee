# KB layout

The KB is its own git repo, separate from the code repos. It holds plain Markdown that people can read, plus `manifest.json`.

```
<name>-kb/
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

Fact files are `system-map.md`, `repos/`, `contracts/`, and `decisions/`. They describe each repo's **default branch** only. Keep them summary-level: what a developer needs to work across repos, not every internal function.

## manifest.json

```json
{
  "kbeeVersion": 1,
  "mode": "direct",
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
- `mode` is `"direct"` (commit KB changes to the default branch) or `"pr"` (KB changes go through PRs).
- `pathHint` is relative to the KB folder.

## .kbee.local.json

```json
{ "repos": { "shop-api": "/home/me/code/shop-api" } }
```

This file overrides `pathHint` for one person. Add it to the KB's `.gitignore`.

## contracts/<topic>.md

Each contract names its **producer** (the repo that defines it), its **consumers** (repos that use it), and its shape, each with citations. Reviews check changes against this file.

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
  "pending": ["contracts/orders-api.md: add POST /orders/:id/cancel"]
}
```

`stage` is one of `spec`, `plan`, `build`, `review`, `ship`, or `done`.
