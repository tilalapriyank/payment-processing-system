import { PaymentStatus } from '../types/payment.types';

const TERMINAL_STATUSES = new Set<PaymentStatus>([
  PaymentStatus.SUCCESS,
  PaymentStatus.FAILED,
]);

const WEBHOOK_ACCEPTABLE_FROM = new Set<PaymentStatus>([
  PaymentStatus.PENDING,
  PaymentStatus.PROCESSING,
]);

export function canAcceptWebhookTransition(
  currentStatus: PaymentStatus,
  webhookStatus: PaymentStatus
): boolean {
  if (TERMINAL_STATUSES.has(currentStatus)) {
    return false;
  }

  if (
    webhookStatus !== PaymentStatus.SUCCESS &&
    webhookStatus !== PaymentStatus.FAILED
  ) {
    return false;
  }

  return WEBHOOK_ACCEPTABLE_FROM.has(currentStatus);
}
