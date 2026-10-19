---
name: kbee-implement
description: Implement an approved kbee feature plan across repos, test-first, in the plan's dependency order. Use as stage 3 of kbee-feature, or when the user says "build the plan" or "implement this feature".
---

# kbee-implement

Stage 3 of 6. Read [references/kb-layout.md](references/kb-layout.md) and [references/approval-rules.md](references/approval-rules.md).


`<skill-dir>` below is the folder containing this SKILL.md. If Node is not available, use the manual fallbacks in `references/accuracy-rules.md`.
## 1. Read the KB first

- Read `features/<slug>/status.json`. If `approved.plan` isn't `true`, stop and ask for plan approval.
- Read `plan.md`, `spec.md`, and the KB files of each repo in the plan.
- Run the gap check (`node <skill-dir>/scripts/kbee-tool.mjs stale <kb>`). If a repo you're about to change is stale, reread its cited code before relying on the KB.

## 2. Prepare each repo

For each repo in the plan:

1. Find it: `node <skill-dir>/scripts/kbee-tool.mjs resolve <kb> <repo>`. Without Node, use `.kbee.local.json` or `pathHint`.
2. Make sure the working tree is clean. If it isn't, stop and ask, and never discard the user's changes.
3. Update the default branch (`git pull --ff-only`), then create the branch **`kbee/<slug>`**, or switch to it if it exists.
4. Record the branch in `status.json.branches`.

## 3. Build, one repo at a time

Work **one repo at a time**, in the plan's order. For each task:

1. Write the **failing test** the plan names.
2. Run it with the repo's test command (from `repos/<repo>/overview.md`) and confirm it fails for the right reason.
3. Write the smallest change that makes it pass.
4. Run the repo's full test suite.
5. Commit on `kbee/<slug>` with a clear message.

Follow the repo's conventions in `repos/<repo>/conventions.md`.

When a consumer depends on a producer change that isn't published yet (for example a shared-types package), link it locally the way the repo already does (workspaces, `file:` deps, `replace` directives). Note in `plan.md` what has to happen at release time.

If the plan turns out to be wrong (a missing step, or a consumer the plan didn't list), make the smallest fix that satisfies the spec, write it into `plan.md` under **Changes during build**, and tell the user at the end.

## 4. Hand off

Set `status.json.stage` to `build`, then hand off to **kbee-review**. Run **kbee-sync** feature mode so `pending.md` records what this build will change in the KB, then commit the KB (`kb: build <slug>`) so the feature's state is shared. Don't push anything. That's **kbee-ship**'s job.
