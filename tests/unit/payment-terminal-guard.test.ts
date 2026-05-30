import { PaymentStatus } from '../../src/types/payment.types';

const mockFindById = jest.fn();
const mockCreateEvent = jest.fn();
const mockGatewayProcess = jest.fn();
const mockTransition = jest.fn();

jest.mock('../../src/repositories/payment.repository', () => ({
  paymentRepository: {
    findById: (...args: unknown[]) => mockFindById(...args),
    createEvent: (...args: unknown[]) => mockCreateEvent(...args),
    update: jest.fn(),
  },
}));

jest.mock('../../src/services/gateway.service', () => ({
  gatewayService: {
    processPayment: (...args: unknown[]) => mockGatewayProcess(...args),
  },
}));

jest.mock('../../src/services/payment-state.service', () => ({
  transitionPaymentStatus: (...args: unknown[]) => mockTransition(...args),
}));

import { paymentService } from '../../src/services/payment.service';

describe('processPayment terminal guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips gateway when payment is SUCCESS', async () => {
    mockFindById.mockResolvedValue({
      id: 'pay-1',
      status: PaymentStatus.SUCCESS,
      retryCount: 0,
    });

    await paymentService.processPayment('pay-1');

    expect(mockGatewayProcess).not.toHaveBeenCalled();
    expect(mockTransition).not.toHaveBeenCalled();
  });

  it('skips gateway when payment is FAILED', async () => {
    mockFindById.mockResolvedValue({
      id: 'pay-2',
      status: PaymentStatus.FAILED,
      retryCount: 0,
    });

    await paymentService.processPayment('pay-2');

    expect(mockGatewayProcess).not.toHaveBeenCalled();
    expect(mockTransition).not.toHaveBeenCalled();
  });
});
