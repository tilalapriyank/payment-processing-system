import {
  computeWebhookSignature,
  verifyWebhookSignature,
} from '../../src/utils/webhook-signature';

describe('Webhook Signature', () => {
  const secret = 'test-webhook-secret';
  const payload = JSON.stringify({
    eventId: 'evt-1',
    paymentId: '550e8400-e29b-41d4-a716-446655440000',
    status: 'SUCCESS',
  });

  it('computes a stable HMAC-SHA256 hex digest', () => {
    const signature = computeWebhookSignature(payload, secret);
    expect(signature).toMatch(/^[a-f0-9]{64}$/);
    expect(computeWebhookSignature(payload, secret)).toBe(signature);
  });

  it('accepts a valid signature', () => {
    const signature = computeWebhookSignature(payload, secret);
    expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
  });

  it('rejects an invalid signature', () => {
    expect(verifyWebhookSignature(payload, 'invalid-signature', secret)).toBe(false);
  });
});
