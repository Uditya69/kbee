import { useEffect, useState } from 'react';
import type { Order } from 'shop-types';
import { getOrder } from './api';

export function OrderPage({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOrder(id).then(setOrder, (e) => setError(String(e)));
  }, [id]);

  if (error) return <p role="alert">{error}</p>;
  if (!order) return <p>Loading…</p>;
  return (
    <section>
      <h1>Order {order.id}</h1>
      <p>Status: {order.status}</p>
      <p>Total: ${(order.totalCents / 100).toFixed(2)}</p>
    </section>
  );
}
