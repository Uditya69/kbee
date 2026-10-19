<!-- generated from shared/templates/kb/README.md; edit the source, then run npm run sync -->
# {{KB_NAME}}

This is the shared knowledge base (KB) for these repos, maintained with [kbee](https://github.com/oct8-studio/kbee). People and coding agents both read it.

| File | What it holds |
|------|---------------|
| `system-map.md` | Every repo, what it owns, and how the repos connect |
| `repos/<repo>/` | Overview and conventions for each repo |
| `contracts/` | APIs, events, shared types, and shared tables: who produces each one and who consumes it |
| `decisions/` | Architecture decisions and the reasons behind them |
| `features/` | Feature work in progress |
| `gaps.md` | Open questions |
| `manifest.json` | The repos, and the commit each one was last synced at |

## Rules for anyone editing this KB, human or agent

1. **Cite every fact.** For code, use `[repo@sha:path:line]` or `[repo@sha:path:start-end]`. For decisions and the reasons behind them, use `[source: user, YYYY-MM-DD]` or `[source: <url>]`.
2. **Verify before writing.** Reread the cited lines and confirm they say what you wrote. If a fact can't be confirmed, move it to `gaps.md` as a question.
3. **Describe the default branch only.** Changes on unmerged branches go in `features/<slug>/pending.md` until they merge.
4. **Show before changing facts.** Changes to `system-map.md`, `repos/`, `contracts/`, or `decisions/` need a person's approval. Bookkeeping (`features/`, `gaps.md`, and sync SHAs) doesn't.
5. **Never push without asking.**
6. **Check freshness** before trusting a section. If a repo has moved past its `syncedSha` in `manifest.json`, re-check the sections that cite changed files.
