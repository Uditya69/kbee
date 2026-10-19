# Troubleshooting and FAQ

## Messages you might see

**"No KB found."** kbee looks in your current folder and its parents, then for a pointer block in the repo's `AGENTS.md`/`CLAUDE.md`, then in sibling folders. Fix it by doing one of these:

- open the agent in the folder that contains the KB
- tell it the path ("the KB is at ../shop-kb")
- accept the pointer when running `kbee-init`

If there are several KBs next to each other and none of them lists your repo, kbee won't guess. It asks which one you mean.

**A repo is "stale".** That repo's default branch has moved on since the KB was last verified. kbee lists the KB files that cite changed files. Run **kbee-sync** to review the updates. Until then, kbee rechecks those facts against the code before using them.

**A repo is "missing" (`REPO_NOT_FOUND`).** The repo isn't where `pathHint` says it is. Clone it next to the KB, or tell kbee where it is, and it records the path in your personal `.kbee.local.json`.

**`fetchFailed: true`.** kbee couldn't reach the remote (you're offline, there's no `origin`, or a sign-in is needed), so the staleness check used your local copy. kbee won't update facts in this state. Fix the connection, or run `git fetch` yourself, then try again. kbee never shows a credential prompt.

**`SHA_NOT_FOUND` from validate.** A cited commit isn't in your local copy. This happens with a shallow clone, or when history was rewritten. Run `git fetch --unshallow`, or run **kbee-sync** to re-cite against current code.

**`BAD_CITATION`.** Something in a fact file looks like a citation but isn't in the right format, for example a missing line number or `#L3` instead of `:3`. See [the citation formats](kb-format.md#citations).

**`SHA_NOT_DESCENDANT`.** Something tried to record a sync to an older commit than the KB already has. You're probably behind. Fetch and sync again.

**`MANIFEST_INVALID`.** `manifest.json` has a JSON error or a bad field, and the message says which. Note that a byte-order mark at the start of the file (added by some Windows editors) currently breaks parsing. Save the file as UTF-8 without a BOM.

**"This KB was built with older kbee rules."** kbee has improved since your KB was built. For example, rules v2 added data flow, field-level contracts and mirrored-logic checks. Run **kbee-sync** and say "upgrade the KB". It only adds what the newer rules require, and shows you everything first.

## FAQ

**Will kbee push or merge anything without asking?** No. Every push, in the KB or the code repos, needs a yes. kbee never merges PRs.

**Will it change the KB behind my back?** Facts never change without your approval. Bookkeeping does: feature progress, `gaps.md` entries, and the record of the last synced commit. Feature progress is saved in `features/`, never in the facts.

**Does it work with one repo?** Yes. You still get the KB, citations, freshness checks, and the full feature flow.

**Monorepos?** During init, say yes to treating each package as its own entry. Citations use paths from the git root. A commit anywhere in the monorepo can mark every package as stale, but only the KB files that cite the changed files get flagged.

**How big can it get?** v1 is built for about 10 repos of up to about 100k lines each. Past that, `kbee-init` offers to focus on the key repos or packages.

**Which model should I use?** Any capable coding model works. On agents that let skills choose models, kbee uses a fast model for scanning and a strong one for writing the KB.

**Can I edit the KB by hand?** Yes. Follow the rules in the KB's `README.md` and run `validate`. See [Knowledge base format](kb-format.md#editing-by-hand).

**The KB said something wrong. Now what?** Tell **kbee-kb**: "the KB is wrong about X". It checks your correction against the code and proposes a fix.

**I upgraded and still see `kbee-build`.** The stage was renamed to `kbee-implement`. Remove the old copy with `npx skills remove kbee-build`. You never need to call either one directly: `/kbee build` runs it.

**How do I uninstall?** Run `npx skills remove kbee-init kbee-feature …`, or `npx skills remove` and pick the skills. Your KB repo is untouched. It's just files.
