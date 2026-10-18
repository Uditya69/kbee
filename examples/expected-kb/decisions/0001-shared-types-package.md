# 0001: Shared types live in their own package

- **Decision:** order types are defined once in shop-types and imported by both shop-api and shop-web [shop-types@SHA_SHOP_TYPES:src/index.ts:1-15].
- **Why:** to keep the API and the UI from drifting apart on the shape of an order [source: user, 2026-10-18].
