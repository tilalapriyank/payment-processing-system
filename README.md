# Payment Processing System

A production-style payment processing backend built with **Node.js**, **TypeScript**, **Express**, **Prisma**, **PostgreSQL**, **Redis**, and **BullMQ**. It demonstrates fintech-oriented patterns including idempotency, state machines, asynchronous processing, gateway simulation, exponential backoff retries, distributed locking, and resilient webhook handling.

## Assignment Coverage

| Requirement | Status |
|-------------|--------|
| Payment Lifecycle | ✅ |
| Retry Logic | ✅ |
| Idempotency | ✅ |
| Concurrency Control | ✅ |
| Gateway Simulation | ✅ |
| Webhook Handling | ✅ |
| Data Consistency | ✅ |
| Logging | ✅ |
| Testing | ✅ |
| Swagger | ✅ |
| Docker | ✅ |

## Overview

This system accepts payment requests, persists them, processes them asynchronously through a queue/worker pipeline, simulates an external payment gateway, retries transient failures, prevents duplicate concurrent processing with Redis locks, and handles out-of-order or duplicate webhook callbacks safely.

## Architecture

```text
Client
  |
  v
Express API
  |
  +--> PostgreSQL (payments, events, webhooks)
  |
  +--> BullMQ Queue (Redis)
         |
         v
       Worker
         |
         +--> Redis Distributed Lock
         |
         v
       Gateway Simulator
         |
         v
       Payment State Updates
         |
         v
       Webhook Callbacks (POST /api/webhooks/payment)
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20 |
| Language | TypeScript |
| API | Express 5 |
| ORM | Prisma 7 |
| Database | PostgreSQL 16 |
| Queue | BullMQ + Redis |
| Validation | Zod |
| Logging | Pino |
| Testing | Jest + Supertest |
| Docs | Swagger UI |
| Containers | Docker + Docker Compose |

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL
- Redis

### Local Development

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npm run dev
```

API: `http://localhost:3000`  
Swagger: `http://localhost:3000/api-docs`

### Docker

```bash
docker compose up --build
```

Services:

- `app` — API + worker
- `postgres` — PostgreSQL
- `redis` — Redis

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | HTTP port (default: 3000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Reserved for future auth (not used in current scope) |
| `WEBHOOK_SECRET` | Optional: enables `X-Signature` HMAC-SHA256 verification on webhooks |
| `FORCE_GATEWAY_TIMEOUT` | Optional: force gateway timeouts for retry testing |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Service health check |
| POST | `/api/payments` | Create payment (requires `Idempotency-Key` header) |
| GET | `/api/payments/:id` | Get payment by ID |
| POST | `/api/webhooks/payment` | Gateway webhook callback |
| GET | `/api-docs` | Swagger documentation |

### Create Payment

```http
POST /api/payments
Idempotency-Key: order-123
Content-Type: application/json

{
  "amount": 100,
  "currency": "USD"
}
```

### Webhook Callback

When `WEBHOOK_SECRET` is set, include an HMAC-SHA256 hex digest of the raw JSON body:

```http
POST /api/webhooks/payment
Content-Type: application/json
X-Signature: <hmac-sha256-hex-of-raw-body>

{
  "eventId": "evt-123",
  "paymentId": "<payment-uuid>",
  "status": "SUCCESS"
}
```

If `WEBHOOK_SECRET` is unset, signature verification is skipped (local development only).

## Payment Lifecycle

```text
PENDING
  -> PROCESSING (worker picks job)
  -> Gateway simulation
  -> SUCCESS | FAILED
  -> (on TIMEOUT) retry with exponential backoff
  -> FAILED after max retries
```

## State Machine

Valid transitions:

```text
PENDING     -> PROCESSING
PROCESSING  -> SUCCESS | FAILED
SUCCESS     -> (terminal)
FAILED      -> (terminal)
```

Invalid transitions (e.g. `SUCCESS -> FAILED`) are rejected.

## Idempotency Design

Three layers of protection:

1. **API layer** — `Idempotency-Key` header with unique DB constraint
2. **Queue layer** — unique BullMQ job IDs per payment
3. **Worker layer** — Redis distributed lock (`SET NX EX`)

Duplicate create requests return the same payment without creating a new row.

## Retry Strategy

On gateway timeout:

```text
Attempt 1 -> 2000ms delay
Attempt 2 -> 4000ms delay
Attempt 3 -> 8000ms delay
Max retries exceeded -> FAILED
```

Configured via `MAX_RETRY_ATTEMPTS = 3`.

## Distributed Locking

Workers acquire a Redis lock before processing:

```text
SET payment:{paymentId} {lockValue} NX EX 30
```

If lock acquisition fails, the job exits safely with `PAYMENT_LOCK_SKIPPED`.

## Webhook Handling

- **Duplicate callbacks** — deduplicated by unique `eventId`
- **Early callbacks** — stored before processing; never lost
- **Conflicting callbacks** — terminal states (`SUCCESS`/`FAILED`) are never downgraded

## Design Decisions

### Why BullMQ?

Payments are processed asynchronously in the background. BullMQ provides reliable job queuing, delayed retries, and worker scaling — essential for decoupling API response time from gateway latency.

### Why Redis Locking?

Multiple workers can pick up jobs for the same payment under load. Redis distributed locks (`SET NX EX`) ensure only one worker processes a payment at a time, preventing race conditions and inconsistent state.

### Why Idempotency Keys?

Network retries and client double-clicks can send duplicate create requests. Idempotency keys with a unique DB constraint guarantee the same request never creates two charges.

### Why Exponential Backoff?

Gateway timeouts are often transient. Exponential backoff (2s → 4s → 8s) gives the external provider time to recover before marking a payment as permanently failed.

## Testing

```bash
npm test
npm run test:unit
npm run test:integration
```

Test coverage includes:

- Unit: state machine, retry delay, webhook transitions
- Integration: payment creation, idempotency, webhooks
- Concurrency: 20 parallel requests with same idempotency key

## Project Structure

```text
src/
  config/         Environment, DB, Redis, logger, Swagger
  constants/      Payment, queue, gateway, Redis constants
  controllers/    HTTP handlers
  middlewares/    Error handling
  queues/         BullMQ queue setup
  repositories/   Database access
  routes/         API routes
  services/       Business logic
  types/          Shared types
  utils/          Helpers (locks, retry, transitions)
  validators/     Zod schemas
  workers/        BullMQ workers
  app.ts          Express app
  server.ts       Server + worker bootstrap
```

## Known Limitations

This implementation is designed as an assignment project demonstrating fintech patterns, not as a production payment processor.

Conscious trade-offs and future production enhancements:

- Transactional Outbox Pattern (reliable enqueue after DB commit)
- Optimistic locking / conditional status updates for all writers
- Webhook replay protection (timestamp tolerance, nonce store)
- Dead-letter queue for permanently failed jobs
- OpenTelemetry tracing and Prometheus metrics
- Multi-process deployment (separate API and worker containers)
- Real PSP integration with charge-level idempotency keys
- CI/CD with versioned Prisma migrations

## Future Improvements

- JWT authentication for protected endpoints
- Admin dashboard for payment audit trail
- CI/CD pipeline with automated migrations

## License

ISC
