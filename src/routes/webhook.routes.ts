import { Router } from 'express';
import { handlePaymentWebhook } from '../controllers/webhook.controller';

export const webhookRoutes = Router();

webhookRoutes.post('/payment', handlePaymentWebhook);
