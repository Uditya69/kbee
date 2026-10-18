import type { Order, OrderItem } from 'shop-types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export async function getOrder(id: string): Promise<Order> {
  const res = await fetch(`${API_URL}/orders/${id}`);
  if (!res.ok) throw new Error(`getOrder failed: ${res.status}`);
  return res.json();
}

export async function createOrder(customerId: string, items: OrderItem[]): Promise<Order> {
  const res = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId, items }),
  });
  if (!res.ok) throw new Error(`createOrder failed: ${res.status}`);
  return res.json();
}
