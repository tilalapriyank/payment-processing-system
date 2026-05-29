import type { Prisma, WebhookEvent } from '../generated/prisma/client';
import { prisma } from '../config/database';

export class WebhookRepository {
  async findByEventId(eventId: string): Promise<WebhookEvent | null> {
    return prisma.webhookEvent.findUnique({ where: { eventId } });
  }

  async create(data: {
    eventId: string;
    paymentId: string;
    eventType: string;
    payload: Prisma.InputJsonValue;
  }): Promise<WebhookEvent> {
    return prisma.webhookEvent.create({ data });
  }

  async markProcessed(id: string): Promise<WebhookEvent> {
    return prisma.webhookEvent.update({
      where: { id },
      data: { processed: true },
    });
  }
}

export const webhookRepository = new WebhookRepository();
