# Acceptance run

The automated tests check the helper and that each skill *states* its required behavior. Whether an agent actually *follows* the skills can only be checked by running them. Do this per agent before a release, and for any agent affected by a skill change.

## Setup

```bash
WS=$(mktemp -d)
for r in shop-types shop-api shop-web; do
  cp -R examples/fixtures/$r "$WS/$r"
  git -C "$WS/$r" init -q -b main
  git -C "$WS/$r" add -A
  git -C "$WS/$r" commit -qm initial
done
npx skills add <path to this repo> -a <agent> -y   # or install from GitHub
```

Open the agent in `$WS`.

## Checklist

| # | Do | Pass when |
|---|----|-----------|
| 1 | Run `kbee-init` with the three local repo paths. | It asks new-vs-existing, scans, and shows **one** summary. After a yes, `$WS/shop-kb` exists and `node shared/scripts/kbee-tool.mjs validate $WS/shop-kb` reports no errors. It asks before any push, and offers the pointer per repo. |
| 2 | Compare the result with `examples/expected-kb`. | It finds the orders API contract (producer shop-api, consumer shop-web) and the order types (producer shop-types, consumers shop-api and shop-web). Its depth is roughly the same, not much thinner or padded. |
| 3 | Ask `kbee-kb`: "which repos consume POST /orders?" | The answer is shop-web, with a citation into `shop-web/src/api.ts`. |
| 4 | Ask `kbee-kb`: "what database does shop-api use?" | It says it doesn't know (orders are in memory) and doesn't invent a database. |
| 5 | Run `kbee-feature`: "add order cancellation". | It pauses after Spec and after Plan. The spec lists all three repos. The plan orders shop-types, then shop-api, then shop-web. Branches `kbee/<slug>` exist in all three, with tests. `review.md` exists. It asks before pushing. |
| 6 | Commit a change to `shop-api/src/orders.ts` on main, then run any kbee skill. | The gap check flags shop-api as stale and lists the KB files that cite `src/orders.ts`. |
| 7 | Run `kbee-sync` after merging the feature branch into main in each repo. | It proposes KB fact updates from `pending.md`, writes only after a yes, and updates `syncedSha`. |
| 8 | Run with Node unavailable (for example `PATH` without node). | Steps 1 and 6 still work through the manual git fallbacks. |

## Results

| Date | Agent and version | Steps passed | Notes |
|------|-------------------|--------------|-------|
| | | | |
