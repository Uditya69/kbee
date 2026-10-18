# shop-web

The web UI, built with React and Vite [shop-web@SHA_SHOP_WEB:package.json:6] [shop-web@SHA_SHOP_WEB:package.json:10].

- **API client:** `src/api.ts` wraps the [orders API](../../contracts/orders-api.md) in `getOrder` and `createOrder` [shop-web@SHA_SHOP_WEB:src/api.ts:5-19].
- **Config:** `VITE_API_URL` [shop-web@SHA_SHOP_WEB:src/api.ts:3].
- **Pages:** `OrderPage` shows one order's status and total [shop-web@SHA_SHOP_WEB:src/OrderPage.tsx:5-22].
- **Run:** `npm run dev`. **Test:** `npm test` [shop-web@SHA_SHOP_WEB:package.json:6-7].
