import { Router } from 'express';
import { healthRouter } from './health.routes';
import { paymentRoutes } from './payment.routes';
import { webhookRoutes } from './webhook.routes';

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use('/payments', paymentRoutes);
apiRouter.use('/webhooks', webhookRoutes);
