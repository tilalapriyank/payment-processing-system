import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { webhookService } from '../services/webhook.service';
import { HttpError } from '../utils/httpError';
import { verifyWebhookSignature } from '../utils/webhook-signature';

export async function handlePaymentWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const webhookSecret = env.webhookSecret;

    if (webhookSecret) {
      const signature = req.headers['x-signature'] as string | undefined;
      const payload = req.rawBody ?? Buffer.from(JSON.stringify(req.body));

      if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
        throw new HttpError(401, 'Invalid webhook signature');
      }
    }

    const result = await webhookService.processWebhook(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
