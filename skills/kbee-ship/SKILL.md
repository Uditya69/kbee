---
name: kbee-ship
description: Push a reviewed kbee feature's branches and open cross-linked pull requests in every affected repo, after one confirmation. Use as stage 5 of kbee-feature, or when the user says "ship it", "open the PRs", or "push this feature".
---

# kbee-ship

Stage 5 of 6. Shipping ends at pull requests. It doesn't merge or deploy. Read [references/approval-rules.md](references/approval-rules.md).

## 1. Read the KB first

Read `status.json` (the stage should be `review`), `spec.md`, and `review.md`. If `review.md` has open blocking findings, stop and say so.

## 2. Ask before pushing

Show what will happen, then ask once for all repos:

- each repo, its branch `kbee/<slug>`, and its commit count
- the PR title: `<Title>` (`[n/N]` when more than one repo)
- the merge order from `plan.md` (producers first)

Push only after a yes. Partial yeses are fine: ship only the repos the user approved.

## 3. Push and open the PRs

For each approved repo, in plan order:

1. `git push -u origin kbee/<slug>`
2. Open a PR against the default branch. With the GitHub CLI: `gh pr create --base <default> --head kbee/<slug> --title ... --body ...`. Use the equivalent for other hosts if one is available.
3. Record each PR URL in `status.json.prs`.

After all PRs exist, **cross-link** them: edit each PR body (`gh pr edit <url> --body ...`) to list every sibling PR and the merge order.

PR body:

```
<one-paragraph summary from spec.md>

Part of <Title> [n/N]. Merge in this order:
1. <repo>: <url>
2. ...

Acceptance criteria: <from spec.md>
Contracts changed: <from spec.md>
```

## 4. No PR tool?

If `gh` (or a host CLI) isn't installed or authenticated, still push after the yes, then print ready-to-paste **PR descriptions** for each repo, with the branch names and the compare URLs if you can build them. Ask the user to paste the PR URLs back so you can record them in `status.json`.

## 5. Hand off

Set `status.json.stage` to `ship`, run **kbee-sync** feature mode, and commit the KB (`kb: ship <slug>`). Ask before pushing the KB too.

Tell the user that once the PRs merge, **kbee-sync** (merge mode) will fold the changes into the KB.
