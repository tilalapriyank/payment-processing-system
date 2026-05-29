export enum GatewayResult {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  TIMEOUT = 'TIMEOUT',
}

export interface GatewayProcessResult {
  result: GatewayResult.SUCCESS;
  gatewayReference: string;
}

export interface GatewayFailedResult {
  result: GatewayResult.FAILED;
}

export type GatewayOutcome = GatewayProcessResult | GatewayFailedResult;
