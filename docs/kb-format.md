# Knowledge base format

A kbee KB is a git repo of Markdown plus one JSON file. You can read it on GitHub and edit it by hand. A full example is in [examples/expected-kb](../examples/expected-kb).

```
shop-kb/
  README.md              # what this is, and the rules for editing it
  manifest.json          # the repos, and the commit each was last synced at
  system-map.md          # every repo, what it owns, how they connect (Mermaid)
  repos/<repo>/
    overview.md          # purpose, stack, entry points, run/test/deploy
    conventions.md       # patterns the code actually follows
  contracts/<topic>.md   # an API, event, shared type, or table: producer -> consumers
  decisions/NNNN-*.md    # architecture decisions and why
  features/<slug>/       # spec.md, plan.md, status.json, review.md, pending.md
  gaps.md                # open questions, and declined proposals
  .kbee.local.json       # your local repo paths (git-ignored)
```

**Fact files** are `system-map.md`, `repos/`, `contracts/`, and `decisions/`. They describe each repo's **default branch** only, and stay summary-level.

## Citations

Every fact in a fact file ends with where it came from.

| Kind | Format | Example |
|------|--------|---------|
| Code, one line | `[repo@sha:path:line]` | `[shop-api@4b9f895:src/server.ts:8]` |
| Code, range | `[repo@sha:path:start-end]` | `[shop-api@4b9f895:src/orders.ts:7-11]` |
| Something a person said | `[source: user, YYYY-MM-DD]` | `[source: user, 2026-10-18]` |
| A doc, PR, or ticket | `[source: <url>]` | `[source: https://github.com/acme/shop-api/pull/12]` |

- `repo` is the name in `manifest.json`.
- `sha` is 7–40 lowercase hex characters, from the default branch.
- `path` is relative to the **git root**, even in a monorepo: `packages/api/src/x.ts`.
- Non-code sources are for decisions and the "why" only. Facts about code need code citations.

Check every citation with:

```bash
node <skill-dir>/scripts/kbee-tool.mjs validate shop-kb
```

It reports missing commits, missing files, out-of-range lines, and anything shaped like a citation that breaks the format.

## manifest.json

```json
{
  "kbeeVersion": 1,
  "mode": "direct",
  "rulesVersion": 2,
  "repos": [
    {
      "name": "shop-api",
      "url": "https://github.com/acme/shop-api.git",
      "defaultBranch": "main",
      "pathHint": "../shop-api",
      "syncedSha": "4b9f895e2c…",
      "syncedAt": "2026-10-18T09:12:00.000Z"
    }
  ]
}
```

| Field | Meaning |
|-------|---------|
| `mode` | `direct` commits KB changes to the default branch. `pr` sends them through PRs ([Working as a team](teams.md#pr-mode)). |
| `name` | Lowercase, matching `^[a-z0-9][a-z0-9._-]*$`. Used in citations. |
| `pathHint` | Where the repo usually is, relative to the KB folder. In a monorepo, this points at the package folder. |
| `rulesVersion` | The kbee rules version the KB was built or last upgraded to. A missing value means 1. When kbee's rules improve, **kbee-sync** upgrade mode brings the KB up to date. |
| `syncedSha` | The default-branch commit the facts were last verified against. kbee only moves it forward, never backwards. |

## .kbee.local.json

```json
{ "repos": { "shop-api": "/Users/me/work/shop-api" } }
```

This file is personal and git-ignored. It overrides `pathHint` when your folders are laid out differently.

## features/<slug>/status.json

```json
{
  "slug": "order-cancellation",
  "title": "Order cancellation",
  "stage": "build",
  "approved": { "spec": true, "plan": true },
  "repos": ["shop-types", "shop-api", "shop-web"],
  "branches": { "shop-api": "kbee/order-cancellation" },
  "prs": {},
  "pending": ["contracts/orders-api.md: add POST /orders/:id/cancel"]
}
```

`stage` moves through `spec`, `plan`, `build`, `review`, `ship`, and then `done`. A feature only reaches `done` once its PRs have merged and the KB has been synced.

## Editing by hand

Hand edits are fine. Follow the same rules the agents follow (they're in the KB's own `README.md`): cite every fact, describe the default branch only, and run `validate` before you commit.
