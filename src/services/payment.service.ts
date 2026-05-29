import { SUPPORTED_CURRENCIES } from '../constants/payment.constants';
import type { Payment } from '../generated/prisma/client';
import { enqueuePaymentProcessing } from '../queues/payment.queue';
import { paymentRepository } from '../repositories/payment.repository';
import { transitionPaymentStatus } from './payment-state.service';
import { HttpError } from '../utils/httpError';
import { PaymentStatus } from '../types/payment.types';
import {
  createPaymentSchema,
  type CreatePaymentBody,
} from '../validators/payment.validator';

function toPaymentResponse(payment: Payment) {
  return {
    id: payment.id,
    amount: payment.amount.toString(),
    currency: payment.currency,
    status: payment.status,
    idempotencyKey: payment.idempotencyKey,
    retryCount: payment.retryCount,
    gatewayReference: payment.gatewayReference,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}

export class PaymentService {
  async createPayment(body: unknown, idempotencyKey: string) {
    if (!idempotencyKey?.trim()) {
      throw new HttpError(400, 'Idempotency-Key header is required');
    }

    const parsed = createPaymentSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid request body');
    }

    const data: CreatePaymentBody = parsed.data;
    const currency = data.currency.toUpperCase();

    if (!SUPPORTED_CURRENCIES.includes(currency as (typeof SUPPORTED_CURRENCIES)[number])) {
      throw new HttpError(
        400,
        `Unsupported currency. Supported: ${SUPPORTED_CURRENCIES.join(', ')}`
      );
    }

    const existingPayment = await paymentRepository.findByIdempotencyKey(idempotencyKey);
    if (existingPayment) {
      return { payment: toPaymentResponse(existingPayment), created: false };
    }

    const payment = await paymentRepository.create({
      amount: data.amount,
      currency,
      idempotencyKey,
    });

    await enqueuePaymentProcessing(payment.id);

    return { payment: toPaymentResponse(payment), created: true };
  }

  async processPayment(paymentId: string) {
    await transitionPaymentStatus(paymentId, PaymentStatus.PROCESSING);
  }

  async getPaymentById(id: string) {
    const payment = await paymentRepository.findById(id);

    if (!payment) {
      throw new HttpError(404, 'Payment not found');
    }

    return toPaymentResponse(payment);
  }
}

export const paymentService = new PaymentService();
