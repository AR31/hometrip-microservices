# Payment Service - Quick Start Guide

## Overview

The Payment Service is a complete microservice for handling payments in HomeTrip. It's production-ready and integrates with Stripe for payment processing.

**Location**: `/home/arwa/hometrip-microservices/services/payment-service`
**Port**: 4005
**Database**: MongoDB

## Getting Started

### 1. Setup Environment

```bash
cd /home/arwa/hometrip-microservices/services/payment-service

# Copy and configure environment
cp .env.example .env

# Edit .env with your Stripe keys
nano .env
```

Required environment variables:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLIC_KEY=pk_test_...
MONGODB_URI=mongodb://localhost:27017/hometrip_payment
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Service

**Development**:
```bash
npm run dev
```

**Production**:
```bash
npm start
```

### 4. Verify Service is Running

```bash
curl http://localhost:4005/health
# Response: { "status": "ok", "service": "payment-service", ... }

curl http://localhost:4005/ready
# Response: { "status": "ready", "service": "payment-service", ... }
```

## Testing the Payment Flow

### 1. Create Payment Intent

```bash
curl -X POST http://localhost:4005/api/payments/intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "reservationId": "res_123",
    "userId": "user_456",
    "listingId": "listing_789",
    "amount": 250.50,
    "currency": "EUR"
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "paymentId": "pay_abc123",
#     "clientSecret": "pi_1234567890_secret_abcdef",
#     "stripePublicKey": "pk_test_xxx"
#   }
# }
```

### 2. Confirm Payment

After user pays via Stripe:

```bash
curl -X POST http://localhost:4005/api/payments/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "pay_abc123",
    "stripePaymentIntentId": "pi_1234567890"
  }'
```

### 3. Get Payment Details

```bash
curl http://localhost:4005/api/payments/pay_abc123
```

### 4. Process Refund

```bash
curl -X POST http://localhost:4005/api/payments/pay_abc123/refund \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "amount": 100.00,
    "reason": "Customer requested"
  }'
```

## Testing Webhooks

### Using Stripe CLI

1. **Install Stripe CLI**: https://stripe.com/docs/stripe-cli

2. **Forward webhooks to local service**:
```bash
stripe listen --forward-to localhost:4005/api/webhook/webhook
```

3. **Get webhook secret**:
```bash
stripe listen --print-secret
```

4. **Update .env**:
```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

5. **Trigger test events**:
```bash
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger charge.refunded
```

6. **Monitor webhook events**:
The service will log all received webhook events to the console.

## Docker Deployment

### Build Image

```bash
docker build -t hometrip-payment-service .
```

### Run Container

```bash
docker run -d \
  --name payment-service \
  -p 4005:4005 \
  -e STRIPE_SECRET_KEY=sk_test_... \
  -e STRIPE_WEBHOOK_SECRET=whsec_... \
  -e MONGODB_URI=mongodb://mongodb:27017/hometrip_payment \
  -e BOOKING_SERVICE_URL=http://booking-service:4004 \
  hometrip-payment-service
```

### Check Logs

```bash
docker logs -f payment-service
```

## API Endpoints

### Create Payment Intent
```
POST /api/payments/intent
Headers: Authorization: Bearer {token}
Body: { reservationId, userId, amount, currency }
```

### Get Payment
```
GET /api/payments/{paymentId}
```

### Get User Payments
```
GET /api/payments/user/{userId}?limit=10&offset=0
```

### Confirm Payment
```
POST /api/payments/confirm
Body: { paymentId, stripePaymentIntentId }
```

### Process Refund
```
POST /api/payments/{paymentId}/refund
Headers: Authorization: Bearer {token}
Body: { amount, reason }
```

### Create Host Stripe Account
```
POST /api/payments/stripe-connect/account
Headers: Authorization: Bearer {token}
Body: { userId, email, country }
```

### Initiate Host Payout
```
POST /api/payments/host/payout
Headers: X-Service-Name: booking-service
Body: { paymentId, stripeAccountId }
```

### Stripe Webhook
```
POST /api/webhook/webhook
Headers: Stripe-Signature: {signature}
```

## Monitoring

### Health Endpoints

- **Health Check**: `GET /health`
- **Readiness Check**: `GET /ready`
- **Service Info**: `GET /api/info`

### Logs

Development (Console):
```
npm run dev
```

Production (Files):
```
/app/logs/combined.log     # All logs
/app/logs/error.log        # Errors only
```

### Check Service Status

```bash
# Health check
curl http://localhost:4005/health

# Ready check
curl http://localhost:4005/ready

# Service info
curl http://localhost:4005/api/info
```

## Event Bus Integration

### Events Published
- payment.created
- payment.succeeded
- payment.failed
- payment.refunded
- host.payout.initiated

### Events Subscribed
- booking.created
- booking.cancelled
- user.updated

## Troubleshooting

### Issue: Stripe signature verification fails

**Cause**: Missing or incorrect webhook secret

**Solution**:
1. Get webhook secret from Stripe Dashboard or Stripe CLI
2. Set in .env: `STRIPE_WEBHOOK_SECRET=whsec_...`
3. Restart service

### Issue: "Webhook Error: No webhook secret provided"

**Cause**: STRIPE_WEBHOOK_SECRET not set

**Solution**: Set the environment variable and restart

### Issue: PaymentIntent creation fails

**Cause**: Invalid Stripe secret key

**Solution**:
1. Verify STRIPE_SECRET_KEY in .env
2. Check it starts with `sk_test_` (development)
3. Verify it's from the correct Stripe account

### Issue: MongoDB connection error

**Cause**: MongoDB not running or invalid URI

**Solution**:
1. Verify MongoDB is running
2. Check MONGODB_URI in .env
3. Verify credentials and host:port

### Issue: Service won't start

**Cause**: Port 4005 already in use

**Solution**:
1. Find and kill process: `lsof -i :4005`
2. Or change PORT in .env

## Common Workflows

### Complete Payment Flow

1. **Create PaymentIntent**
   ```bash
   POST /api/payments/intent
   ```

2. **Send clientSecret to Frontend**
   - Frontend uses Stripe Elements to process payment

3. **Handle Stripe Response**
   - Stripe confirms payment

4. **Webhook Received**
   - Service receives `payment_intent.succeeded` webhook

5. **Payment Status Updated**
   - Database record updated
   - Event published to event bus

### Refund Flow

1. **Get Payment Details**
   ```bash
   GET /api/payments/{paymentId}
   ```

2. **Process Refund**
   ```bash
   POST /api/payments/{paymentId}/refund
   ```

3. **Webhook Received**
   - Service receives `charge.refunded` webhook

4. **Refund Confirmed**
   - Payment status updated to "refunded"
   - Event published

### Host Payout Flow

1. **Create Stripe Connect Account**
   ```bash
   POST /api/payments/stripe-connect/account
   ```

2. **Host Completes Onboarding**
   - Via Stripe onboarding link

3. **Initiate Payout**
   ```bash
   POST /api/payments/host/payout
   ```

4. **Funds Transferred**
   - Transfer created in Stripe
   - Event published

## Performance Tips

1. **Enable Caching**: Add Redis for frequent lookups
2. **Optimize Queries**: Use database indexes (already done)
3. **Rate Limiting**: Add rate limiter for public endpoints
4. **Batch Operations**: Use batch events for multiple payments
5. **Monitor Logs**: Keep file size under control with rotation

## Security Notes

1. **Never commit .env** to version control
2. **Use strong API keys** in production
3. **Validate all inputs** before processing
4. **Log sensitive data** carefully
5. **Use HTTPS** for all API calls
6. **Rotate keys** regularly

## Next Steps

1. Read [README.md](./README.md) for comprehensive documentation
2. Read [IMPLEMENTATION_NOTES.md](./IMPLEMENTATION_NOTES.md) for technical details
3. Configure .env with your Stripe keys
4. Test the payment flow
5. Deploy to your environment
6. Monitor service metrics
7. Set up alerting

## Support

For issues or questions:
1. Check logs: `tail -f /app/logs/combined.log`
2. Review error messages
3. Check [IMPLEMENTATION_NOTES.md](./IMPLEMENTATION_NOTES.md) troubleshooting section
4. Check Stripe Dashboard for webhook delivery status

## Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Connect](https://stripe.com/docs/connect)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)

---

**Status**: Production Ready ✓
**Last Updated**: 2024
**Version**: 1.0.0
