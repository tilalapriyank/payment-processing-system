import type { PaymentStatus as PrismaPaymentStatus } from '../generated/prisma/client';
import { paymentRepository } from '../repositories/payment.repository';
import { PaymentStatus } from '../types/payment.types';
import { HttpError } from '../utils/httpError';

const ALLOWED_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  [PaymentStatus.PENDING]: [PaymentStatus.PROCESSING],
  [PaymentStatus.PROCESSING]: [PaymentStatus.SUCCESS, PaymentStatus.FAILED],
  [PaymentStatus.SUCCESS]: [],
  [PaymentStatus.FAILED]: [],
};

export function isValidPaymentTransition(
  fromStatus: PaymentStatus,
  toStatus: PaymentStatus
): boolean {
  return ALLOWED_TRANSITIONS[fromStatus].includes(toStatus);
}

export async function transitionPaymentStatus(
  paymentId: string,
  toStatus: PaymentStatus
) {
  const payment = await paymentRepository.findById(paymentId);

  if (!payment) {
    throw new HttpError(404, 'Payment not found');
  }

  const fromStatus = payment.status as PaymentStatus;

  if (!ALLOWED_TRANSITIONS[fromStatus].includes(toStatus)) {
    throw new HttpError(
      400,
      `Invalid status transition from ${fromStatus} to ${toStatus}`
    );
  }

  const updated = await paymentRepository.update(paymentId, {
    status: toStatus as PrismaPaymentStatus,
  });

  await paymentRepository.createEvent({
    paymentId,
    eventType: 'STATUS_CHANGE',
    oldStatus: fromStatus,
    newStatus: toStatus,
  });

  return updated;
}
