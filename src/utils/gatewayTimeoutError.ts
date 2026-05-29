export class GatewayTimeoutError extends Error {
  constructor(message = 'Gateway request timed out') {
    super(message);
    this.name = 'GatewayTimeoutError';
  }
}
