import { JobScheduler, Queue, QueueEvents } from 'bullmq';
import {
  PAYMENT_QUEUE_NAME,
  PROCESS_PAYMENT_JOB,
} from '../constants/queue.constants';
import { bullmqConnection } from '../config/redis';
import { logger } from '../config/logger';
import type { ProcessPaymentJob } from '../types/job.types';

export const paymentQueue = new Queue<ProcessPaymentJob>(PAYMENT_QUEUE_NAME, {
  connection: bullmqConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 200,
    attempts: 1,
  },
});

export const paymentQueueEvents = new QueueEvents(PAYMENT_QUEUE_NAME, {
  connection: bullmqConnection,
});

paymentQueueEvents.on('added', ({ jobId }) => {
  logger.info({ jobId, queue: PAYMENT_QUEUE_NAME }, 'Payment job added to queue');
});

paymentQueueEvents.on('active', ({ jobId }) => {
  logger.info({ jobId, queue: PAYMENT_QUEUE_NAME }, 'Payment job picked by worker');
});

paymentQueueEvents.on('completed', ({ jobId }) => {
  logger.info({ jobId, queue: PAYMENT_QUEUE_NAME }, 'Payment job completed');
});

paymentQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error({ jobId, failedReason, queue: PAYMENT_QUEUE_NAME }, 'Payment job failed');
});

export const paymentQueueScheduler = new JobScheduler(PAYMENT_QUEUE_NAME, {
  connection: bullmqConnection,
});

export async function enqueuePaymentProcessing(paymentId: string): Promise<void> {
  await paymentQueue.add(PROCESS_PAYMENT_JOB, { paymentId });
}
