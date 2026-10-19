<!-- generated from shared/references/rules-changelog.md; edit the source, then run npm run sync -->
# Rules changelog

Each version changes how a KB should be built. A KB records the version it was built or last upgraded to as `rulesVersion` in `manifest.json` (missing means v1). **kbee-sync** upgrade mode applies the entries newer than the KB's version, in order. Each entry lists the passes to re-run on an existing KB.

## v2

Deeper KBs: a developer should be able to change the data model across repos from the KB alone.

Passes to apply to an existing KB:

1. **Data flow and domain model.** For each repo that owns a datastore, add `## Data flow and domain model` to `repos/<repo>/overview.md`. Trace source → transforms → stored shape (collection or table, key or `_id` format, key fields) → readers. For derived or cached stores, record how they're rebuilt or backfilled when their shape changes.
2. **Field-level contract shapes.** In every `contracts/*.md`, list each field (name, type, required or optional) of every request body, query param set and response, including nested objects. Add the semantics consumers rely on: units, time zone, defaults, inclusive or exclusive bounds.
3. **Mirrored logic.** Find code copied between repos (same file name or near-identical content, comments like "mirrors the backend"). Diff the copies. Record each mirrored constant, list or rule in `contracts/shared-logic.md`, with every copy cited and any drift noted.
4. **Cross-check contracts.** For every consumer behavior that depends on the producer (a header read, a field used, a status handled), confirm the producer emits it and nothing in between (CORS, proxy, auth) blocks it. Mismatches go in `gaps.md` as possible bugs.
5. **Docs and workspace.** Read `docs/`, ADR, RCA, design and plan files in each repo and in the folder containing the repos (Makefile, docker-compose, architecture docs). Turn stated decisions into `decisions/NNNN-*.md` with `[source: ...]` citations. If a doc and the code disagree, the code wins in the facts and the disagreement goes in `gaps.md`.
6. **Scripts.** List every file under `scripts/`, `bin/` or `tools/` in the repo overview: one line each with its purpose and how to run it.
7. **Runtime model.** Per repo, record background jobs and schedulers, in-memory state or caches (and so whether it can run more than one instance), health checks, and what CI actually gates (build, tests, typecheck).
8. **Common changes.** Add `## Common changes` to `system-map.md`: for the 1–3 most likely cross-repo changes, list the files to touch in producer → consumer order, each cited, plus known traps.
9. **Gaps.** Add to `gaps.md`: doc-vs-code contradictions, code that looks like a cross-repo bug, endpoints or exports nothing consumes, and operational unknowns (where prod runs, scaling, CI).
10. **Layout.** Make sure `features/.gitkeep` exists. Create `decisions/` only if there's at least one decision.
