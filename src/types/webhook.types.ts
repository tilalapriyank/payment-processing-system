export interface WebhookPayload {
  eventId: string;
  paymentId: string;
  status: 'SUCCESS' | 'FAILED';
}

export interface WebhookResponse {
  success: boolean;
  message: string;
}
