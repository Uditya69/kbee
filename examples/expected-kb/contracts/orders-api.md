# Orders API

- **Producer:** shop-api [shop-api@SHA_SHOP_API:src/orders.ts:7-22]
- **Consumers:** shop-web, via `getOrder` and `createOrder` [shop-web@SHA_SHOP_WEB:src/api.ts:5-19]
- **Body types:** `Order` and `OrderItem` from the [order types](order-types.md)

## GET /orders/:id

- `200` with an `Order` [shop-api@SHA_SHOP_API:src/orders.ts:10]
- `404` with `{ error: 'not_found' }` [shop-api@SHA_SHOP_API:src/orders.ts:9]
- Used by `getOrder` [shop-web@SHA_SHOP_WEB:src/api.ts:6]

## POST /orders

- **Request body**, JSON [shop-api@SHA_SHOP_API:src/orders.ts:14] [shop-web@SHA_SHOP_WEB:src/api.ts:13-15]:

  | Field | Type | Required | Notes |
  |-------|------|----------|-------|
  | `customerId` | string | yes | Must be non-empty [shop-api@SHA_SHOP_API:src/orders.ts:15] |
  | `items` | `OrderItem[]` | yes | At least one. Each has `sku` (string), `quantity` (number) and `priceCents` (integer cents) [shop-types@SHA_SHOP_TYPES:src/index.ts:3-7] |

- **Response (201)** is an `Order`, with these fields set by the server [shop-api@SHA_SHOP_API:src/orders.ts:19]:

  | Field | Type | Notes |
  |-------|------|-------|
  | `id` | string | A random UUID |
  | `customerId`, `items` | as sent | Echoed back |
  | `status` | `OrderStatus` | Always `'pending'` on create |
  | `totalCents` | integer | Σ `priceCents × quantity`, in cents [shop-api@SHA_SHOP_API:src/orders.ts:18] |
- `400` with `{ error: 'invalid_order' }` when `customerId` is missing or `items` is empty [shop-api@SHA_SHOP_API:src/orders.ts:15-17]
- `201` with the new `Order`, `status: 'pending'`, and `totalCents` computed by the server [shop-api@SHA_SHOP_API:src/orders.ts:18-21]
- Used by `createOrder` [shop-web@SHA_SHOP_WEB:src/api.ts:11-19]
