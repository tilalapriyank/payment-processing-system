import '../helpers/mocks';
import request from 'supertest';
import { app } from '../../src/app';
import {
  getCreateCallCount,
  getPaymentCount,
  resetMockPaymentStore,
} from '../helpers/mocks';

describe('Payment Idempotency Concurrency', () => {
  beforeEach(() => {
    resetMockPaymentStore();
    jest.clearAllMocks();
  });

  it('creates only one payment for 20 parallel requests with the same idempotency key', async () => {
    const idempotencyKey = 'concurrency-key-1';
    const body = { amount: 500, currency: 'USD' };

    const responses = await Promise.all(
      Array.from({ length: 20 }, () =>
        request(app)
          .post('/api/payments')
          .set('Idempotency-Key', idempotencyKey)
          .send(body)
      )
    );

    const paymentIds = responses.map((response) => response.body.id);
    const uniqueIds = new Set(paymentIds);

    expect(uniqueIds.size).toBe(1);
    expect(getPaymentCount()).toBe(1);
    expect(getCreateCallCount()).toBeLessThanOrEqual(1);
  });
});
