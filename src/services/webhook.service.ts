import { Prisma, type PaymentStatus as PrismaPaymentStatus } from '../generated/prisma/client';
import { paymentRepository } from '../repositories/payment.repository';
import { webhookRepository } from '../repositories/webhook.repository';
import { HttpError } from '../utils/httpError';
import { canAcceptWebhookTransition } from '../utils/webhook-transition';
import { PaymentStatus } from '../types/payment.types';
import type { WebhookResponse } from '../types/webhook.types';
import { webhookPayloadSchema } from '../validators/webhook.validator';

function mapWebhookStatus(status: 'SUCCESS' | 'FAILED'): PaymentStatus {
  return status === 'SUCCESS' ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;
}

export class WebhookService {
  async processWebhook(body: unknown): Promise<WebhookResponse> {
    const parsed = webhookPayloadSchema.safeParse(body);

    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid webhook payload');
    }

    const payload = parsed.data;
    const targetStatus = mapWebhookStatus(payload.status);

    const existingEvent = await webhookRepository.findByEventId(payload.eventId);
    if (existingEvent) {
      await this.recordPaymentEvent(payload.paymentId, 'WEBHOOK_DUPLICATE', {
        eventId: payload.eventId,
      });

      return { success: true, message: 'Duplicate ignored' };
    }

    let webhookEvent;

    try {
      webhookEvent = await webhookRepository.create({
        eventId: payload.eventId,
        paymentId: payload.paymentId,
        eventType: payload.status,
        payload,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        await this.recordPaymentEvent(payload.paymentId, 'WEBHOOK_DUPLICATE', {
          eventId: payload.eventId,
        });

        return { success: true, message: 'Duplicate ignored' };
      }

      throw error;
    }

    await this.recordPaymentEvent(payload.paymentId, 'WEBHOOK_RECEIVED', {
      eventId: payload.eventId,
      status: payload.status,
    });

    const payment = await paymentRepository.findById(payload.paymentId);

    if (!payment) {
      throw new HttpError(404, 'Payment not found');
    }

    const currentStatus = payment.status as PaymentStatus;

    if (!canAcceptWebhookTransition(currentStatus, targetStatus)) {
      await this.recordPaymentEvent(payload.paymentId, 'WEBHOOK_IGNORED', {
        eventId: payload.eventId,
        currentStatus,
        requestedStatus: targetStatus,
      });

      await webhookRepository.markProcessed(webhookEvent.id);

      return {
        success: true,
        message: 'Webhook ignored due to conflicting payment state',
      };
    }

    await paymentRepository.update(payload.paymentId, {
      status: targetStatus as PrismaPaymentStatus,
    });

    await paymentRepository.createEvent({
      paymentId: payload.paymentId,
      eventType: 'STATUS_CHANGE',
      oldStatus: currentStatus,
      newStatus: targetStatus,
    });

    await webhookRepository.markProcessed(webhookEvent.id);

    await this.recordPaymentEvent(payload.paymentId, 'WEBHOOK_PROCESSED', {
      eventId: payload.eventId,
      status: targetStatus,
    });

    return { success: true, message: 'Webhook processed successfully' };
  }

  private async recordPaymentEvent(
    paymentId: string,
    eventType: string,
    metadata: Prisma.InputJsonValue
  ): Promise<void> {
    const payment = await paymentRepository.findById(paymentId);

    if (!payment) {
      return;
    }

    await paymentRepository.createEvent({
      paymentId,
      eventType,
      metadata,
    });
  }
}

export const webhookService = new WebhookService();
