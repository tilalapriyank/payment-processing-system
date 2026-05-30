import { Router } from 'express';
import { prisma } from '../config/database';
import { redis } from '../config/redis';

export const healthRouter = Router();

async function checkDatabase(): Promise<'up' | 'down'> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return 'up';
  } catch {
    return 'down';
  }
}

async function checkRedis(): Promise<'up' | 'down'> {
  try {
    const response = await redis.ping();
    return response === 'PONG' ? 'up' : 'down';
  } catch {
    return 'down';
  }
}

healthRouter.get('/health', async (_req, res) => {
  const [database, redisStatus] = await Promise.all([checkDatabase(), checkRedis()]);
  const success = database === 'up' && redisStatus === 'up';

  return res.status(success ? 200 : 503).json({
    success,
    message: success ? 'Service is healthy' : 'Service is degraded',
    database,
    redis: redisStatus,
    timestamp: new Date().toISOString(),
  });
});
