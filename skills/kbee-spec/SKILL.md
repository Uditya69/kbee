---
name: kbee-spec
description: Turn a feature idea or ticket into a clear spec that knows which repos and contracts it touches, using the kbee knowledge base. Use as the first stage of kbee-feature, or when the user says "spec this", "write a spec for", or "what would it take to build X across our repos".
---

# kbee-spec

Stage 1 of 6. The output is `features/<slug>/spec.md` in the KB repo. Read [references/accuracy-rules.md](references/accuracy-rules.md), [references/approval-rules.md](references/approval-rules.md), and [references/kb-layout.md](references/kb-layout.md).


`<skill-dir>` below is the folder containing this SKILL.md. If Node is not available, use the manual fallbacks in `references/accuracy-rules.md`.
## 1. Read the KB first

Find the KB ([references/kb-discovery.md](references/kb-discovery.md)). If there is none, offer **kbee-init** and stop.

Run the gap check from **kbee-sync**: `node <skill-dir>/scripts/kbee-tool.mjs stale <kb>`. If a repo this feature likely touches is stale, say so. You can still continue, but verify those facts against the current code as you go.

Then read `system-map.md`, the relevant `repos/*/overview.md`, and every contract the idea might touch.

## 2. Understand the idea

Ask questions only where the idea is ambiguous and a wrong guess would change what gets built. Ask one at a time. When the KB answers something, don't ask.

## 3. Create the feature folder

- **slug:** kebab-case from the title, at most 40 characters. If `features/<slug>/` already exists for a different feature, add `-2`, `-3`, and so on.
- Write `features/<slug>/status.json` with `stage: "spec"` and `approved: { "spec": false, "plan": false }`, following the schema in `references/kb-layout.md`.

## 4. Write spec.md

```
# <Title>

## Problem
## Acceptance criteria   (numbered, each one testable)
## Affected repos        (each with what changes there and why, citing the KB)
## Contracts touched     (each contracts/<topic>.md, the change, and every consumer that must follow)
## Out of scope
## Open questions
```

- For the **affected repos**, use the contracts to find every consumer of anything you change. A change to a producer without its consumers is a bug.
- Statements about existing code carry citations. Statements about the new behavior don't need them.
- Set `status.json.repos` to the affected repos.

This is bookkeeping, so write it without asking.

## 5. Hand off

Show the user the spec in short form: the acceptance criteria, the affected repos, and the contracts touched.

- When running inside **kbee-feature**, stop here. kbee-feature asks for approval.
- When running alone, ask whether the spec is approved. On a yes, set `status.json.approved.spec` to `true`.

Then run **kbee-sync** feature mode, and commit the KB (`kb: spec <slug>`).
