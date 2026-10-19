# shop-api

The orders HTTP API, built on Express [shop-api@SHA_SHOP_API:src/orders.ts:1].

- **Entry point:** `src/server.ts` mounts the orders router with a JSON body parser [shop-api@SHA_SHOP_API:src/server.ts:4-6].
- **Port:** `PORT`, default 4000 [shop-api@SHA_SHOP_API:src/server.ts:8].
- **Run:** `npm run dev` [shop-api@SHA_SHOP_API:package.json:6]. **Test:** `npm test` (Vitest) [shop-api@SHA_SHOP_API:package.json:7].
- **Storage:** orders are kept in an in-memory `Map`, so they're lost on restart [shop-api@SHA_SHOP_API:src/orders.ts:4].
- **Exposes:** the [orders API](../../contracts/orders-api.md).

## Data flow and domain model

1. `POST /orders` receives `{ customerId, items }` and rejects the order if `customerId` is missing or `items` is empty [shop-api@SHA_SHOP_API:src/orders.ts:14-17].
2. The server computes `totalCents` as the sum of `priceCents * quantity`, generates the `id`, and sets `status: 'pending'` [shop-api@SHA_SHOP_API:src/orders.ts:18-19].
3. The order is stored in an in-memory `Map` keyed by `id` [shop-api@SHA_SHOP_API:src/orders.ts:4] [shop-api@SHA_SHOP_API:src/orders.ts:20].
4. `GET /orders/:id` reads it back by `id` [shop-api@SHA_SHOP_API:src/orders.ts:8].

There are no derived stores and no backfill. A restart loses every order.

## Scripts

There's no `scripts/` folder. The package scripts are `dev` and `test` [shop-api@SHA_SHOP_API:package.json:6-7].

## Runtime model

- One process, holding orders in memory [shop-api@SHA_SHOP_API:src/orders.ts:4]. It **can't run more than one instance**, because each instance would have its own orders.
- There's no health-check route; only the two order routes are mounted [shop-api@SHA_SHOP_API:src/server.ts:4-6].
- There's no background job.
- There's no CI config in the repo (see `gaps.md`).
