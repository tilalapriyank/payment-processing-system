import { MAX_RETRY_ATTEMPTS, SUPPORTED_CURRENCIES } from '../constants/payment.constants';
import { logger } from '../config/logger';
import { Prisma, type Payment } from '../generated/prisma/client';
import { enqueuePaymentProcessing, schedulePaymentRetry } from '../queues/payment.queue';
import { paymentRepository } from '../repositories/payment.repository';
import { gatewayService } from './gateway.service';
import { transitionPaymentStatus } from './payment-state.service';
import { HttpError } from '../utils/httpError';
import { GatewayTimeoutError } from '../utils/gatewayTimeoutError';
import { getRetryDelay } from '../utils/retry-delay';
import { PaymentStatus } from '../types/payment.types';
import { GatewayResult } from '../types/gateway.types';
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

    try {
      const payment = await paymentRepository.create({
        amount: data.amount,
        currency,
        idempotencyKey,
      });

      await enqueuePaymentProcessing(payment.id);

      return { payment: toPaymentResponse(payment), created: true };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const racedPayment = await paymentRepository.findByIdempotencyKey(idempotencyKey);

        if (!racedPayment) {
          throw error;
        }

        return { payment: toPaymentResponse(racedPayment), created: false };
      }

      throw error;
    }
  }

  async processPayment(paymentId: string) {
    const payment = await paymentRepository.findById(paymentId);

    if (!payment) {
      throw new HttpError(404, 'Payment not found');
    }

    if (
      payment.status === PaymentStatus.SUCCESS ||
      payment.status === PaymentStatus.FAILED
    ) {
      logger.info(
        { paymentId, status: payment.status },
        'Payment already terminal; skipping worker processing'
      );
      return;
    }

    const isRetry = payment.retryCount > 0;

    if (isRetry) {
      await paymentRepository.createEvent({
        paymentId,
        eventType: 'PAYMENT_RETRY_STARTED',
        metadata: {
          retryCount: payment.retryCount,
          attempt: payment.retryCount + 1,
        },
      });
    } else if (payment.status === PaymentStatus.PENDING) {
      await transitionPaymentStatus(paymentId, PaymentStatus.PROCESSING);

      await paymentRepository.createEvent({
        paymentId,
        eventType: 'PAYMENT_PROCESSING_STARTED',
        newStatus: PaymentStatus.PROCESSING,
      });
    }

    try {
      const outcome = await gatewayService.processPayment(paymentId);

      if (outcome.result === GatewayResult.FAILED) {
        await paymentRepository.createEvent({
          paymentId,
          eventType: 'GATEWAY_FAILED',
          oldStatus: PaymentStatus.PROCESSING,
          newStatus: PaymentStatus.FAILED,
        });
        await transitionPaymentStatus(paymentId, PaymentStatus.FAILED);
        return;
      }

      await paymentRepository.update(paymentId, {
        gatewayReference: outcome.gatewayReference,
      });

      await paymentRepository.createEvent({
        paymentId,
        eventType: 'GATEWAY_SUCCESS',
        oldStatus: PaymentStatus.PROCESSING,
        newStatus: PaymentStatus.SUCCESS,
        metadata: { gatewayReference: outcome.gatewayReference },
      });

      await transitionPaymentStatus(paymentId, PaymentStatus.SUCCESS);
    } catch (error) {
      if (error instanceof GatewayTimeoutError) {
        await this.handleGatewayTimeout(payment);
        return;
      }

      throw error;
    }
  }

  private async handleGatewayTimeout(payment: Payment) {
    const nextRetryCount = payment.retryCount + 1;

    await paymentRepository.createEvent({
      paymentId: payment.id,
      eventType: 'GATEWAY_TIMEOUT',
      oldStatus: PaymentStatus.PROCESSING,
      metadata: {
        retryCount: payment.retryCount,
        nextRetryCount,
      },
    });

    if (nextRetryCount <= MAX_RETRY_ATTEMPTS) {
      const delayMs = getRetryDelay(nextRetryCount);

      await paymentRepository.update(payment.id, { retryCount: nextRetryCount });

      await paymentRepository.createEvent({
        paymentId: payment.id,
        eventType: 'PAYMENT_RETRY_SCHEDULED',
        metadata: {
          retryCount: nextRetryCount,
          delayMs,
          attempt: nextRetryCount + 1,
        },
      });

      await schedulePaymentRetry(payment.id, nextRetryCount, delayMs);
      return;
    }

    await paymentRepository.createEvent({
      paymentId: payment.id,
      eventType: 'PAYMENT_RETRY_EXHAUSTED',
      oldStatus: PaymentStatus.PROCESSING,
      newStatus: PaymentStatus.FAILED,
      metadata: { retryCount: payment.retryCount },
    });

    await transitionPaymentStatus(payment.id, PaymentStatus.FAILED);
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
