import '../helpers/mocks';
import request from 'supertest';
import { app } from '../../src/app';
import {
  mockEnqueuePaymentProcessing,
  mockPaymentRepository,
  resetMockPaymentStore,
} from '../helpers/mocks';

describe('Payment API Integration', () => {
  beforeEach(() => {
    resetMockPaymentStore();
    jest.clearAllMocks();
  });

  it('creates a payment with 201 and PENDING status', async () => {
    const response = await request(app)
      .post('/api/payments')
      .set('Idempotency-Key', 'integration-create-1')
      .send({ amount: 100, currency: 'USD' })
      .expect(201);

    expect(response.body.status).toBe('PENDING');
    expect(response.body.id).toBeDefined();
    expect(mockEnqueuePaymentProcessing).toHaveBeenCalledTimes(1);
  });

  it('returns the same payment for duplicate idempotency key', async () => {
    const first = await request(app)
      .post('/api/payments')
      .set('Idempotency-Key', 'integration-idem-1')
      .send({ amount: 250, currency: 'USD' })
      .expect(201);

    const second = await request(app)
      .post('/api/payments')
      .set('Idempotency-Key', 'integration-idem-1')
      .send({ amount: 250, currency: 'USD' })
      .expect(200);

    expect(second.body.id).toBe(first.body.id);
    expect(mockPaymentRepository.create).toHaveBeenCalledTimes(1);
  });

  it('requires Idempotency-Key header', async () => {
    const response = await request(app)
      .post('/api/payments')
      .send({ amount: 100, currency: 'USD' })
      .expect(400);

    expect(response.body.error).toContain('Idempotency-Key');
  });
});
