# Order page

`apps/web/src/OrderPage.tsx` shows an order. It loads it through `getOrder` in `apps/web/src/api.ts`, which calls `GET /orders/:id` on `VITE_API_URL` (default `http://localhost:4000`).

New orders go through `createOrder` in the same file (`POST /orders`).
