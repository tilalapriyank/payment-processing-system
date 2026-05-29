import pino from 'pino';
import { env } from './env';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport:
    env.nodeEnv === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});
