import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';

const server = app.listen(env.port, () => {
  logger.info(`Server listening on port ${env.port}`);
});

function shutdown(signal: string): void {
  logger.info(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
