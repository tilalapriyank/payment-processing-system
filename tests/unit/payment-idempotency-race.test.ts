import { Prisma } from '../../src/generated/prisma/client';
import { PaymentStatus } from '../../src/types/payment.types';

const mockFindByIdempotencyKey = jest.fn();
const mockCreate = jest.fn();
const mockEnqueue = jest.fn();

jest.mock('../../src/repositories/payment.repository', () => ({
  paymentRepository: {
    findByIdempotencyKey: (...args: unknown[]) => mockFindByIdempotencyKey(...args),
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

jest.mock('../../src/queues/payment.queue', () => ({
  enqueuePaymentProcessing: (...args: unknown[]) => mockEnqueue(...args),
  schedulePaymentRetry: jest.fn(),
}));

import { paymentService } from '../../src/services/payment.service';

describe('createPayment idempotency race', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindByIdempotencyKey.mockResolvedValue(null);
  });

  it('returns existing payment when create hits unique constraint (P2002)', async () => {
    const racedPayment = {
      id: 'existing-id',
      amount: { toString: () => '100' },
      currency: 'USD',
      status: PaymentStatus.PENDING,
      idempotencyKey: 'race-key',
      retryCount: 0,
      gatewayReference: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    mockCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      })
    );
    mockFindByIdempotencyKey
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(racedPayment);

    const result = await paymentService.createPayment(
      { amount: 100, currency: 'USD' },
      'race-key'
    );

    expect(result.created).toBe(false);
    expect(result.payment.id).toBe('existing-id');
    expect(mockEnqueue).not.toHaveBeenCalled();
  });
});
