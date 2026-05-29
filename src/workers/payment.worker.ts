import { Worker } from 'bullmq';
import {
  PAYMENT_QUEUE_NAME,
  PROCESS_PAYMENT_JOB,
} from '../constants/queue.constants';
import { bullmqConnection } from '../config/redis';
import { logger } from '../config/logger';
import { paymentService } from '../services/payment.service';
import type { ProcessPaymentJob } from '../types/job.types';

export function startPaymentWorker(): Worker<ProcessPaymentJob> {
  const worker = new Worker<ProcessPaymentJob>(
    PAYMENT_QUEUE_NAME,
    async (job) => {
      if (job.name !== PROCESS_PAYMENT_JOB) {
        logger.warn({ jobName: job.name }, 'Unknown payment job name');
        return;
      }

      const { paymentId } = job.data;
      logger.info({ paymentId, jobId: job.id }, 'Processing payment job');

      await paymentService.processPayment(paymentId);
    },
    { connection: bullmqConnection }
  );

  worker.on('error', (error) => {
    logger.error({ error }, 'Payment worker error');
  });

  return worker;
}
