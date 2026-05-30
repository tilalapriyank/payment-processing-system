import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import type { Express } from 'express';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Payment Processing System API',
    version: '1.0.0',
    description:
      'Fintech-style payment processing API with idempotency, async queue processing, gateway simulation, retries, Redis locking, and webhooks.',
  },
  servers: [{ url: '/api', description: 'API base path' }],
  components: {
    schemas: {
      HealthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Service is healthy' },
          database: { type: 'string', enum: ['up', 'down'], example: 'up' },
          redis: { type: 'string', enum: ['up', 'down'], example: 'up' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      CreatePaymentRequest: {
        type: 'object',
        required: ['amount', 'currency'],
        properties: {
          amount: { type: 'number', example: 100 },
          currency: { type: 'string', example: 'USD', minLength: 3, maxLength: 3 },
        },
      },
      PaymentResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          amount: { type: 'string', example: '100.00' },
          currency: { type: 'string', example: 'USD' },
          status: {
            type: 'string',
            enum: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED'],
          },
          idempotencyKey: { type: 'string' },
          retryCount: { type: 'integer' },
          gatewayReference: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      WebhookRequest: {
        type: 'object',
        required: ['eventId', 'paymentId', 'status'],
        properties: {
          eventId: { type: 'string', example: 'evt-123' },
          paymentId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['SUCCESS', 'FAILED'] },
        },
      },
      WebhookResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          200: {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },
    '/payments': {
      post: {
        tags: ['Payments'],
        summary: 'Create a payment',
        parameters: [
          {
            in: 'header',
            name: 'Idempotency-Key',
            required: true,
            schema: { type: 'string' },
            description: 'Unique key to prevent duplicate payment creation',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreatePaymentRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Payment created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PaymentResponse' },
              },
            },
          },
          200: {
            description: 'Existing payment returned for duplicate idempotency key',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PaymentResponse' },
              },
            },
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/payments/{id}': {
      get: {
        tags: ['Payments'],
        summary: 'Get payment by ID',
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Payment details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PaymentResponse' },
              },
            },
          },
          404: {
            description: 'Payment not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/webhooks/payment': {
      post: {
        tags: ['Webhooks'],
        summary: 'Receive payment gateway webhook callback',
        parameters: [
          {
            in: 'header',
            name: 'X-Signature',
            required: false,
            schema: { type: 'string' },
            description:
              'HMAC-SHA256 hex digest of the raw JSON body (required when WEBHOOK_SECRET is set)',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/WebhookRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Webhook accepted',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WebhookResponse' },
              },
            },
          },
          400: {
            description: 'Invalid payload',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
  },
};

const swaggerSpec = swaggerJsdoc({
  definition: swaggerDefinition,
  apis: [],
});

export function setupSwagger(app: Express): void {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}
