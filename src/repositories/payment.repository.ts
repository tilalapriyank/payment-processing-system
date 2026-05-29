export interface CreatePaymentInput {
  amount: number;
  currency: string;
  idempotencyKey: string;
}
