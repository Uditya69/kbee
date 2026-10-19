---
name: kbee-plan
description: Break an approved kbee feature spec into tasks per repo, ordered so producers change before their consumers, each with the test that proves it. Use as stage 2 of kbee-feature, or when the user says "plan this feature" or "break this down across repos".
---

# kbee-plan

Stage 2 of 6. The output is `features/<slug>/plan.md`. Read [references/approval-rules.md](references/approval-rules.md) and [references/kb-layout.md](references/kb-layout.md).

## 1. Check the spec is approved

Read `features/<slug>/status.json`. If `approved.spec` isn't `true`, stop and ask the user to approve the spec first. When the user runs this skill on its own and explicitly says to go ahead, proceed and note that in `plan.md`.

## 2. Read the KB and the code

Read `spec.md`, then for each affected repo, `repos/<repo>/overview.md`, `conventions.md`, and the contracts the spec touches. Open the cited code wherever you need the details.

## 3. Write plan.md

```
# Plan: <Title>

## Order
1. shop-types: <why first>
2. shop-api: <depends on 1>
3. shop-web: <depends on 2>

## <repo>
### Task <n>: <name>
- Files: <paths>
- Change: <what, in one or two lines>
- Test: <the test that proves it, and the repo's test command from overview.md>
- Contracts: <contracts/<topic>.md, if this changes one>
```

Rules:

- Group the tasks **per repo**, and give a **dependency order** across repos. Producers (shared types, APIs, events) come before their consumers. When a consumer can't ship before its producer is deployed, say so.
- Every task names its **test**. Use the repo's own test framework and conventions.
- Every change to a contract lists the consumers that need to change, matching the spec's **contracts** section. If you find a consumer the spec missed, add it to the plan and flag it to the user.
- Keep tasks small: one reviewable change each.
- **UI tasks with a design:** if `status.json.source` has **Figma** links, attach the relevant frame link to each UI task, along with the components and design tokens it uses. Reuse the repo's existing components wherever they match the design.

## 4. Hand off

Set `status.json.stage` to `plan`.

- When running inside **kbee-feature**, stop here. kbee-feature asks for approval.
- When running alone, ask whether the plan is approved. On a yes, set `approved.plan` to `true`.

Then run **kbee-sync** feature mode, and commit the KB (`kb: plan <slug>`).
