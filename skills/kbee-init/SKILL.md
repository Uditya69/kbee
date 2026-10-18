---
name: kbee-init
description: Set up kbee - build a shared, cited knowledge base (KB) for one or more code repos, or join an existing KB. Use when the user says "set up kbee", "create a knowledge base", "connect my repos", "kbee init", or "join our team's KB".
---

# kbee-init

Builds the shared knowledge base (KB) that every other kbee skill reads. The KB is its own git repo with plain Markdown files, described in [references/kb-layout.md](references/kb-layout.md).

The rules in [references/accuracy-rules.md](references/accuracy-rules.md) and [references/approval-rules.md](references/approval-rules.md) apply to every step. Read them first.

The helper is `<skill-dir>/scripts/kbee-tool.mjs`, where `<skill-dir>` is the folder containing this SKILL.md. If Node is not available, use the manual fallbacks in `references/accuracy-rules.md`.

## 1. New KB or existing KB?

Ask the user one question: create a new KB, or join an **existing KB**?

- **Existing KB:** ask for its git URL or local path. Then go to [Joining an existing KB](#joining-an-existing-kb).
- **New KB:** ask where to create it. The default is a folder `<name>-kb` next to the code repos (for example `../shop-kb`). Run `git init` there.

## 2. Collect the repo links

Ask for the **repo links**: git URLs or local paths, any number. One repo is fine.

- For each URL that isn't already on disk, clone it next to the KB folder. Ask first if that folder already has unrelated content.
- Name each repo after its folder, lowercased, matching `^[a-z0-9][a-z0-9._-]*$`.
- Detect each repo's default branch: `git -C <repo> symbolic-ref --short refs/remotes/origin/HEAD`, falling back to `main`, then `master`. Read the KB facts from that branch. If the working copy is on another branch, read files with `git show <sha>:<path>` rather than checking out.
- **Monorepos:** if a repo holds several packages or apps (workspaces, `packages/*`, `apps/*`), ask whether to treat each one as its own entry. Each entry's `pathHint` then points at the package folder.
- **Limits:** v1 is built for up to about 10 repos of up to about 100k lines each. If the user goes past that, say so and offer to scope down to the key repos or packages.

## 3. Scan each repo

For each repo, at its default-branch SHA, extract raw facts with a citation for each one:

- purpose (README) and stack (manifests such as `package.json`, `pyproject.toml`, `go.mod`, `pom.xml`)
- entry points, and how to run, test, and build (scripts, Makefile, CI config)
- what it exposes: HTTP routes, events and topics, exported types, CLI commands, database tables
- what it consumes: outbound HTTP calls, imports of other listed repos, shared packages, env/config that points at other services
- conventions you see repeated at least twice: error format, naming, test layout

**Use subagents if your agent has them.** Give each repo (or each large folder) to its own subagent, on the fastest and cheapest model available. Each one returns a list of facts with citations. If your agent has no subagents or can't choose a model, scan one repo after another on the current model. The result is the same, only slower.

## 4. Write the KB

On the strongest model available, turn the facts into the files in `references/kb-layout.md`:

- `README.md` from [templates/kb/README.md](templates/kb/README.md), with `{{KB_NAME}}` replaced
- `gaps.md` from [templates/kb/gaps.md](templates/kb/gaps.md)
- `.gitignore` containing `.kbee.local.json`
- `system-map.md`, with a table of repos, a Mermaid diagram of how they connect, and links to the contracts
- `repos/<repo>/overview.md` and `repos/<repo>/conventions.md`
- `contracts/<topic>.md` for each thing that crosses a repo boundary, naming its producer and consumers
- `decisions/` only for decisions the code or docs actually state. Don't invent reasons
- `manifest.json` with each repo's `syncedSha` set to the SHA you read

Stay summary-level: what someone needs to work across repos, not every internal function. Match a cross-repo call to its producer (for example, `fetch('/orders')` in the web app matched to the `/orders` route in the API) only when the code supports the match. Otherwise record it in `gaps.md`.

## 5. Verify

Run the verify pass from `references/accuracy-rules.md` on every fact file, then run:

```
node <skill-dir>/scripts/kbee-tool.mjs validate <kb>
```

Fix or remove every reported citation, and rerun until it reports no errors. Drop any claim you can't confirm, or move it to `gaps.md` as a question.

## 6. One summary, one approval

Show **one summary**:

- the repos and what each owns
- the cross-repo connections found, and the contracts written
- anything you were unsure about (the `gaps.md` entries)

Ask for a single yes to keep the KB as a whole. Apply any corrections the user gives, re-verifying them, before committing.

## 7. Commit, then ask before pushing

Commit the KB (`kb: initial knowledge base`). Ask **before pushing**, and if there's a remote, ask which one.

## 8. Offer the pointer

For each code repo, offer to add the **pointer** block from [templates/pointer-snippet.md](templates/pointer-snippet.md) to its `AGENTS.md` (create the file if needed), with `{{KB_PATH}}` set to the KB's path relative to that repo. Do this **only with permission**, per repo, and commit nothing in a code repo without asking. Agents opened in that repo will then find the KB.

## Joining an existing KB

1. Clone or locate the KB. Check that its `manifest.json` is valid (`node <skill-dir>/scripts/kbee-tool.mjs validate <kb>` also checks this).
2. For each repo in the manifest, find it locally (`node <skill-dir>/scripts/kbee-tool.mjs resolve <kb> <repo>`), or offer to clone it from its `url` next to the KB. If a repo lives somewhere other than its `pathHint`, write `.kbee.local.json` in the KB with the real path. That file is git-ignored.
3. Don't rebuild the KB. Run `node <skill-dir>/scripts/kbee-tool.mjs stale <kb>` and report what's fresh, stale, or missing. Offer the **kbee-sync** skill for anything stale.
4. Offer the pointer, as in step 8.

## Finish

Tell the user the KB is ready, where it lives, and the next commands: **kbee-feature** to build something, and **kbee-kb** to ask the KB questions or grow it.
