# Orders API

- **Producer:** shop-api [shop-api@SHA_SHOP_API:src/orders.ts:7-22]
- **Consumers:** shop-web, via `getOrder` and `createOrder` [shop-web@SHA_SHOP_WEB:src/api.ts:5-19]
- **Body types:** `Order` and `OrderItem` from the [order types](order-types.md)

## GET /orders/:id

- `200` with an `Order` [shop-api@SHA_SHOP_API:src/orders.ts:10]
- `404` with `{ error: 'not_found' }` [shop-api@SHA_SHOP_API:src/orders.ts:9]
- Used by `getOrder` [shop-web@SHA_SHOP_WEB:src/api.ts:6]

## POST /orders

- **Request:** `{ customerId: string, items: OrderItem[] }` [shop-api@SHA_SHOP_API:src/orders.ts:14] [shop-web@SHA_SHOP_WEB:src/api.ts:15]
- `400` with `{ error: 'invalid_order' }` when `customerId` is missing or `items` is empty [shop-api@SHA_SHOP_API:src/orders.ts:15-17]
- `201` with the new `Order`, `status: 'pending'`, and `totalCents` computed by the server [shop-api@SHA_SHOP_API:src/orders.ts:18-21]
- Used by `createOrder` [shop-web@SHA_SHOP_WEB:src/api.ts:11-19]
