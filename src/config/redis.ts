import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.redisUrl);

export const bullmqConnection = {
  url: env.redisUrl,
  maxRetriesPerRequest: null,
};

export function createBullMQConnection(): Redis {
  return new Redis(env.redisUrl, { maxRetriesPerRequest: null });
}
