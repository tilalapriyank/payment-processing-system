import { getRetryDelay } from '../../src/utils/retry-delay';

describe('Retry Delay', () => {
  it('returns 2000ms for attempt 1', () => {
    expect(getRetryDelay(1)).toBe(2000);
  });

  it('returns 4000ms for attempt 2', () => {
    expect(getRetryDelay(2)).toBe(4000);
  });

  it('returns 8000ms for attempt 3', () => {
    expect(getRetryDelay(3)).toBe(8000);
  });
});
