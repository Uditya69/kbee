import { Router } from 'express';
import type { Order } from 'shop-types';

const orders = new Map<string, Order>();
export const ordersRouter = Router();

ordersRouter.get('/orders/:id', (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ error: 'not_found' });
  res.json(order);
});

ordersRouter.post('/orders', (req, res) => {
  const { customerId, items } = req.body;
  if (!customerId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'invalid_order' });
  }
  const totalCents = items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
  const order: Order = { id: crypto.randomUUID(), customerId, items, status: 'pending', totalCents };
  orders.set(order.id, order);
  res.status(201).json(order);
});
