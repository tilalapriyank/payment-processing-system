import { canAcceptWebhookTransition } from '../../src/utils/webhook-transition';
import { PaymentStatus } from '../../src/types/payment.types';

describe('Webhook Transition', () => {
  it('allows PROCESSING -> SUCCESS', () => {
    expect(
      canAcceptWebhookTransition(PaymentStatus.PROCESSING, PaymentStatus.SUCCESS)
    ).toBe(true);
  });

  it('allows PROCESSING -> FAILED', () => {
    expect(
      canAcceptWebhookTransition(PaymentStatus.PROCESSING, PaymentStatus.FAILED)
    ).toBe(true);
  });

  it('allows PENDING -> SUCCESS for early callbacks', () => {
    expect(
      canAcceptWebhookTransition(PaymentStatus.PENDING, PaymentStatus.SUCCESS)
    ).toBe(true);
  });

  it('rejects SUCCESS -> FAILED', () => {
    expect(
      canAcceptWebhookTransition(PaymentStatus.SUCCESS, PaymentStatus.FAILED)
    ).toBe(false);
  });

  it('rejects FAILED -> SUCCESS', () => {
    expect(
      canAcceptWebhookTransition(PaymentStatus.FAILED, PaymentStatus.SUCCESS)
    ).toBe(false);
  });
});
