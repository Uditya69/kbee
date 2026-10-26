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
- **Upgrade mode:** runs when the KB was built with older kbee rules, or when the user asks ("upgrade the KB"). It brings an existing KB up to the current rules without rebuilding it.

## Gap check (both modes, run first)

1. `node <skill-dir>/scripts/kbee-tool.mjs stale <kb>` lists each repo as `fresh`, `stale`, `missing`, or `unknown`.
   - For `stale` repos, the KB files that cite changed code are listed in `affectedKbFiles`.
   - `fetchFailed: true` means the remote couldn't be reached and the result reflects local refs. Say so.
2. Look for repos in the workspace (folders next to the KB, or ones the user mentions) that aren't in `manifest.json`. Offer to add them with the **kbee-kb** skill.
3. `node <skill-dir>/scripts/kbee-tool.mjs rules <kb>` compares the KB's `rulesVersion` with this kbee's. If `outdated` is true, say so (for example "this KB was built with kbee rules v1; v2 adds data flow and field-level contracts") and offer upgrade mode. Without Node: a missing `rulesVersion` in `manifest.json` means v1, and the current version is the highest `## vN` in `references/rules-changelog.md`.
4. Report what you found in a few lines. A `missing` repo isn't an error: offer to clone it, or to record its local path in `.kbee.local.json`.

## In-repo KBs

When `manifest.json` has `"location": "in-repo"`, the KB shares the code's git history, and docs merge with the code:

- **Feature mode** writes the KB fact changes **on the feature branch** `kbee/<slug>`, next to the code, instead of `pending.md`. Draft each change, cite it without a commit (`[repo:path:line]`), run the verify pass and `validate` on the branch, and commit it there (`kb: <slug> facts`). The user approves these in **kbee-ship**'s pre-push summary, so don't add a prompt here.
- There's **no merge mode** for in-repo KBs: the facts are already in the PR. A `shipped` feature counts as done once its records are on the default branch (that proves the merge, even after a squash merge).
- The **gap check** works the same: `stale` reads git history instead of `syncedSha`, and lists the KB files and team docs whose cited or mentioned files changed after their last commit. Re-verify those, propose fixes, write on a yes, and commit on the current branch. There's no `set-synced`.

## Team docs

`manifest.json` `teamDocs` lists the team's own docs that kbee looks after (see `references/kb-layout.md`). In every mode, treat them like fact files: when the gap check lists one in `affectedKbFiles`, reread the code it mentions, propose the fix as an edit in the doc's own style, and write it only on a yes. Don't add kbee citations to them.

## Feature mode

For a separate KB, the feature's code lives on branches that aren't merged yet, so **don't touch the fact files**. (In-repo KBs: see above.)

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

## Upgrade mode

Brings the KB up to the current rules. It only adds and corrects, and never rebuilds from scratch.

1. Run `node <skill-dir>/scripts/kbee-tool.mjs rules <kb>`. Its `changes` are the entries of [references/rules-changelog.md](references/rules-changelog.md) newer than the KB's version. Each one lists the passes to apply.
2. Make sure the KB is fresh first. If repos are stale, run merge mode before upgrading (for an in-repo KB, re-verify the stale files instead), so new facts aren't mixed with outdated ones.
3. Tell the user which passes you'll run, and roughly how big the job is.
4. Apply each pass, in version order, to the existing KB, at each repo's current default-branch SHA. Scan only what each pass needs. Keep existing facts unless a pass shows they're wrong.
5. Draft, verify (the verify pass, then `validate`), then **show the changes grouped by pass** before writing. The same approval rules apply: facts need a yes, and `gaps.md` and `features/` entries are bookkeeping.
6. Write what the user approved. Then record the upgrade: `node <skill-dir>/scripts/kbee-tool.mjs set-rules <kb> <version>`, with the highest version whose passes were all applied. If the user declined a whole pass, stop at the version before it and say so.
7. Commit the KB (`kb: upgrade to rules v<version>`) and ask before pushing.

## Rules

- Never write facts based on unmerged code into a separate KB. (In-repo KBs write them on the feature branch, where they merge with that code.)
- Never move `syncedSha` forward past code you haven't re-verified.
- If a cited file was deleted or renamed, find where the behavior lives now and re-cite it. If it's gone, propose removing the fact.
