# shop-api

The orders HTTP API, built on Express [shop-api@SHA_SHOP_API:src/orders.ts:1].

- **Entry point:** `src/server.ts` mounts the orders router with a JSON body parser [shop-api@SHA_SHOP_API:src/server.ts:4-6].
- **Port:** `PORT`, default 4000 [shop-api@SHA_SHOP_API:src/server.ts:8].
- **Run:** `npm run dev` [shop-api@SHA_SHOP_API:package.json:6]. **Test:** `npm test` (Vitest) [shop-api@SHA_SHOP_API:package.json:7].
- **Storage:** orders are kept in an in-memory `Map`, so they're lost on restart [shop-api@SHA_SHOP_API:src/orders.ts:4].
- **Exposes:** the [orders API](../../contracts/orders-api.md).
