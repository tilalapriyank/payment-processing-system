export function getRetryDelay(attempt: number): number {
  return 2000 * Math.pow(2, attempt - 1);
}
