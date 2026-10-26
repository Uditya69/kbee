---
name: kbee-ship
description: Push a reviewed kbee feature's branches and open cross-linked pull requests in every affected repo, after one confirmation. Use as stage 5 of kbee-feature, or when the user says "ship it", "open the PRs", or "push this feature".
---

# kbee-ship

Stage 5 of 6. Shipping ends at pull requests. It doesn't merge or deploy. Read [references/approval-rules.md](references/approval-rules.md).

## 1. Read the KB first

Read `status.json` (the stage should be `review`), `spec.md`, and `review.md`. If `review.md` has open blocking findings, stop and say so.

## 2. Ask before pushing

Show what will happen, then ask once for all repos. This is the **pre-push summary**:

- each git repo, its branch `kbee/<slug>`, and its commit count. Monorepo packages share **one PR per git repo** (`roots` in the helper groups them), so list the packages under their repo
- **in-repo KB:** the KB fact changes on the branch, each with its verified text. The yes to push covers them (see `references/approval-rules.md`). For any the user declines, undo them in a new commit on the branch before pushing (`kb: drop declined <slug> facts`), rerun `validate`, and log them in `gaps.md`
- the PR title: `<Title>` (`[n/N]` when more than one repo)
- the merge order from `plan.md` (producers first)
- if the feature came from a ticket: "Also post the PR links to <ticket>?" (see 3b)

Push only after a yes. Partial yeses are fine: ship only the repos the user approved.

## 3. Push and open the PRs

For each approved git repo, in plan order (one PR per git repo, even when several packages changed):

1. `git push -u origin kbee/<slug>`
2. Open a PR against the default branch. With the GitHub CLI: `gh pr create --base <default> --head kbee/<slug> --title ... --body ...`. Use the equivalent for other hosts if one is available.
3. Record each PR URL in `status.json.prs`, for every entry in that git repo.

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

Add a line to every PR body linking the source ticket, if there is one (`status.json.source.url`).

## 3b. Update the ticket

If the feature came from a ticket and your agent has the tool for it (Jira, GitHub Issues), offer to **comment on the ticket** with the PR links, the merge order, and a two-line summary of the spec. Ask before posting: comments are visible to the team. Put the question together with the push question in step 2, so it's one prompt, not two.

**Never change the ticket status unless** the user asks for it (for example "and move it to In Review").

## 4. No PR tool?

If `gh` (or a host CLI) isn't installed or authenticated, still push after the yes, then print ready-to-paste **PR descriptions** for each repo, with the branch names and the compare URLs if you can build them. Ask the user to paste the PR URLs back so you can record them in `status.json`.

## 5. Hand off

**Separate KB:** set `status.json.stage` to `ship`, run **kbee-sync** feature mode, and commit the KB (`kb: ship <slug>`). Ask before pushing the KB too. Tell the user that once the PRs merge, **kbee-sync** (merge mode) will fold the changes into the KB.

**In-repo KB:** set `status.json.stage` to `shipped` and record the PR URLs, commit it on `kbee/<slug>` (`kb: ship <slug>`), and push it to the same branch. The yes in step 2 covers this follow-up push. Tell the user the docs merge with the code: there's nothing to sync afterwards.
