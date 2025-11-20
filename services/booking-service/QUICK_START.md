# Booking Service - Quick Start Guide

Get the Booking Service up and running in minutes.

## Prerequisites

- Node.js 18+ installed
- MongoDB instance (local or remote)
- RabbitMQ instance (for event bus)
- Redis (optional, for caching)

## Installation (Development)

### 1. Setup Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Development settings
NODE_ENV=development
PORT=4004
SERVICE_HOST=0.0.0.0

# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/booking_db

# Local RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# JWT Secret (change in production)
JWT_SECRET=dev-secret-key-change-in-production

# Logging
LOG_LEVEL=info
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

You should see:
```
Booking Service started on port 4004
Connected to MongoDB
Connected to RabbitMQ
```

### 4. Verify Service is Running

```bash
curl http://localhost:4004/health

# Response:
{
  "status": "healthy",
  "service": "booking-service",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "version": "1.0.0"
}
```

## Docker Setup (Production)

### 1. Build Image

```bash
docker build -t booking-service:latest .
```

### 2. Run Container

```bash
docker run -d \
  --name booking-service \
  --port 4004:4004 \
  --env-file .env \
  booking-service:latest
```

### 3. Check Logs

```bash
docker logs -f booking-service
```

### 4. Verify Health

```bash
curl http://localhost:4004/health
```

## Docker Compose (Recommended)

Add to your main `docker-compose.yml`:

```yaml
booking-service:
  build:
    context: ./services/booking-service
    dockerfile: Dockerfile
  container_name: booking-service
  ports:
    - "4004:4004"
  environment:
    - NODE_ENV=production
    - PORT=4004
    - MONGODB_URI=mongodb://hometrip:password@mongodb:27017/booking_db
    - RABBITMQ_URL=amqp://hometrip:password@rabbitmq:5672
    - JWT_SECRET=${JWT_SECRET}
    - LOG_LEVEL=info
  depends_on:
    - mongodb
    - rabbitmq
  networks:
    - hometrip-network
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:4004/health"]
    interval: 30s
    timeout: 5s
    retries: 3
    start_period: 10s
```

## Testing the API

### Create a Booking

```bash
curl -X POST http://localhost:4004/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "listingId": "507f1f77bcf86cd799439011",
    "startDate": "2024-02-01T00:00:00Z",
    "endDate": "2024-02-05T00:00:00Z",
    "numberOfGuests": {
      "adults": 2,
      "children": 1,
      "infants": 0
    },
    "specialRequests": "High floor preferred",
    "pricing": {
      "nightlyRate": 100,
      "subtotal": 400,
      "cleaningFee": 50,
      "serviceFee": 54,
      "taxes": 0,
      "total": 504
    },
    "cancellationPolicy": "moderate"
  }'
```

### Check Availability

```bash
curl "http://localhost:4004/api/bookings/availability?listingId=507f1f77bcf86cd799439011&startDate=2024-02-01T00:00:00Z&endDate=2024-02-05T00:00:00Z"
```

### Calculate Price

```bash
curl -X POST http://localhost:4004/api/bookings/calculate-price \
  -H "Content-Type: application/json" \
  -d '{
    "listingId": "507f1f77bcf86cd799439011",
    "startDate": "2024-02-01T00:00:00Z",
    "endDate": "2024-02-05T00:00:00Z",
    "numberOfGuests": 2
  }'
```

### Get User Reservations

```bash
curl http://localhost:4004/api/bookings/user \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Reservation Details

```bash
curl http://localhost:4004/api/bookings/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Cancel Booking

```bash
curl -X POST http://localhost:4004/api/bookings/507f1f77bcf86cd799439011/cancel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "reason": "Need to change dates"
  }'
```

### Accept Booking (Host)

```bash
curl -X POST http://localhost:4004/api/bookings/507f1f77bcf86cd799439011/accept \
  -H "Authorization: Bearer YOUR_HOST_TOKEN"
```

## Debugging

### Check Logs

```bash
# All logs
tail -f logs/combined.log

# Only errors
tail -f logs/error.log
```

### Change Log Level

Edit `.env`:
```
LOG_LEVEL=debug
```

Restart service:
```bash
npm run dev
```

### Database Connection Issues

```bash
# Test MongoDB connection
mongosh --uri "mongodb://localhost:27017/booking_db"

# Check collections
db.reservations.countDocuments()
```

### RabbitMQ Connection Issues

```bash
# Test RabbitMQ connection
# Access management UI at http://localhost:15672
# Default: guest/guest
```

## Environment Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| NODE_ENV | development | Environment (development/production) |
| PORT | 4004 | Service port |
| MONGODB_URI | mongodb://localhost:27017/booking_db | Database connection |
| RABBITMQ_URL | amqp://guest:guest@localhost:5672 | Message queue URL |
| JWT_SECRET | your-secret-key | JWT signing secret |
| LOG_LEVEL | info | Logging level |
| CORS_ORIGIN | http://localhost:3000 | Allowed CORS origins |
| RATE_LIMIT_MAX | 100 | Requests per window |
| RATE_LIMIT_WINDOW_MS | 900000 | Rate limit window (15 min) |

## Common Issues & Solutions

### Port Already in Use

```bash
# Find process using port 4004
lsof -i :4004

# Kill process
kill -9 <PID>
```

### MongoDB Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

Solution: Start MongoDB:
```bash
mongod
# or with Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### RabbitMQ Connection Error

```
Error: Failed to connect to RabbitMQ
```

Solution: Start RabbitMQ:
```bash
# Docker
docker run -d -p 5672:5672 -p 15672:15672 --name rabbitmq rabbitmq:3-management

# Access management UI: http://localhost:15672
```

### JWT Token Invalid

```
Error: Invalid token / Token expired
```

Solution:
- Ensure JWT_SECRET matches between services
- Get fresh token from auth service
- Check token format: `Bearer <token>`

### High Memory Usage

Solution:
- Check for memory leaks in logs
- Restart service: `npm run dev`
- Increase Node.js heap: `NODE_OPTIONS=--max-old-space-size=4096 npm run dev`

## Performance Tips

1. **Database Indexes**: Already created, optimal for queries
2. **Connection Pooling**: Managed by Mongoose and amqplib
3. **Response Compression**: Enabled for all responses
4. **Rate Limiting**: Default 100 requests per 15 minutes
5. **Log Rotation**: Files limited to 5MB, 5 files retained

## Next Steps

1. Set up other microservices (listing-service, payment-service, etc.)
2. Configure Docker Compose for full stack
3. Set up environment-specific configurations
4. Implement custom business logic if needed
5. Add additional monitoring and alerting

## Support Resources

- **Documentation**: Read `README.md` for API details
- **Architecture**: Check `ARCHITECTURE.md` for design details
- **Implementation**: Review `IMPLEMENTATION_SUMMARY.md` for technical info
- **Logs**: Check `logs/combined.log` for detailed debugging
- **Health Check**: `curl http://localhost:4004/health`

## Service Health Monitoring

```bash
# Check service status
curl http://localhost:4004/health

# Monitor logs in real-time
tail -f logs/combined.log

# Count reservations
curl http://localhost:4004/api/bookings/user \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.count'
```

## Reset Database (Development Only)

```bash
# Delete all reservations
mongosh booking_db --eval "db.reservations.deleteMany({})"

# Verify
mongosh booking_db --eval "db.reservations.countDocuments()"
```

## Run Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm test -- --coverage
```

## Lint Code

```bash
npm run lint
```

## Production Deployment Checklist

- [ ] Change JWT_SECRET to a strong random value
- [ ] Set NODE_ENV=production
- [ ] Configure CORS_ORIGIN properly
- [ ] Set LOG_LEVEL=info (not debug)
- [ ] Use environment-specific MongoDB URI
- [ ] Use environment-specific RabbitMQ URL
- [ ] Configure Stripe keys
- [ ] Set up proper error monitoring (e.g., Sentry)
- [ ] Configure log aggregation (e.g., ELK stack)
- [ ] Set up monitoring and alerting
- [ ] Test graceful shutdown
- [ ] Verify health check endpoint
- [ ] Test all API endpoints
- [ ] Load test the service
- [ ] Set up auto-scaling if needed
