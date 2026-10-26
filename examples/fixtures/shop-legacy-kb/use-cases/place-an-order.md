# Placing an order, end to end

1. The web app calls `createOrder(customerId, items)` (`apps/web/src/api.ts`).
2. The API validates the body and works out `totalCents` from each item's `priceCents` and `quantity` (`apps/api/src/orders.ts`).
3. The new order starts as `pending` and is returned with status 201.
4. The page reads it back with `getOrder` and shows it (`apps/web/src/OrderPage.tsx`).

The shapes on both sides come from `packages/types`.
