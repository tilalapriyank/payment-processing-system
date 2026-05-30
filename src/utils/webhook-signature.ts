import { createHmac, timingSafeEqual } from 'crypto';

export function computeWebhookSignature(
  payload: string | Buffer,
  secret: string
): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string | undefined,
  secret: string
): boolean {
  if (!signature?.trim()) {
    return false;
  }

  const expected = computeWebhookSignature(payload, secret);

  if (signature.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expected, 'utf8'));
}
