---
name: kbee-kb
description: Ask the kbee knowledge base (KB) questions, expand it with new knowledge, add a repo, or fix something it got wrong. Use when the user asks how their repos fit together, says "add this repo to the KB", "document how X works", "the KB is wrong about Y", or wants to explore or grow the KB.
---

# kbee-kb

Read [references/accuracy-rules.md](references/accuracy-rules.md) and [references/approval-rules.md](references/approval-rules.md) first. Find the KB as described in [references/kb-discovery.md](references/kb-discovery.md). If there's no KB, offer **kbee-init**.

The helper is `<skill-dir>/scripts/kbee-tool.mjs`, where `<skill-dir>` is the folder containing this SKILL.md. If Node is not available, use the manual fallbacks in `references/accuracy-rules.md`.

Before anything else, run the gap check: `node <skill-dir>/scripts/kbee-tool.mjs stale <kb>`. Mention any stale or missing repo, and offer **kbee-sync** if something is stale.

Work out which of the four intents the user means.

## Ask

Answer from the KB, and confirm against the code.

- Find the answer in the KB files and follow their citations into the code (`node <skill-dir>/scripts/kbee-tool.mjs show <kb> "<citation>"`).
- Cite every claim in your answer, the same way the KB does.
- If a cited section is stale, check the current code before answering, and say that you did.
- If neither the KB nor the code answers it, say **"I don't know"**, add the question to `gaps.md`, and offer to research it (that's Expand).

## Expand

The user wants new knowledge, such as "document how payments work" or "map our events".

1. Research the code across the listed repos, at each repo's default-branch SHA.
2. Draft summary-level KB text, citing every fact. Put it in the right file per [references/kb-layout.md](references/kb-layout.md): a new contract, a section of an overview, or a decision.
3. Run the verify pass, then `node <skill-dir>/scripts/kbee-tool.mjs validate <kb>`.
4. Show the draft and ask for approval. Write only what the user approves.

## Add a repo

1. Get the repo's link or path. Clone it next to the KB if needed.
2. Scan it the way **kbee-init** step 3 describes, for this one repo.
3. Add it to manifest.json before verifying (`name`, `url`, `defaultBranch`, `pathHint`, and `syncedSha` set to the SHA you scanned). Otherwise `validate` reports every citation of the new repo as `REPO_UNKNOWN`. Manifest entries are bookkeeping. If the user declines the repo in the end, remove the entry.
4. Draft `repos/<repo>/`. Then look for connections to the repos already listed, and draft changes to `system-map.md` and `contracts/`.
5. Verify the drafts (verify pass, then `validate`), show everything, and write it on approval.
6. Offer the pointer block (see `references/kb-discovery.md`).

## Fix

The user says the KB is wrong.

1. Check their correction against the code. If the code supports them, propose the fix with new citations. If it doesn't, show the user what the code says and ask how to proceed.
2. Facts the code can't show, such as a decision's reason, may cite the user: `[source: user, YYYY-MM-DD]`.
3. Show the change and write it on approval.

## Finish

Commit any approved KB changes (`kb: <what changed>`) and ask before pushing.
