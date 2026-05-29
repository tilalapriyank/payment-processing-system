export const PAYMENT_LOCK_TTL_SECONDS = 30;

export const PAYMENT_LOCK_PREFIX = 'payment:';

export function getPaymentLockKey(paymentId: string): string {
  return `${PAYMENT_LOCK_PREFIX}${paymentId}`;
}

export function getPaymentJobId(paymentId: string): string {
  return `payment:${paymentId}`;
}

export function getPaymentRetryJobId(paymentId: string, retryCount: number): string {
  return `payment-retry:${paymentId}:${retryCount}`;
}
