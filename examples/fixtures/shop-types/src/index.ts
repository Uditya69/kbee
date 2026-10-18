export type OrderStatus = 'pending' | 'paid' | 'shipped';

export interface OrderItem {
  sku: string;
  quantity: number;
  priceCents: number;
}

export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  status: OrderStatus;
  totalCents: number;
}
