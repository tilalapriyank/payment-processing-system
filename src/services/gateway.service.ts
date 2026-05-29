import {
  GATEWAY_DELAY_MS,
  GATEWAY_FAILED_WEIGHT,
  GATEWAY_SUCCESS_WEIGHT,
  GATEWAY_TIMEOUT_WEIGHT,
} from '../constants/gateway.constants';
import { logger } from '../config/logger';
import { GatewayResult, type GatewayOutcome } from '../types/gateway.types';
import { GatewayTimeoutError } from '../utils/gatewayTimeoutError';
import { sleep } from '../utils/sleep';

function generateGatewayReference(): string {
  return `GW-${Date.now()}`;
}

export class GatewayService {
  async processPayment(paymentId: string): Promise<GatewayOutcome> {
    const rand = Math.random();

    logger.info({ paymentId, rand }, 'Simulating gateway call');

    if (rand < GATEWAY_SUCCESS_WEIGHT) {
      const gatewayReference = generateGatewayReference();
      logger.info({ paymentId, gatewayReference }, 'Gateway immediate success');
      return { result: GatewayResult.SUCCESS, gatewayReference };
    }

    if (rand < GATEWAY_FAILED_WEIGHT) {
      logger.info({ paymentId }, 'Gateway failure');
      return { result: GatewayResult.FAILED };
    }

    if (rand < GATEWAY_TIMEOUT_WEIGHT) {
      logger.info({ paymentId }, 'Gateway timeout');
      throw new GatewayTimeoutError();
    }

    logger.info({ paymentId, delayMs: GATEWAY_DELAY_MS }, 'Gateway delayed success');
    await sleep(GATEWAY_DELAY_MS);

    const gatewayReference = generateGatewayReference();
    return { result: GatewayResult.SUCCESS, gatewayReference };
  }
}

export const gatewayService = new GatewayService();
