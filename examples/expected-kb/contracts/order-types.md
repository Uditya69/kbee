# Order types

- **Producer:** shop-types [shop-types@SHA_SHOP_TYPES:src/index.ts:1-15]
- **Consumers:** shop-api [shop-api@SHA_SHOP_API:src/orders.ts:2] and shop-web [shop-web@SHA_SHOP_WEB:src/api.ts:1]

| Type | Shape |
|------|-------|
| `OrderStatus` | `'pending' \| 'paid' \| 'shipped'` [shop-types@SHA_SHOP_TYPES:src/index.ts:1] |
| `OrderItem` | `sku`, `quantity`, `priceCents` [shop-types@SHA_SHOP_TYPES:src/index.ts:3-7] |
| `Order` | `id`, `customerId`, `items`, `status`, `totalCents` [shop-types@SHA_SHOP_TYPES:src/index.ts:9-15] |

When you add a field or a status, update both consumers in the same feature.
