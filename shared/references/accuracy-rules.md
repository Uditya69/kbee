# Accuracy rules

A wrong knowledge base (KB) is worse than an empty one. Follow these rules every time you write to the KB.

## 1. Every fact cites its source

Facts about code need a **code citation**:

- `[repo@sha:path:line]`, for example `[shop-api@a1b2c3d:src/orders.ts:42]`
- `[repo@sha:path:start-end]`, for example `[shop-api@a1b2c3d:src/orders.ts:10-24]`

`repo` is the repo's `name` in `manifest.json`. `sha` is 7–40 lowercase hex characters: the commit of the repo's **default branch** that you read. `path` uses forward slashes and is relative to the git root, which is the top of the git repo even in a monorepo. For a package entry like `packages/api`, a citation reads `[shop-api@a1b2c3d:packages/api/src/orders.ts:42]`. Lines are 1-based.

Facts the code can't show, such as decisions and the "why" behind them, may use a **non-code citation**:

- `[source: user, YYYY-MM-DD]`, for something the user told you on that date
- `[source: https://...]`, for a doc, PR, or ticket

If a fact has no citation, don't write it.

## 2. Verify before writing

After drafting KB text, run a separate verify pass:

1. Reread every cited range (`show`, below).
2. Confirm that the cited lines actually support the sentence.
3. Delete the claim, or move it to `gaps.md` as a question, if it isn't confirmed.

Never "fix" a citation by guessing another line. Reread the code instead.

## 3. Track freshness

`manifest.json` records the commit each repo was last synced at (`syncedSha`). Before trusting the KB, check staleness (`stale`, below). Treat KB files that cite changed files of a stale repo as unconfirmed until re-verified.

## 4. Uncertain means ask

If you can't confirm something, don't guess. Add a question to `gaps.md` and tell the user.

## The helper and its manual fallbacks

The optional helper lives next to this file at `../scripts/kbee-tool.mjs`. It needs Node 18 or later. Run it as `node <skill-dir>/scripts/kbee-tool.mjs <command> ...`. It prints JSON. If it reports an error, the output is `{"error":{"code","message"}}` and the exit code is 1.

If Node is not available, do the same thing by hand:

| Command | What it does | Manual fallback |
|---------|--------------|-----------------|
| `find [dir]` | Locates the KB (see `kb-discovery.md`). | Follow the order in `kb-discovery.md`. |
| `resolve <kb> <repo>` | Gives the repo's local path. | Use `.kbee.local.json` `repos.<name>` if present, otherwise `pathHint` relative to the KB. |
| `validate <kb>` | Checks every citation in `system-map.md`, `repos/`, `contracts/`, `decisions/`, and reports anything shaped like `[x@y]` that isn't a valid citation as `BAD_CITATION`. | For each code citation: `git -C <repo> cat-file -e <sha>^{commit}`, then `git -C <repo> show <sha>:<path>`, then check the line range exists. Non-code citations must match the two forms above. |
| `show <kb> "<citation>" [context]` | Prints the cited lines with context. | `git -C <repo> show <sha>:<path>` and read the lines. |
| `stale <kb> [--no-fetch]` | Compares `syncedSha` with the remote default branch and lists the KB files that cite changed files. | `git -C <repo> fetch origin <branch>`, then `git -C <repo> diff --name-only --no-renames <syncedSha> origin/<branch>`. `--no-renames` makes renamed files appear under their old path too. Then search the KB fact files for citations of those paths. |
| `set-synced <kb> <repo> <sha>` | Records a verified sync, and refuses a SHA that doesn't descend from the current `syncedSha`. | Check `git -C <repo> merge-base --is-ancestor <syncedSha> <sha>` succeeds, then edit `manifest.json`: set `syncedSha` to the full SHA and `syncedAt` to the current ISO time. |
