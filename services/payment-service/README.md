# Payment Service

The Payment Service is a dedicated microservice for handling all payment operations in the HomeTrip platform. It manages Stripe payment intents, webhook processing, refunds, and host payouts via Stripe Connect.

## Features

- **Payment Intent Creation**: Create Stripe PaymentIntents for reservations
- **Stripe Webhook Processing**: Handle all Stripe events including payment success, failure, and refunds
- **Refunds**: Process full and partial refunds for completed payments
- **Host Payouts**: Manage Stripe Connect transfers to host accounts
- **Payment History**: Track complete payment lifecycle and history
- **Event Publishing**: Publish payment events to the event bus for inter-service communication
- **Event Subscription**: Subscribe to booking events from other services

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Payment Service                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐         │
│  │ Controllers │  │  Routes     │  │  Middleware  │         │
│  ├─────────────┤  ├─────────────┤  ├──────────────┤         │
│  │ Payment     │  │ /payments   │  │ Auth         │         │
│  │ Webhook     │  │ /webhook    │  │ Logger       │         │
│  └─────────────┘  └─────────────┘  └──────────────┘         │
│         │                │                │                  │
│  ┌──────────────────────────────────────────────────┐        │
│  │          Stripe Integration Layer                │        │
│  │  (PaymentIntent, Charge, Refund, Transfer)      │        │
│  └──────────────────────────────────────────────────┘        │
│         │                │                │                  │
│  ┌──────────────────────────────────────────────────┐        │
│  │            Models & Database (MongoDB)           │        │
│  │  (Payment, PaymentHistory, Transactions)         │        │
│  └──────────────────────────────────────────────────┘        │
│                                                               │
│  ┌──────────────────────────────────────────────────┐        │
│  │       Event Bus & Service Communication          │        │
│  │  (Event Publishing & Subscription)               │        │
│  └──────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

### Payment Management

#### Create Payment Intent
```http
POST /api/payments/intent
Content-Type: application/json
Authorization: Bearer {token}

{
  "reservationId": "res_123",
  "userId": "user_456",
  "listingId": "listing_789",
  "amount": 250.50,
  "currency": "EUR",
  "metadata": {
    "source": "web",
    "campaign": "summer2024"
  }
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "paymentId": "pay_abc123",
    "clientSecret": "pi_1234567890_secret_abcdef",
    "stripePublicKey": "pk_test_xxx"
  }
}
```

#### Confirm Payment
```http
POST /api/payments/confirm
Content-Type: application/json

{
  "paymentId": "pay_abc123",
  "stripePaymentIntentId": "pi_1234567890"
}
```

#### Get Payment Details
```http
GET /api/payments/{paymentId}
```

#### Get User Payments
```http
GET /api/payments/user/{userId}?limit=10&offset=0&status=succeeded
```

#### Refund Payment
```http
POST /api/payments/{paymentId}/refund
Content-Type: application/json
Authorization: Bearer {token}

{
  "amount": 100.00,
  "reason": "Customer requested refund"
}
```

### Stripe Connect

#### Create Stripe Connect Account
```http
POST /api/payments/stripe-connect/account
Content-Type: application/json
Authorization: Bearer {token}

{
  "userId": "user_456",
  "email": "host@example.com",
  "country": "FR"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "stripeAccountId": "acct_1234567890",
    "onboardingUrl": "https://connect.stripe.com/onboarding/..."
  }
}
```

#### Initiate Host Payout
```http
POST /api/payments/host/payout
Content-Type: application/json
X-Service-Name: booking-service
X-API-Key: {service_api_key}

{
  "paymentId": "pay_abc123",
  "stripeAccountId": "acct_1234567890"
}
```

### Webhook

#### Stripe Webhook
```http
POST /api/webhook/webhook
Content-Type: application/json
Stripe-Signature: {signature}

{
  "id": "evt_1234567890",
  "object": "event",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_1234567890",
      ...
    }
  }
}
```

### Monitoring

#### Health Check
```http
GET /health
```

#### Readiness Check
```http
GET /ready
```

#### Service Info
```http
GET /api/info
```

## Events

### Published Events

- **payment.created**: New payment created
  ```json
  {
    "paymentId": "pay_abc123",
    "reservationId": "res_123",
    "userId": "user_456",
    "amount": 250.50,
    "currency": "EUR",
    "stripePaymentIntentId": "pi_1234567890"
  }
  ```

- **payment.succeeded**: Payment completed successfully
  ```json
  {
    "paymentId": "pay_abc123",
    "reservationId": "res_123",
    "userId": "user_456",
    "amount": 250.50,
    "stripePaymentIntentId": "pi_1234567890",
    "processedAt": "2024-01-15T10:30:00Z"
  }
  ```

- **payment.failed**: Payment processing failed
  ```json
  {
    "paymentId": "pay_abc123",
    "reservationId": "res_123",
    "userId": "user_456",
    "reason": "Your card was declined",
    "code": "card_declined",
    "processedAt": "2024-01-15T10:30:00Z"
  }
  ```

- **payment.refunded**: Payment refunded
  ```json
  {
    "paymentId": "pay_abc123",
    "reservationId": "res_123",
    "userId": "user_456",
    "refundAmount": 250.50,
    "refundReason": "Customer requested",
    "stripeRefundId": "re_1234567890",
    "processedAt": "2024-01-15T10:30:00Z"
  }
  ```

- **host.payout.initiated**: Host payout transfer initiated
  ```json
  {
    "paymentId": "pay_abc123",
    "reservationId": "res_123",
    "stripeAccountId": "acct_1234567890",
    "transferId": "tr_1234567890",
    "payoutAmount": 225.45
  }
  ```

### Subscribed Events

- **booking.created**: New booking created
- **booking.cancelled**: Booking cancelled
- **user.updated**: User information updated

## Database Schema

### Payment Collection

```javascript
{
  _id: ObjectId,
  reservationId: String,        // Reference to booking service
  userId: String,               // Reference to user service
  listingId: String,            // Reference to listing service
  amount: Number,               // Payment amount
  currency: String,             // EUR, USD, GBP, CHF
  paymentMethod: String,        // card, bank_transfer, wallet, stripe
  description: String,          // Payment description
  status: String,               // pending, processing, succeeded, failed, refunded

  // Stripe Integration
  stripePaymentIntentId: String,
  stripeChargeId: String,
  stripeCustomerId: String,
  stripePaymentMethodId: String,

  // Payment Timeline
  successAt: Date,
  failedAt: Date,
  failureReason: String,
  failureCode: String,

  // Refund Information
  refundedAt: Date,
  refundAmount: Number,
  refundReason: String,
  stripeRefundId: String,

  // Host Payout (Stripe Connect)
  hostPayoutId: String,
  hostPayoutStatus: String,     // pending, initiated, completed, failed
  hostCommission: Number,
  applicationFee: Number,

  // Metadata
  metadata: Map,
  notes: String,
  processedBy: String,

  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

## Indexes

- `reservationId + status`
- `userId + createdAt`
- `status + createdAt`
- `stripePaymentIntentId`
- `stripeChargeId`
- `stripeRefundId`
- `createdAt`
- `successAt`

## Configuration

### Environment Variables

```env
# Server
PORT=4005
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/hometrip_payment

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLIC_KEY=pk_test_...

# Service URLs
BOOKING_SERVICE_URL=http://localhost:4004
USER_SERVICE_URL=http://localhost:4002
NOTIFICATION_SERVICE_URL=http://localhost:4006
ANALYTICS_SERVICE_URL=http://localhost:4007

# Event Bus
EVENT_BUS_URL=http://localhost:5000
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# Logging
LOG_LEVEL=info
LOG_DIR=./logs

# Feature Flags
ENABLE_WEBHOOKS=true
ENABLE_STRIPE_CONNECT=true
ENABLE_REFUNDS=true
```

## Running the Service

### Development

```bash
# Install dependencies
npm install

# Start the service
npm run dev
```

### Production

```bash
# Build and start
npm install --production
npm start
```

### Docker

```bash
# Build image
docker build -t hometrip-payment-service .

# Run container
docker run -d \
  -p 4005:4005 \
  -e STRIPE_SECRET_KEY=sk_test_... \
  -e STRIPE_WEBHOOK_SECRET=whsec_... \
  -e MONGODB_URI=mongodb://mongodb:27017/hometrip_payment \
  hometrip-payment-service
```

## Important Notes

### Webhook Signature Verification

The webhook endpoint uses `express.raw()` to receive raw request bodies. This is **critical** for Stripe webhook signature verification to work correctly.

The webhook route must be registered **BEFORE** the general body parser middleware in the Express app:

```javascript
// CORRECT - Webhook FIRST
app.use('/api/webhook', webhookRoutes);

// THEN body parser
app.use(express.json());
```

### Stripe Secret Key Security

Never commit the Stripe secret key to version control. Use environment variables or a secrets management system.

### Idempotency

All payment operations support idempotency. Stripe prevents duplicate charges by using idempotency keys.

## Error Handling

The service implements comprehensive error handling:

- **Validation Errors** (400): Invalid request parameters
- **Authentication Errors** (401): Missing or invalid authentication
- **Not Found Errors** (404): Resource not found
- **Payment Errors** (402): Payment processing failed
- **Server Errors** (500): Unexpected server errors

All errors are logged with full context for debugging.

## Logging

The service uses Winston for structured logging:

- **Logs Directory**: `/app/logs/` (configurable via `LOG_DIR`)
- **Log Files**:
  - `combined.log`: All logs
  - `error.log`: Error logs only
- **Log Level**: Configurable via `LOG_LEVEL` env var
- **Development**: Console output with colors
- **Production**: File-based logging with rotation

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

## Monitoring & Alerting

Key metrics to monitor:

- Payment success rate
- Payment failure rate
- Average payment processing time
- Webhook delivery latency
- Database connection health
- Service availability (uptime)

## License

MIT

## Support

For support, contact the HomeTrip development team or create an issue in the repository.
