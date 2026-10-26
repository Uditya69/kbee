# Approval rules

The user must never be surprised by a change to what the KB says is true, and must not be buried in prompts either.

## Written without asking (bookkeeping)

These don't change what the KB claims about the code:

- anything under `features/<slug>/` (spec, plan, status, review notes, pending changes, PR links)
- `syncedSha` / `syncedAt` updates in `manifest.json`, but **only** after the affected facts were re-verified
- new entries in `gaps.md`

Mention them in your summary, but don't ask first.

## Shown first, written only after a yes (facts)

Any change to `system-map.md`, `repos/`, `contracts/`, or `decisions/`:

1. Say what gap or change you found and why it matters.
2. Show the proposed change: the exact new or changed text, with citations.
3. Write it only after the user says yes. Partial yeses are fine: write only the parts they approved.
4. If the user declines, record the proposal in `gaps.md` under **Declined** with the date, and don't raise it again unless the code changes.

## Init

The first KB from `kbee-init` gets **one** approval: show one summary of what you understood and what you weren't sure of, and write the KB as a whole after a yes. Don't ask fact by fact.

## In-repo KBs during a feature

With an in-repo KB, a feature's KB fact changes are written on the feature branch and merge with the code. They still need a yes, but don't add a prompt for them: **kbee-ship** lists them in its **pre-push summary** (each change, with its verified text), and the user's yes to pushing covers them. A partial yes leaves out the changes they declined: before pushing, undo them in a new commit on the branch (`kb: drop declined <slug> facts`), rerun `validate`, and log them in `gaps.md` under **Declined**. The PR review is the team's second look.

## Git

- Run `git pull --rebase` in the KB repo before every write. For an **in-repo** KB, the KB repo is the code repo:
  - on a feature branch `kbee/<slug>` that hasn't been pushed yet there's nothing to pull, so skip it;
  - KB edits outside a feature (an answer that grows the KB, an audit fix, a sync) are committed on the default branch after the usual yes, in their own commit, never mixed into an unrelated commit. In `"pr"` mode they go on a branch `kbee/kb-<topic-or-date>` cut from it, with a PR after asking.
- Commit KB changes with clear messages (`kb: update shop-api contracts`).
- **Always ask before pushing**, in the KB repo and in code repos.
- If there's a conflict, re-verify both sides against the code and keep what the code supports. If the code can't settle it, ask the user.
- **PR mode** (`"mode": "pr"` in `manifest.json`): put KB changes on a branch `kbee/<slug-or-date>` and open a PR, after asking, instead of committing to the default branch.
