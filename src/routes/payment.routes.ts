import { Router } from 'express';
import { createPayment, getPayment } from '../controllers/payment.controller';

export const paymentRoutes = Router();

paymentRoutes.post('/', createPayment);
paymentRoutes.get('/:id', getPayment);
