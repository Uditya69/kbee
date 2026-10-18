---
name: kbee-review
description: Review a kbee feature's changes across repos for correctness and for broken cross-repo contracts, using the knowledge base's producer/consumer map. Use as stage 4 of kbee-feature, or when the user says "review this feature" or "will this break other repos".
---

# kbee-review

Stage 4 of 6. The output is `features/<slug>/review.md`. Read [references/kb-layout.md](references/kb-layout.md).

## 1. Read the KB first

Read `spec.md`, `plan.md`, `status.json.branches`, and every contract the spec or the diff touches. Get each repo's diff with `git -C <repo> diff <default branch>...kbee/<slug>`.

## 2. Check correctness

For each repo, check:

- Does each acceptance criterion in `spec.md` have code and a test that proves it?
- Bugs: wrong logic, unhandled errors, edge cases the tests miss.
- Does the code follow `repos/<repo>/conventions.md`?
- Does the full test suite pass? Run it, and don't trust earlier runs.

## 3. Check the contracts

This is the check single-repo reviews can't do.

- For every changed route, event, exported type, or shared table, find its contract in `contracts/`. If there isn't one, look for consumers in the other repos' code.
- For each listed **consumer**, check that the feature's changes in that repo match the new shape. A field that's renamed, removed, newly required, or changed in type, with any consumer not updated, is **blocking**.
- Check deploy order: if a consumer would break while the producer isn't deployed yet, flag it.

## 4. Write review.md

```
# Review: <Title>
## Blocking
- [repo] <finding> (<file:line>), and why it breaks
## Non-blocking
- ...
## Contracts checked
- contracts/<topic>.md: producer ok / consumers ok
```

## 5. Hand off

- With any **blocking** findings, go back to **kbee-build** with the list. kbee-feature limits this loop to 3 rounds, then asks the user.
- With none, set `status.json.stage` to `review` and hand off to **kbee-ship**.

Run **kbee-sync** feature mode.
