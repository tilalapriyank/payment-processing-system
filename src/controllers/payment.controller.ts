import type { NextFunction, Request, Response } from 'express';
import { paymentService } from '../services/payment.service';

export async function createPayment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
    const { payment, created } = await paymentService.createPayment(req.body, idempotencyKey ?? '');

    res.status(created ? 201 : 200).json(payment);
  } catch (error) {
    next(error);
  }
}

export async function getPayment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id;
    if (typeof id !== 'string') {
      res.status(400).json({ error: 'Invalid payment id' });
      return;
    }

    const payment = await paymentService.getPaymentById(id);
    res.status(200).json(payment);
  } catch (error) {
    next(error);
  }
}
