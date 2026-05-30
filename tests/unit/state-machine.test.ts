import { isValidPaymentTransition } from '../../src/services/payment-state.service';
import { PaymentStatus } from '../../src/types/payment.types';

describe('Payment State Machine', () => {
  it('allows PENDING -> PROCESSING', () => {
    expect(
      isValidPaymentTransition(PaymentStatus.PENDING, PaymentStatus.PROCESSING)
    ).toBe(true);
  });

  it('allows PROCESSING -> SUCCESS', () => {
    expect(
      isValidPaymentTransition(PaymentStatus.PROCESSING, PaymentStatus.SUCCESS)
    ).toBe(true);
  });

  it('allows PROCESSING -> FAILED', () => {
    expect(
      isValidPaymentTransition(PaymentStatus.PROCESSING, PaymentStatus.FAILED)
    ).toBe(true);
  });

  it('rejects SUCCESS -> FAILED', () => {
    expect(
      isValidPaymentTransition(PaymentStatus.SUCCESS, PaymentStatus.FAILED)
    ).toBe(false);
  });

  it('rejects FAILED -> SUCCESS', () => {
    expect(
      isValidPaymentTransition(PaymentStatus.FAILED, PaymentStatus.SUCCESS)
    ).toBe(false);
  });
});
