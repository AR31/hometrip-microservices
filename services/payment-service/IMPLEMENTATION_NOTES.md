# Payment Service Implementation Notes

## Quick Reference

### Service Details
- **Location**: `/home/arwa/hometrip-microservices/services/payment-service`
- **Port**: 4005
- **Database**: MongoDB (hometrip_payment collection)
- **Primary Dependencies**: Stripe, Express, Mongoose, Winston

### Critical Files

#### 1. src/index.js (Main Application)
- Port 4005 configuration
- **CRITICAL**: Webhook route registered BEFORE body parser
- Event bus subscription initialization
- MongoDB connection on startup
- Graceful shutdown handling

#### 2. src/controllers/webhookController.js
- COPIED FROM MONOLITH: `/home/arwa/hometrip-backend/controllers/webhookController.js`
- Handles payment_intent.succeeded events
- Handles payment_intent.payment_failed events
- Handles charge.refunded events
- Handles charge.dispute.created events
- Publishes to event bus and notifies services

#### 3. src/routes/webhook.js
- Uses `express.raw({ type: 'application/json' })` for raw body
- NO middleware before this route (signature verification)
- Endpoint: POST /api/webhook/webhook

#### 4. src/models/Payment.js
- Complete payment lifecycle tracking
- Stripe integration fields (intentId, chargeId, refundId)
- Helper methods: markAsSucceeded(), markAsFailed(), markAsRefunded()
- Indexes for optimal query performance

### API Endpoints Quick Reference

```
Payment Intent:
  POST /api/payments/intent                      (Create)
  POST /api/payments/confirm                     (Confirm)

Payment Details:
  GET  /api/payments/{paymentId}                 (Get single)
  GET  /api/payments/user/{userId}               (Get user history)
  GET  /api/payments/stats                       (Statistics)

Refunds:
  POST /api/payments/{paymentId}/refund          (Process refund)

Stripe Connect:
  POST /api/payments/stripe-connect/account      (Create account)
  POST /api/payments/host/payout                 (Initiate payout)

Webhooks:
  POST /api/webhook/webhook                      (Stripe events)

Monitoring:
  GET  /health                                   (Health check)
  GET  /ready                                    (Readiness)
  GET  /api/info                                 (Service info)
  POST /api/events                               (Incoming events)
```

### Environment Variables (Critical)

```env
# Must be set in production
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Database
MONGODB_URI=mongodb://mongodb:27017/hometrip_payment

# Service URLs
BOOKING_SERVICE_URL=http://booking-service:4004
USER_SERVICE_URL=http://user-service:4002
NOTIFICATION_SERVICE_URL=http://notification-service:4006

# Optional
LOG_LEVEL=info
LOG_DIR=/app/logs
```

### Events Published

1. **payment.created** - When PaymentIntent created
2. **payment.succeeded** - When payment completed
3. **payment.failed** - When payment failed
4. **payment.refunded** - When refund processed
5. **host.payout.initiated** - When transfer sent to host

### Events Subscribed

1. **booking.created** - From booking service
2. **booking.cancelled** - From booking service
3. **user.updated** - From user service

### Database Schema Highlights

```javascript
Payment {
  reservationId: String,          // FK to booking service
  userId: String,                 // FK to user service
  listingId: String,              // FK to listing service

  // Payment data
  amount: Number,
  currency: String,
  status: 'pending|processing|succeeded|failed|refunded',

  // Stripe fields
  stripePaymentIntentId: String,  // Primary Stripe reference
  stripeChargeId: String,         // After payment success
  stripeRefundId: String,         // After refund

  // Timestamps
  successAt: Date,
  failedAt: Date,
  refundedAt: Date,

  // Refund tracking
  refundAmount: Number,
  refundReason: String,

  // Host payout
  hostPayoutId: String,
  hostPayoutStatus: String,
  hostCommission: Number,
  applicationFee: Number
}
```

### Middleware Chain

```
Request → Raw body (for /webhook) → JSON parser → Auth → Routes → Controllers → DB
```

### Error Handling Pattern

```javascript
try {
  // Operation
  await operation();

  // Publish event
  await eventBus.publishEvent('event.type', data);

  // Notify services
  await notifyService(data);

  res.json({ success: true, data });
} catch (error) {
  logger.logError('Error message', error, context);
  res.status(500).json({ success: false, error: 'message' });
}
```

### Testing Webhook Locally

```bash
# 1. Use Stripe CLI to forward webhooks
stripe listen --forward-to localhost:4005/api/webhook/webhook

# 2. Get webhook signing secret
stripe listen --print-secret

# 3. Set in .env
STRIPE_WEBHOOK_SECRET=whsec_...

# 4. Trigger test event
stripe trigger payment_intent.succeeded
```

### Deployment Checklist

- [ ] Configure .env with Stripe keys
- [ ] Run npm install
- [ ] Connect to MongoDB
- [ ] Configure service API keys
- [ ] Register webhook URL in Stripe Dashboard
- [ ] Test payment flow locally
- [ ] Build Docker image
- [ ] Update docker-compose.yml
- [ ] Deploy and verify health endpoints
- [ ] Monitor webhook delivery
- [ ] Test refund flow
- [ ] Test host payout flow

### Performance Considerations

1. **Database Indexes**: 9 indexes on Payment model for fast queries
2. **Webhook Idempotency**: Check existing payment before processing
3. **Service Timeouts**: 5000ms timeout on inter-service calls
4. **Event Publishing**: Non-blocking with fallback logging
5. **Logging**: Structured JSON logs with rotation

### Security Notes

1. **Stripe Signature Verification**: Done in webhook controller
2. **Service Auth**: X-Service-Name and X-API-Key headers
3. **JWT Auth**: User authentication on payment creation and refund
4. **CORS**: Configured with environment variable
5. **Helmet**: Security headers applied to all responses

### Common Issues & Solutions

#### Issue: Stripe signature verification fails
**Solution**: Ensure webhook route is registered BEFORE body parser. Check that express.raw() is used.

#### Issue: Payments not updating after Stripe success
**Solution**: Check webhook is receiving events. Verify STRIPE_WEBHOOK_SECRET matches Stripe Dashboard.

#### Issue: Host payouts not working
**Solution**: Verify stripeAccountId exists. Ensure Stripe Connect account is verified in Stripe Dashboard.

#### Issue: Events not publishing
**Solution**: Check EVENT_BUS_URL is accessible. Service can continue without event bus (logged as warning).

### Monitoring

Key metrics to monitor:
- Payment success rate (goal: >95%)
- Webhook delivery latency (goal: <1s)
- Database connection health
- Service uptime (goal: 99.9%)
- Error rate (goal: <1%)

### Logs Location

- Development: Console output
- Production: `/app/logs/combined.log` and `/app/logs/error.log`
- Log rotation: 10MB per file, max 5 files per stream

### Support & Debugging

Enable debug logging:
```env
LOG_LEVEL=debug
```

Check service status:
```bash
curl http://localhost:4005/health
curl http://localhost:4005/ready
curl http://localhost:4005/api/info
```

View recent logs:
```bash
tail -f /app/logs/combined.log
```

## Integration Points

### With Booking Service
- Receives: booking.created, booking.cancelled events
- Sends: payment events
- Webhook: /api/internal/payment-notification

### With User Service
- Receives: user.updated events
- Sends: Stripe account ID updates
- Webhook: /api/internal/update-stripe-account

### With Notification Service
- Sends: Payment notifications
- Webhook: /api/internal/send-notification

### With Analytics Service
- Publishes: Payment events for analytics
- Used for: Revenue tracking, conversion analysis

## File Sizes & Complexity

- webhookController.js: ~300 lines (logic-heavy)
- paymentController.js: ~350 lines (CRUD + Stripe ops)
- index.js: ~200 lines (setup + routing)
- Payment.js: ~200 lines (schema + methods)
- Other files: <150 lines each

Total: ~1500 lines of production-ready code
