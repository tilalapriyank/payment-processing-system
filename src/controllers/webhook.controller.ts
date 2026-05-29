import type { NextFunction, Request, Response } from 'express';
import { webhookService } from '../services/webhook.service';

export async function handlePaymentWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await webhookService.processWebhook(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
