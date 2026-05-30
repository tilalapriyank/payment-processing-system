import { randomUUID } from 'crypto';
import type { Payment } from '../../src/generated/prisma/client';
import { PaymentStatus } from '../../src/types/payment.types';

const paymentsById = new Map<string, Payment>();
const paymentsByKey = new Map<string, Payment>();
const createLocks = new Map<string, Promise<Payment>>();

let createCallCount = 0;

export function resetMockPaymentStore(): void {
  paymentsById.clear();
  paymentsByKey.clear();
  createLocks.clear();
  createCallCount = 0;
}

export function getCreateCallCount(): number {
  return createCallCount;
}

export function getPaymentCount(): number {
  return paymentsByKey.size;
}

function buildPayment(data: {
  amount: number;
  currency: string;
  idempotencyKey: string;
}): Payment {
  const now = new Date();
  return {
    id: randomUUID(),
    amount: data.amount as unknown as Payment['amount'],
    currency: data.currency,
    status: PaymentStatus.PENDING,
    idempotencyKey: data.idempotencyKey,
    retryCount: 0,
    gatewayReference: null,
    createdAt: now,
    updatedAt: now,
  };
}

export const mockPaymentRepository = {
  create: jest.fn(async (data: { amount: number; currency: string; idempotencyKey: string }) => {
    const key = data.idempotencyKey;

    if (createLocks.has(key)) {
      return createLocks.get(key)!;
    }

    const createPromise = (async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));

      const existing = paymentsByKey.get(key);
      if (existing) {
        return existing;
      }

      createCallCount += 1;
      const payment = buildPayment(data);
      paymentsByKey.set(key, payment);
      paymentsById.set(payment.id, payment);
      return payment;
    })();

    createLocks.set(key, createPromise);

    try {
      return await createPromise;
    } finally {
      createLocks.delete(key);
    }
  }),

  findById: jest.fn(async (id: string) => paymentsById.get(id) ?? null),

  findByIdempotencyKey: jest.fn(async (idempotencyKey: string) => {
    await new Promise((resolve) => setTimeout(resolve, 2));
    return paymentsByKey.get(idempotencyKey) ?? null;
  }),

  update: jest.fn(async (id: string, data: Partial<Payment>) => {
    const payment = paymentsById.get(id);
    if (!payment) {
      throw new Error('Payment not found');
    }

    const updated = {
      ...payment,
      ...data,
      updatedAt: new Date(),
    };

    paymentsById.set(id, updated);
    paymentsByKey.set(updated.idempotencyKey, updated);
    return updated;
  }),

  createEvent: jest.fn(async () => ({ id: randomUUID() })),
};

export const mockWebhookRepository = {
  findByEventId: jest.fn().mockResolvedValue(null),
  create: jest.fn(),
  markProcessed: jest.fn(),
};

export const mockEnqueuePaymentProcessing = jest.fn(async (_paymentId: string) => undefined);

jest.mock('../../src/repositories/payment.repository', () => ({
  paymentRepository: mockPaymentRepository,
}));

jest.mock('../../src/repositories/webhook.repository', () => ({
  webhookRepository: mockWebhookRepository,
}));

jest.mock('../../src/queues/payment.queue', () => ({
  enqueuePaymentProcessing: (paymentId: string) =>
    mockEnqueuePaymentProcessing(paymentId),
  schedulePaymentRetry: jest.fn(),
  paymentQueue: {},
  paymentQueueEvents: {},
  paymentQueueScheduler: {},
}));
