---
name: kbee-feature
description: Take a feature from idea to cross-linked pull requests across all affected repos - spec, plan, build, review, ship, and KB sync - using the kbee knowledge base. Pauses for approval after the spec and after the plan. Use when the user says "build this feature", "kbee feature", "add X across our repos", or wants to resume a kbee feature.
---

# kbee-feature

Runs the six kbee stages in order. Each stage has its own skill. If a stage skill isn't installed as a skill in your agent, read its steps from the sibling folder (`../kbee-spec/SKILL.md` and so on) and follow them.

| Stage | Skill | Output |
|-------|-------|--------|
| 1. Spec | **kbee-spec** | `features/<slug>/spec.md` |
| 2. Plan | **kbee-plan** | `features/<slug>/plan.md` |
| 3. Build | **kbee-build** | branches `kbee/<slug>` with tested commits |
| 4. Review | **kbee-review** | `features/<slug>/review.md` |
| 5. Ship | **kbee-ship** | cross-linked PRs |
| 6. Sync | **kbee-sync** | KB kept true (runs at the end of every stage) |

Progress lives in `features/<slug>/status.json` ([references/kb-layout.md](references/kb-layout.md)). Approvals follow [references/approval-rules.md](references/approval-rules.md).


`<skill-dir>` below is the folder containing this SKILL.md. If Node is not available, use the manual fallbacks in `references/accuracy-rules.md`.
## 0. Find the KB and check it

- Find the KB ([references/kb-discovery.md](references/kb-discovery.md)). If there's **no KB**, say so, offer **kbee-init**, and stop.
- Run the gap check: `node <skill-dir>/scripts/kbee-tool.mjs stale <kb>` (without Node, use the manual fallback in [references/accuracy-rules.md](references/accuracy-rules.md)). Report stale or missing repos in one or two lines, and offer **kbee-sync** before starting.
- Run `node <skill-dir>/scripts/kbee-tool.mjs rules <kb>`. If the KB was built with older kbee rules, mention it once and offer the **kbee-sync** upgrade mode. Don't block on it.

## 1. New feature, or resume?

Check `features/*/status.json` for features whose `stage` isn't `done`.

- If the user names one, or there's exactly one that matches what they asked, **resume** it from its `stage`: `spec` without `approved.spec` goes to the spec approval pause, `spec` with approval goes to Plan, `plan` without `approved.plan` goes to the plan approval pause, and so on.
- Otherwise start a new feature at Spec.

## 2. Spec, then pause

Run **kbee-spec**. Then **pause** and show the user:

- the acceptance criteria
- the affected repos and contracts
- any open questions

Ask: *"Is this spec right?"* Apply any changes they ask for. On a yes, set `approved.spec: true`. Don't continue without it.

## 3. Plan, then pause

Run **kbee-plan**. Then **pause** and show the user the repo order and the task list.

Ask: *"Good to build?"* On a yes, set `approved.plan: true`.

These two pauses, after Spec and after Plan, are the only check-ins before shipping. From here on, run without stopping, except for the cases below.

## 4. Build and review

1. Run **kbee-build**.
2. Run **kbee-review**.
3. If the review has blocking findings, run **kbee-build** again with those findings, then **kbee-review** again. After 3 rounds that still have blocking findings, stop and ask the user how to proceed.

Stop and ask during build only for:

- a dirty working tree
- a destructive or irreversible step
- a plan so wrong that every way forward is a guess

## 5. Ship

Run **kbee-ship**. It asks once before pushing and opening PRs.

## 6. Wrap up

- Make sure **kbee-sync** feature mode has recorded `pending.md`.
- Give the user a summary:
  - the PR links, in merge order
  - what changed in each repo
  - any changes made to the plan during the build
  - which KB changes are pending until merge
- Tell them that after the PRs merge, running **kbee-sync** folds the changes into the KB. Mark the feature `done` at that point, not before.
