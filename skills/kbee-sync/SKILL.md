---
name: kbee-sync
description: Keep the kbee knowledge base (KB) in sync with the code - record what a feature changed, fold merged changes into the KB, and catch stale or missing knowledge. Use at the end of every kbee stage, after PRs merge, or when the user says "sync the KB", "is the KB up to date", or "refresh the knowledge base".
---

# kbee-sync

Keeps the KB true to each repo's **default branch**. Read [references/accuracy-rules.md](references/accuracy-rules.md) and [references/approval-rules.md](references/approval-rules.md) first. Find the KB as described in [references/kb-discovery.md](references/kb-discovery.md).

The helper is `<skill-dir>/scripts/kbee-tool.mjs`, where `<skill-dir>` is the folder containing this SKILL.md. If Node is not available, use the manual fallbacks in `references/accuracy-rules.md`.

This skill has two modes:

- **Feature mode:** runs at the end of each stage of a feature. It records changes that aren't merged yet.
- **Merge mode:** runs when PRs have merged, when the KB is stale, or when the user asks. It updates the facts.

## Gap check (both modes, run first)

1. `node <skill-dir>/scripts/kbee-tool.mjs stale <kb>` lists each repo as `fresh`, `stale`, `missing`, or `unknown`.
   - For `stale` repos, the KB files that cite changed code are listed in `affectedKbFiles`.
   - `fetchFailed: true` means the remote couldn't be reached and the result reflects local refs. Say so.
2. Look for repos in the workspace (folders next to the KB, or ones the user mentions) that aren't in `manifest.json`. Offer to add them with the **kbee-kb** skill.
3. Report what you found in a few lines. A `missing` repo isn't an error: offer to clone it, or to record its local path in `.kbee.local.json`.

## Feature mode

The feature's code lives on branches that aren't merged yet, so **don't touch the fact files**.

1. Read `features/<slug>/status.json` and the diff of the feature's branches against each repo's default branch.
2. Write `features/<slug>/pending.md`: each KB fact this feature will change once merged (a new route, a changed contract, a new convention), with the target KB file and the proposed text. Cite the branch commit (`[shop-api@<branch sha>:path:line]`).
3. Update `status.json.pending` with one line per item.

This is bookkeeping, so write it **without asking**, and mention it in your summary. Then commit the KB (`kb: pending <slug>`), so teammates can see the state and the next `git pull --rebase` isn't blocked.

## Merge mode

**If the gap check reported `fetchFailed` for a repo, don't write facts or run set-synced for that repo.** Local refs may be older than what the KB was last synced to. Say so, and ask the user to fix the connection or fetch by hand first.

1. **Find merged work.** For each feature in `features/*/status.json` with PRs or branches, check whether its branch has **merged** into the default branch.
   - Prefer the PR state when you can get it (`gh pr view <url> --json state`, or ask the user), because squash merges don't show up in git history.
   - Otherwise check whether `origin/kbee/<slug>` appears in `git -C <repo> branch -r --merged origin/<default branch>`.
2. **Find what to re-derive:** the `pending.md` items of merged features, plus every file in `affectedKbFiles` from the gap check.
3. **Re-derive from the default branch.** For each affected fact, reread the current code at the current default-branch SHA. Pending items are proposals: check each one against the merged code, because the merge may differ from the branch.
4. **Verify before showing.** Run the verify pass on the drafted text and check its citations with `node <skill-dir>/scripts/kbee-tool.mjs validate <kb>` (validate a draft copy, or write it and revert if it's declined). The user should only ever approve text that has already passed verification.
5. **Show the proposed change**, per [references/approval-rules.md](references/approval-rules.md): what changed in the code, and the exact verified KB text you want to write, with new citations.
6. **Write on a yes.** Write only the parts the user approved.
7. **Handle declines.** If the user declines any change for a repo, log it in `gaps.md` under Declined and **leave that repo stale**: don't run `set-synced` for it. The declined fact stays flagged until someone deals with it.
8. **Record the sync.** Only for repos where every affected fact was re-verified and written, run `node <skill-dir>/scripts/kbee-tool.mjs set-synced <kb> <repo> <sha>` with the default-branch SHA you verified against. This bookkeeping is written without asking. If it refuses with `SHA_NOT_DESCENDANT`, you're behind the last sync: fetch, then start over.
9. **Tidy up.** For merged features, set `status.json.stage` to `done` and clear the pending items that were applied.
10. Commit the KB (`kb: sync <repos>`) and ask before pushing.

## Rules

- Never write facts based on unmerged code.
- Never move `syncedSha` forward past code you haven't re-verified.
- If a cited file was deleted or renamed, find where the behavior lives now and re-cite it. If it's gone, propose removing the fact.
