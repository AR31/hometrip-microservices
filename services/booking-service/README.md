# Booking Service

Booking and reservation management microservice for HomeTrip. Handles creation, management, cancellation, and completion of property reservations.

## Features

- Create reservations with availability checking
- Manage reservation lifecycle (pending, confirmed, cancelled, completed)
- Calculate pricing with seasonal rates and discounts
- Process payments and confirm bookings
- Send and subscribe to booking-related events
- Support for instant booking and request-to-book flows
- Refund calculations based on cancellation policies
- Track reservation status for both guests and hosts

## Technology Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **RabbitMQ** - Message queue for events
- **JWT** - Authentication
- **Stripe** - Payment processing
- **Winston** - Logging

## Architecture

```
src/
├── config/           # Configuration files
├── controllers/      # Business logic
├── middleware/       # Express middleware
├── models/          # MongoDB models
├── routes/          # API routes
└── utils/           # Utility functions
```

## API Endpoints

### Create Booking
```
POST /api/bookings
Headers: Authorization: Bearer <token>
Body: {
  listingId: string,
  startDate: ISO8601,
  endDate: ISO8601,
  numberOfGuests: { adults, children, infants },
  specialRequests?: string,
  pricing: { nightlyRate, subtotal, serviceFee, cleaningFee, total }
}
```

### Get User Reservations
```
GET /api/bookings/user?status=confirmed&role=guest
Headers: Authorization: Bearer <token>
```

### Check Availability
```
GET /api/bookings/availability?listingId=xxx&startDate=2024-01-01&endDate=2024-01-10
```

### Calculate Price
```
POST /api/bookings/calculate-price
Body: {
  listingId: string,
  startDate: ISO8601,
  endDate: ISO8601,
  numberOfGuests: number,
  couponCode?: string
}
```

### Get Reservation Details
```
GET /api/bookings/:id
Headers: Authorization: Bearer <token>
```

### Update Reservation
```
PUT /api/bookings/:id
Headers: Authorization: Bearer <token>
Body: { specialRequests?: string }
```

### Cancel Reservation
```
POST /api/bookings/:id/cancel
Headers: Authorization: Bearer <token>
Body: { reason?: string }
```

### Complete Reservation (Host only)
```
POST /api/bookings/:id/complete
Headers: Authorization: Bearer <token>
```

### Accept Booking (Host only)
```
POST /api/bookings/:id/accept
Headers: Authorization: Bearer <token>
```

### Decline Booking (Host only)
```
POST /api/bookings/:id/decline
Headers: Authorization: Bearer <token>
Body: { reason?: string }
```

### Confirm Payment
```
POST /api/bookings/confirm-payment
Headers: Authorization: Bearer <token>
Body: {
  reservationId: string,
  paymentIntentId: string
}
```

## Events

### Published Events

- **booking.created** - New reservation created
  ```json
  {
    "reservationId": "...",
    "userId": "...",
    "hostId": "...",
    "listingId": "...",
    "status": "pending",
    "total": 1000,
    "startDate": "2024-01-01",
    "endDate": "2024-01-10"
  }
  ```

- **booking.confirmed** - Booking confirmed after payment
  ```json
  {
    "reservationId": "...",
    "userId": "...",
    "hostId": "...",
    "listingId": "...",
    "paymentIntentId": "...",
    "total": 1000
  }
  ```

- **booking.cancelled** - Booking cancelled
  ```json
  {
    "reservationId": "...",
    "userId": "...",
    "hostId": "...",
    "refundAmount": 500,
    "reason": "..."
  }
  ```

- **booking.completed** - Booking marked as completed
  ```json
  {
    "reservationId": "...",
    "userId": "...",
    "hostId": "..."
  }
  ```

### Subscribed Events

- **payment.succeeded** - Payment processed successfully
  - Updates booking status to "confirmed"
  - Publishes booking.confirmed event

- **payment.failed** - Payment processing failed
  - Updates booking status to "cancelled"
  - Publishes booking.cancelled event

## Environment Variables

See `.env.example` for all required environment variables.

Key variables:
- `PORT` - Service port (default: 4004)
- `MONGODB_URI` - MongoDB connection string
- `RABBITMQ_URL` - RabbitMQ connection string
- `JWT_SECRET` - JWT signing secret
- `STRIPE_SECRET_KEY` - Stripe secret key

## Running Locally

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Start development server
npm run dev

# Run tests
npm test

# Run linter
npm run lint
```

## Docker

```bash
# Build image
docker build -t booking-service .

# Run container
docker run -p 4004:4004 --env-file .env booking-service
```

## Database Indexes

The service creates the following indexes for optimal performance:

- `user: 1, createdAt: -1` - User's reservations in reverse chronological order
- `listing: 1, startDate: 1, endDate: 1` - Availability checking
- `host: 1, status: 1, createdAt: -1` - Host's bookings by status
- `paymentIntentId: 1` - Payment tracking
- `status: 1, createdAt: -1` - Status filtering

## Cancellation Policies

The service supports four cancellation policies with different refund rules:

1. **Flexible** - Full refund anytime
2. **Moderate** - Full refund 7+ days before, 50% refund 3-7 days, no refund <3 days
3. **Strict** - Full refund 14+ days before, 50% refund 7-14 days, no refund <7 days
4. **Super Strict** - Full refund 30+ days before, no refund otherwise

## Health Check

```
GET /health

Response:
{
  "status": "healthy",
  "service": "booking-service",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "version": "1.0.0"
}
```

## Logging

Logs are written to `logs/` directory with Winston logger. Configure `LOG_LEVEL` environment variable:

- `error` - Only errors
- `warn` - Warnings and errors
- `info` - Info, warnings, and errors (default)
- `debug` - All messages

## Error Handling

All errors include:
- Success flag (false)
- Error message
- Error details (in development mode)
- HTTP status code

## Contributing

1. Follow the code structure
2. Write tests for new features
3. Update this README with API changes
4. Ensure linter passes: `npm run lint`

## License

MIT
