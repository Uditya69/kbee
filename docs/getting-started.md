# Getting started

**The short version:** install, then type `/kbee build PROJ-123` (or `/kbee build "what you want"`). The first time, kbee asks for your repo links and builds the knowledge base. After that it asks you just three things: is the spec right, is the plan right, and can it open the PRs. The rest of this page walks through what happens in detail.

This guide takes you from zero to a shared knowledge base (KB) and your first feature shipped across repos. It uses the example "shop" system: `shop-api`, `shop-web`, and `shop-types`. Swap in your own repos.

## 1. Install

From the folder where you'll open your coding agent:

```bash
npx skills add oct8-studio/kbee
```

The installer asks which agents to install for. To skip the question, name the agents yourself (for example `-a claude-code cursor`), or add `-g` to install for your user rather than this project. See [Agents and setup](agents.md).

**You need:** git and a coding agent. Node.js 18 or later and the GitHub CLI (`gh`) are optional but make things faster.

## 2. Lay out your folders

**One repo or a monorepo?** Open your agent at its root. kbee asks where the KB should go and suggests `kb/` inside the repo. Its updates then ride along in your feature PRs. **Already have a KB or a docs folder** (any format)? Run `/kbee audit` instead of `/kbee init`: it checks what you have against the code and makes it work with kbee.

**Several repos?** kbee works best when your repos and the KB sit side by side:

```
~/code/shop/
  shop-api/
  shop-web/
  shop-types/
  shop-kb/        <- kbee creates this
```

Open your agent in `~/code/shop/` (the parent folder), so it can see every repo. If your repos aren't cloned yet, kbee can clone them for you.

## 3. Build the knowledge base

Type:

> /kbee init

and give it your repo paths or links when it asks, for example `../shop-api ../shop-web ../shop-types`. You can also skip this step: `/kbee build` sets up the KB first if it can't find one.

kbee will:

1. **Ask:** new KB or join an existing one? Answer "new". If it finds a hand-written KB, it suggests `/kbee audit` instead.
2. **Ask for your repo links:** git URLs or local paths. It works out each repo's default branch, then asks where the KB goes: `./shop-kb` for several repos, or `kb/` inside the repo for one repo or a monorepo.
3. **Scan** each repo for its stack, entry points, routes, exported types, cross-repo calls, and conventions. On agents with subagents this happens in parallel.
4. **Write and verify** the KB. Every fact gets a citation like `[shop-api@4b9f895:src/orders.ts:7-11]`, and every citation is reread before it stays.
5. **Show you one summary**: the repos, how they connect, and what it wasn't sure about. Read it and correct anything wrong. One "yes" approves the whole KB.
6. **Commit** the KB, and **ask before pushing**.
7. **Offer a pointer** for each code repo: a short block in that repo's `AGENTS.md` that tells future agent sessions where the KB is. Say yes for the repos you want.

Afterwards, open `shop-kb/system-map.md`. It's plain Markdown, so you can read it.

Push the KB to a remote (for example `github.com/you/shop-kb`) so teammates can use it. See [Working as a team](teams.md).

## 4. Ask the KB something

> /kbee ask "which repos consume POST /orders?"

You get an answer with citations into the code. If the KB doesn't know, it says so and logs the question in `gaps.md`. It won't guess.

## 5. Build your first feature

> /kbee build "add order cancellation"

or, with a ticket:

> /kbee build SHOP-42

With a Jira or Figma connection set up ([Jira and Figma](integrations.md)), kbee reads the ticket, its acceptance criteria, and any linked designs itself.

What happens, and where you're involved:

| Stage | What kbee does | You |
|-------|----------------|-----|
| Spec | Writes `features/order-cancellation/spec.md`: acceptance criteria, affected repos, and contracts touched. | **Approve the spec** (pause 1) |
| Plan | Writes `plan.md`: tasks per repo, producers first (`shop-types`, then `shop-api`, then `shop-web`), each with its test. | **Approve the plan** (pause 2) |
| Build | Creates `kbee/order-cancellation` branches and builds test-first, one repo at a time. | Nothing, unless something unsafe comes up |
| Review | Checks correctness, and checks every changed contract against its consumers. Loops back to Build if needed, up to 3 rounds. | Nothing |
| Ship | Shows the branches and PR plan. | **One yes** to push and open the PRs |
| Sync | Records the KB changes this feature will make in `pending.md`. | Nothing |

You get linked PRs in each repo, each listing its siblings and the merge order.

You can stop at any time. Running `kbee-feature` again **resumes** from where it left off, using `features/<slug>/status.json`.

## 6. After the PRs merge

> /kbee sync

kbee notices the merge, rereads the merged code, and **shows you** the KB updates (for example, the new cancel endpoint in `contracts/orders-api.md`). It writes them after your yes, then records the new synced commit.

## Day to day

- Before trusting the KB, every kbee skill checks whether a repo has moved on since the last sync, and tells you which KB files may be out of date.
- To teach the KB something new: "Use kbee-kb: document how payments work", or "add ../shop-worker to the KB".
- To correct it: "Use kbee-kb: the KB is wrong, shop-api uses Postgres now."

Next: the [Skills reference](skills.md).
