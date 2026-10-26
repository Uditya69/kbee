# Orders API

Lives in `apps/api/src/orders.ts`, mounted by `apps/api/src/server.ts`.

- `GET /orders/:id` returns one order, or 404 with `{ "error": "not_found" }`.
- `POST /orders` takes `{ customerId, items }` and returns 201 with the new order. An empty `items` list is rejected with 400.
- Orders are stored in Postgres, in the `orders` table (see `apps/api/src/db/orders.sql`).

The `Order` and `OrderItem` types come from `packages/types/src/index.ts`.
