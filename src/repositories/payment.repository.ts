import type { Payment, Prisma } from '../generated/prisma/client';
import { prisma } from '../config/database';

export interface CreatePaymentInput {
  amount: number;
  currency: string;
  idempotencyKey: string;
}

export class PaymentRepository {
  async create(data: CreatePaymentInput): Promise<Payment> {
    return prisma.payment.create({
      data: {
        amount: data.amount,
        currency: data.currency.toUpperCase(),
        idempotencyKey: data.idempotencyKey,
      },
    });
  }

  async findById(id: string): Promise<Payment | null> {
    return prisma.payment.findUnique({ where: { id } });
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<Payment | null> {
    return prisma.payment.findUnique({ where: { idempotencyKey } });
  }

  async update(id: string, data: Prisma.PaymentUpdateInput): Promise<Payment> {
    return prisma.payment.update({ where: { id }, data });
  }

  async createEvent(data: {
    paymentId: string;
    eventType: string;
    oldStatus?: string;
    newStatus?: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    return prisma.paymentEvent.create({ data });
  }
}

export const paymentRepository = new PaymentRepository();
