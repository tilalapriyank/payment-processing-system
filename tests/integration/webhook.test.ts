import { randomUUID } from 'crypto';
import '../helpers/mocks';
import request from 'supertest';
import { app } from '../../src/app';
import {
  mockPaymentRepository,
  mockWebhookRepository,
  resetMockPaymentStore,
} from '../helpers/mocks';
import { PaymentStatus } from '../../src/types/payment.types';

const webhookEvents = new Map<string, unknown>();

describe('Webhook API Integration', () => {
  beforeEach(() => {
    resetMockPaymentStore();
    webhookEvents.clear();
    jest.clearAllMocks();

    mockWebhookRepository.findByEventId.mockImplementation(async (eventId: string) => {
      return (webhookEvents.get(eventId) as never) ?? null;
    });

    mockWebhookRepository.create.mockImplementation(async (data: {
      eventId: string;
      paymentId: string;
      eventType: string;
      payload: unknown;
    }) => {
      const event = {
        id: randomUUID(),
        ...data,
        processed: false,
        createdAt: new Date(),
      };
      webhookEvents.set(data.eventId, event);
      return event;
    });

    mockWebhookRepository.markProcessed.mockImplementation(async (id: string) => ({
      id,
      processed: true,
    }));
  });

  it('updates payment status from webhook SUCCESS', async () => {
    const payment = await mockPaymentRepository.create({
      amount: 100,
      currency: 'USD',
      idempotencyKey: 'webhook-payment-1',
    });

    await mockPaymentRepository.update(payment.id, {
      status: PaymentStatus.PROCESSING,
    });

    const response = await request(app)
      .post('/api/webhooks/payment')
      .send({
        eventId: 'evt-success-1',
        paymentId: payment.id,
        status: 'SUCCESS',
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('processed');

    const updated = await mockPaymentRepository.findById(payment.id);
    expect(updated?.status).toBe(PaymentStatus.SUCCESS);
  });

  it('ignores duplicate webhook eventId', async () => {
    const payment = await mockPaymentRepository.create({
      amount: 100,
      currency: 'USD',
      idempotencyKey: 'webhook-payment-2',
    });

    await mockPaymentRepository.update(payment.id, {
      status: PaymentStatus.PROCESSING,
    });

    const payload = {
      eventId: 'evt-duplicate-1',
      paymentId: payment.id,
      status: 'SUCCESS',
    };

    await request(app).post('/api/webhooks/payment').send(payload).expect(200);

    const duplicate = await request(app)
      .post('/api/webhooks/payment')
      .send(payload)
      .expect(200);

    expect(duplicate.body.message).toBe('Duplicate ignored');
    expect(mockWebhookRepository.create).toHaveBeenCalledTimes(1);
  });

  it('ignores conflicting webhook when payment is already SUCCESS', async () => {
    const payment = await mockPaymentRepository.create({
      amount: 100,
      currency: 'USD',
      idempotencyKey: 'webhook-payment-3',
    });

    await mockPaymentRepository.update(payment.id, {
      status: PaymentStatus.SUCCESS,
    });

    const response = await request(app)
      .post('/api/webhooks/payment')
      .send({
        eventId: 'evt-conflict-1',
        paymentId: payment.id,
        status: 'FAILED',
      })
      .expect(200);

    expect(response.body.message).toContain('ignored');

    const unchanged = await mockPaymentRepository.findById(payment.id);
    expect(unchanged?.status).toBe(PaymentStatus.SUCCESS);
  });
});
