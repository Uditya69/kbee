# kbee 🐝

**One shared brain for all your repos.** kbee is a plug-and-play AI software development lifecycle (SDLC) for coding agents. It builds a knowledge base (KB) of how your repos fit together, then takes features from idea to cross-linked pull requests across all of them while keeping that knowledge true.

It works in any agent that reads [Agent Skills](https://agentskills.io): Claude Code, Codex, Cursor, GitHub Copilot, Gemini CLI, and more.

## Quick start

```bash
npx skills add oct8-studio/kbee
```

Then, in your coding agent:

1. **`kbee-init`**: give it your repo links. It builds the KB and shows you one summary to approve.
2. **`kbee-feature`**: describe what to build. It writes a spec and a plan (pausing for your approval after each), then builds test-first, reviews against cross-repo contracts, and opens linked PRs once you say yes.

That's it. Use **`kbee-kb`** any time to ask the KB questions, or to grow it.

📖 **New here? Read the [user guide](docs/README.md)**: [getting started](docs/getting-started.md), [skills](docs/skills.md), [teams](docs/teams.md), [KB format](docs/kb-format.md), [agents](docs/agents.md), and [troubleshooting](docs/troubleshooting.md).

## Why

Coding agents see one repo at a time and forget everything between sessions. Real systems span an API, a web app, shared types, and workers. So changes break things in repos the agent never looked at.

kbee gives every agent session the same map: which repos exist, what each one owns, and who produces and consumes each API, event, and type.

## The knowledge base

The KB is **its own git repo** of plain Markdown, so your whole team shares it by pushing and pulling. See a complete example in [`examples/expected-kb`](examples/expected-kb).

```
shop-kb/
  system-map.md          # repos, what each owns, how they connect (Mermaid)
  repos/<repo>/          # overview + conventions
  contracts/             # APIs, events, shared types: producer -> consumers
  decisions/             # architecture decisions and why
  features/<slug>/       # spec, plan, status, review of in-flight work
  gaps.md                # open questions
  manifest.json          # repos + the commit each was synced at
```

**It's built to stay accurate:**

- **Every fact cites its source:** `[shop-api@a1b2c3d:src/orders.ts:7-11]`. Facts without a citation don't get written.
- **Facts are verified before writing.** Every citation is reread and checked against the code.
- **Freshness is tracked.** When a repo moves on, kbee knows which KB sections cite the changed files.
- **You approve fact changes.** kbee spots gaps and proposes fixes, but never rewrites the KB silently. Bookkeeping such as feature progress and open questions is saved automatically.
- **It describes main, not branches.** Changes from unmerged branches wait in `features/<slug>/pending.md` until their PRs merge.

## The skills

| Skill | Stage |
|-------|-------|
| `kbee-init` | Set up a KB, or join your team's existing one |
| `kbee-feature` | Run all the stages below, start to finish |
| `kbee-spec` | 1. Spec, including the affected repos and contracts |
| `kbee-plan` | 2. Tasks per repo, producers before consumers |
| `kbee-build` | 3. Test-first implementation on `kbee/<slug>` branches |
| `kbee-review` | 4. Correctness, and contract checks against every consumer |
| `kbee-ship` | 5. Push and open cross-linked PRs, after one yes |
| `kbee-sync` | 6. Keep the KB true, including after merges |
| `kbee-kb` | Ask, expand, add a repo, or fix the KB |

## Requirements

- git and a coding agent.
- **Optional:** Node.js 18 or later for the bundled helper (`scripts/kbee-tool.mjs`), which validates citations and checks staleness quickly. Without Node, the skills tell the agent how to do the same checks with plain git.
- **Optional:** the [GitHub CLI](https://cli.github.com) for opening PRs. Without it, kbee prints ready-to-paste PR descriptions.
- If your agent supports subagents with a choice of model (Claude Code does), kbee scans repos in parallel on a fast model and writes the KB on a strong one. Otherwise it works through them one by one.

**v1 is sized for** up to about 10 repos of up to about 100k lines each. In a monorepo, each package can be its own entry.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Licensed under the [MIT License](LICENSE).
