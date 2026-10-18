# Working as a team

The KB is an ordinary git repo, so a team shares it the same way it shares code.

## Setting it up once

1. One person runs **kbee-init** and approves the first KB.
2. They push it to a shared remote, for example `github.com/acme/shop-kb`, with the same access as the code repos.
3. Optionally, they accept the **pointer** for each code repo and merge those small `AGENTS.md` changes. After that, anyone's agent opened in a code repo finds the KB on its own.

## A teammate joining

> Use kbee-init to join our KB at git@github.com:acme/shop-kb.git

kbee:

- clones the KB
- finds the code repos (or clones them)
- writes `.kbee.local.json` if your folders are laid out differently (this file is git-ignored and personal)
- tells you which repos are stale

It doesn't rebuild anything.

## How changes flow

| What changes | Who approves | How it lands |
|--------------|--------------|--------------|
| Facts (`system-map.md`, `repos/`, `contracts/`, `decisions/`) | The person running the agent | A commit to the KB |
| Bookkeeping (`features/`, `gaps.md`, sync SHAs) | Nobody (it's automatic) | A commit to the KB |
| Any push | The person running the agent | `git push`, after a yes |

kbee runs `git pull --rebase` in the KB before each write, so you're always building on your teammates' latest changes.

### PR mode

If your team wants KB fact changes reviewed like code, set `"mode": "pr"` in `manifest.json`. kbee then puts KB changes on a `kbee/<slug-or-date>` branch and opens a PR, after asking, instead of committing to the default branch.

## Features in progress are shared

Everything about a feature lives in `features/<slug>/` in the KB:

- the spec and plan
- `status.json`, holding the stage, the approvals, the branches and the PRs
- the review
- the pending KB changes

Each stage commits it. A teammate can pull the KB and say "resume order-cancellation" to pick it up.

## Conflicts

KB files are small and split by repo and topic, so conflicts are rare. When one happens, kbee re-checks both versions against the code and keeps the one the code supports. If the code can't settle it, it asks you.

## Keeping it fresh

- Run **kbee-sync** after merges, or ask any kbee skill. They all check for staleness first.
- Declined changes are logged in `gaps.md` under "Declined". The affected repo stays marked stale until someone resolves it, so nobody trusts an outdated fact by accident.
- `gaps.md` doubles as the team's list of open questions about the system. Answer them with **kbee-kb**.
