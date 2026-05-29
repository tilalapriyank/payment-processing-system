import { Router } from 'express';
import { healthRouter } from './health.routes';
import { paymentRoutes } from './payment.routes';

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use('/payments', paymentRoutes);
