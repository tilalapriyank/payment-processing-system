import { randomUUID } from 'crypto';
import { redis } from '../config/redis';
import {
  PAYMENT_LOCK_TTL_SECONDS,
  getPaymentLockKey,
} from '../constants/redis.constants';

export async function acquireLock(paymentId: string): Promise<string | null> {
  const lockKey = getPaymentLockKey(paymentId);
  const lockValue = randomUUID();

  const result = await redis.set(
    lockKey,
    lockValue,
    'EX',
    PAYMENT_LOCK_TTL_SECONDS,
    'NX'
  );

  return result === 'OK' ? lockValue : null;
}

export async function releaseLock(paymentId: string, lockValue: string): Promise<void> {
  const lockKey = getPaymentLockKey(paymentId);

  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;

  await redis.eval(script, 1, lockKey, lockValue);
}
