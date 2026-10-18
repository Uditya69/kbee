# shop-api conventions

- Errors are returned as JSON `{ error: '<snake_case_code>' }` with a matching status code [shop-api@SHA_SHOP_API:src/orders.ts:9] [shop-api@SHA_SHOP_API:src/orders.ts:16].
- Money is held as integer cents (`totalCents`, `priceCents`) [shop-api@SHA_SHOP_API:src/orders.ts:18].
- Tests sit next to the code as `*.spec.ts` and call the app through supertest [shop-api@SHA_SHOP_API:src/orders.spec.ts:1-3].
