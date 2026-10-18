import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './server';

describe('POST /orders', () => {
  it('rejects an order with no items', async () => {
    const res = await request(app).post('/orders').send({ customerId: 'c1', items: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_order');
  });
});
