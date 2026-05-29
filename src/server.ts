import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { startPaymentWorker } from './workers/payment.worker';

const server = app.listen(env.port, () => {
  logger.info(`Server listening on port ${env.port}`);
});

const paymentWorker = startPaymentWorker();
logger.info('Payment worker started');

function shutdown(signal: string): void {
  logger.info(`${signal} received, shutting down`);

  Promise.all([
    new Promise<void>((resolve) => server.close(() => resolve())),
    paymentWorker.close(),
  ]).then(() => process.exit(0));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
