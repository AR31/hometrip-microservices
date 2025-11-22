# Booking Service Architecture

## Service Directory Structure

```
booking-service/
├── src/
│   ├── index.js                    # Main application entry point (232 lines)
│   ├── config/
│   │   ├── index.js                # Environment configuration
│   │   └── database.js             # MongoDB connection management
│   ├── controllers/
│   │   └── bookingController.js    # Business logic for reservations (854 lines)
│   ├── middleware/
│   │   └── auth.js                 # JWT authentication middleware
│   ├── models/
│   │   └── Reservation.js          # MongoDB schema (109 lines)
│   ├── routes/
│   │   └── bookings.js             # Express route definitions
│   └── utils/
│       ├── eventBus.js             # RabbitMQ event handling
│       └── logger.js               # Winston logging setup
├── tests/                          # Test directory (ready for unit tests)
├── package.json                    # Dependencies and scripts
├── Dockerfile                      # Docker container configuration
├── .dockerignore                   # Docker build exclusions
├── .env.example                    # Environment variables template
├── README.md                       # User documentation
└── IMPLEMENTATION_SUMMARY.md       # Implementation details
```

## Component Architecture

```
                    ┌─────────────────────────────────┐
                    │   API Requests from Frontend    │
                    └────────────────┬────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │      Express.js Server          │
                    │      (Port 4004)                │
                    └────────────────┬────────────────┘
                                     │
                  ┌──────────────────┼──────────────────┐
                  │                  │                  │
                  ▼                  ▼                  ▼
          ┌────────────────┐  ┌────────────────┐  ┌─────────────┐
          │   Rate Limit   │  │  CORS Handler  │  │  Validator  │
          │   Middleware   │  │                │  │             │
          └────────────────┘  └────────────────┘  └─────────────┘
                  │                  │                  │
                  └──────────────────┼──────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │   Authentication Middleware     │
                    │   (JWT Token Verification)      │
                    └────────────────┬────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │    Router: /api/bookings        │
                    │    (Route Dispatcher)           │
                    └────────────────┬────────────────┘
                                     │
                  ┌──────────────────┼──────────────────┐
                  │                  │                  │
                  ▼                  ▼                  ▼
          ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐
          │  Create/Read     │  │  Update/Cancel   │  │  Host Actions  │
          │  Reservations    │  │  Reservations    │  │  Accept/Decline│
          │  Check Avail.    │  │  Calculate Price │  │  Complete      │
          └────────┬─────────┘  └────────┬─────────┘  └────────┬───────┘
                   │                     │                     │
                   └─────────────────────┼─────────────────────┘
                                         │
                                         ▼
                    ┌─────────────────────────────────┐
                    │   Booking Controller (12 methods)│
                    │                                 │
                    │ • createReservation()           │
                    │ • getUserReservations()         │
                    │ • getReservation()              │
                    │ • updateReservation()           │
                    │ • cancelReservation()           │
                    │ • checkAvailability()           │
                    │ • calculatePrice()              │
                    │ • confirmPayment()              │
                    │ • completeReservation()         │
                    │ • acceptBooking()               │
                    │ • declineBooking()              │
                    │ • calculateRefund()             │
                    └────────────────┬────────────────┘
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          │                          │                          │
          ▼                          ▼                          ▼
  ┌───────────────┐        ┌──────────────────┐      ┌─────────────────┐
  │   MongoDB     │        │   Event Bus      │      │  External APIs  │
  │   Database    │        │   (RabbitMQ)     │      │  (Listing, etc) │
  │               │        │                  │      │                 │
  │ Reservation   │        │ Publish:         │      └─────────────────┘
  │ Collection    │        │ • booking.created│
  │               │        │ • booking.confirm│
  │ • Indexes     │        │ • booking.cancel │
  │ • Refs        │        │ • booking.complet│
  │ • Aggregation │        │                  │
  │               │        │ Subscribe:       │
  │               │        │ • payment.success│
  │               │        │ • payment.failed │
  └───────────────┘        └──────────────────┘
```

## Data Flow Diagrams

### Create Reservation Flow

```
Guest Request
    │
    ▼
Validate Input
    │
    ▼
Check Authorization
    │
    ▼
Fetch Listing Details
    ├─ Verify host exists
    └─ Get pricing info
    │
    ▼
Check Availability
    ├─ Query overlapping reservations
    └─ Verify property free
    │
    ▼
Calculate Pricing
    ├─ Base price + seasonal
    ├─ Apply discounts
    ├─ Add fees
    └─ Apply coupon
    │
    ▼
Create Reservation (pending/confirmed)
    │
    ▼
Publish booking.created Event
    │
    ▼
Return Response + PaymentIntent
```

### Payment Confirmation Flow

```
Payment Service
    │
    ├─ Process Payment
    │
    ▼
Publish payment.succeeded Event
    │
    ▼
Event Bus (RabbitMQ)
    │
    ▼
Booking Service Listens
    │
    ▼
handlePaymentSucceeded()
    │
    ├─ Update Reservation Status → confirmed
    ├─ Update Payment Status → paid
    ├─ Set confirmedAt timestamp
    │
    ▼
Publish booking.confirmed Event
    │
    ▼
Notification Service
    │
    ├─ Send email to guest
    └─ Send email to host
```

### Cancellation Flow

```
User Requests Cancellation
    │
    ▼
Validate Authorization
    ├─ Is guest or host?
    ├─ Is reservation cancellable?
    │
    ▼
Calculate Refund
    │
    ├─ Get cancellation policy
    ├─ Calculate days until check-in
    ├─ Apply refund percentage
    │
    ▼
Update Reservation
    ├─ Status → cancelled
    ├─ Record cancellation details
    ├─ Set refund amount
    │
    ▼
Publish booking.cancelled Event
    │
    ├─ Payment Service (initiate refund)
    ├─ Notification Service (send notice)
    └─ Analytics Service (track cancellation)
```

## Integration Points

```
┌──────────────────────────────────────────────────────────┐
│                   Booking Service                        │
│                    (Port 4004)                           │
└──────────────────────────────────────────────────────────┘
         │              │              │              │
    REST API       Event Bus       Database        External
         │          (RabbitMQ)     (MongoDB)       Services
         │              │              │              │
         ▼              ▼              ▼              ▼
    ┌────────┐     ┌──────────┐  ┌────────────┐  ┌──────────┐
    │Frontend│     │Payment   │  │Reservation │  │Listing   │
    │        │     │Service   │  │Collection  │  │Service   │
    │        │     │          │  │            │  │          │
    │        │     │Publishes │  │- Indexes   │  │Gets      │
    │        │     │payment.  │  │- Ttl field │  │listing   │
    │        │     │succeeded │  │- Status    │  │details   │
    │        │     │payment.  │  │  tracking  │  │          │
    │        │     │failed    │  │            │  │          │
    └────────┘     └──────────┘  └────────────┘  └──────────┘
         │              │
         └──────┬───────┘
                │
         ┌──────▼──────────────────┐
         │  Notification Service   │
         │  (Email + SMS)          │
         └────────────────────────┘
```

## Event Workflow

### Publishing Events

```
Booking Controller Action
         │
         ▼
Event Bus publish(eventType, data)
         │
         ├─ Create message object
         │  {
         │    eventType: "booking.created",
         │    data: { ... },
         │    timestamp: ISO8601,
         │    source: "booking-service"
         │  }
         │
         ├─ Connect to RabbitMQ
         │
         ├─ Publish to exchange
         │  exchange: "hometrip"
         │  routingKey: "booking.created"
         │  persistent: true
         │
         └─ Acknowledge or retry
```

### Subscribing to Events

```
Application Startup
         │
         ▼
Event Bus subscribe(eventType, handler)
         │
         ├─ Declare queue
         │  name: "booking-service-payment.succeeded"
         │  durable: true
         │
         ├─ Bind to exchange
         │  exchange: "hometrip"
         │  routingKey: "payment.succeeded"
         │
         ├─ Consume messages
         │
         └─ Message received
              │
              ├─ Parse JSON
              │
              ├─ Call handler function
              │  handlePaymentSucceeded(data)
              │
              └─ ACK or NACK message
```

## Database Schema

```
Reservation
├── _id: ObjectId (Primary Key)
├── listing: ObjectId (ref: Listing)
├── user: ObjectId (ref: User) [Guest]
├── host: ObjectId (ref: User)
├── startDate: Date
├── endDate: Date
├── numberOfNights: Number
├── numberOfGuests
│   ├── adults: Number
│   ├── children: Number
│   └── infants: Number
├── pricing
│   ├── nightlyRate: Number
│   ├── numberOfNights: Number
│   ├── subtotal: Number
│   ├── cleaningFee: Number
│   ├── serviceFee: Number
│   ├── taxes: Number
│   └── total: Number
├── status: String (enum)
├── cancellation
│   ├── cancelledBy: ObjectId
│   ├── cancelledAt: Date
│   ├── reason: String
│   └── refundAmount: Number
├── paymentIntentId: String
├── stripeChargeId: String
├── paymentStatus: String (enum)
├── giftCardCode: String
├── giftCardAmount: Number
├── specialRequests: String
├── cancellationPolicy: String (enum)
├── hasUserReviewed: Boolean
├── hasHostReviewed: Boolean
├── confirmedAt: Date
├── completedAt: Date
├── createdAt: Date (Auto)
└── updatedAt: Date (Auto)

Indexes:
├── user + createdAt DESC
├── listing + startDate + endDate
├── host + status + createdAt DESC
├── listing + startDate + endDate + status
├── paymentIntentId
└── status + createdAt DESC
```

## Request/Response Pattern

```
┌─────────────────────────────────────┐
│      Client Request                 │
│                                     │
│  POST /api/bookings                 │
│  Headers: Authorization: Bearer ... │
│  Body: { ... }                      │
└─────────────────────┬───────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │  Express Middleware    │
         │  ├─ Parse JSON         │
         │  ├─ Validate Token     │
         │  ├─ Check Rate Limit   │
         │  └─ Validate Input     │
         └────────────┬───────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │  Controller Method     │
         │  ├─ Query Database     │
         │  ├─ Call External APIs │
         │  ├─ Business Logic     │
         │  └─ Publish Events     │
         └────────────┬───────────┘
                      │
         ┌────────────▼───────────┐
         │  Response              │
         │  {                     │
         │    success: boolean,   │
         │    message: string,    │
         │    data: {...}         │
         │  }                     │
         └────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────┐
│    Docker Image: booking-service    │
│                                     │
│    FROM node:18-alpine              │
│    ├─ Install dependencies          │
│    ├─ Copy application code         │
│    ├─ Create logs directory         │
│    └─ Create non-root user          │
└──────────────────┬──────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │   Docker Container   │
        │                      │
        │   EXPOSE 4004        │
        │                      │
        │   Health Check:      │
        │   GET /health        │
        │                      │
        │   Restart Policy:    │
        │   unless-stopped     │
        └──────────┬───────────┘
                   │
                   ├─ Mounts
                   │  ├─ /data/logs (volumes)
                   │  └─ .env (config)
                   │
                   └─ Networks
                      └─ hometrip-network
```

## Performance Characteristics

```
Operation          | Complexity | Database | External | Time
───────────────────┼───────────┼─────────┼──────────┼────────
Create Booking     | O(log n)   | 3 ops   | 1 API    | 200-500ms
Check Availability | O(log n)   | 1 query | 0        | 50-100ms
Calculate Price    | O(days)    | 0       | 1 API    | 100-200ms
Get Reservation    | O(1)       | 1 query | 0        | 20-50ms
List Reservations  | O(log n)   | 1 query | 0        | 50-100ms
Cancel Booking     | O(log n)   | 2 ops   | 1 event  | 150-300ms
Confirm Payment    | O(log n)   | 1 update| 1 event  | 100-200ms
```

## Error Handling Flow

```
Request
  │
  ├─ Validation Error
  │  └─ 400 Bad Request
  │
  ├─ Authentication Error
  │  └─ 401 Unauthorized
  │
  ├─ Authorization Error
  │  └─ 403 Forbidden
  │
  ├─ Resource Not Found
  │  └─ 404 Not Found
  │
  ├─ Business Logic Error
  │  └─ 400/409 Conflict
  │
  └─ Server Error
     └─ 500 Internal Server Error

All responses include:
{
  success: boolean,
  message: string,
  errors?: [...],
  data?: {...}
}
```

## Security Architecture

```
Request → CORS Check
       → Rate Limit Check
       → Helmet Security Headers
       → JWT Token Verification
       → Input Validation
       → Business Logic Validation
       → Database Query
       → Response Compression
       → Response
```

## Logging Architecture

```
Log Event
   │
   ├─ Console (Development)
   │  └─ Winston Console Transport
   │
   ├─ File System (All Environments)
   │  ├─ logs/error.log (errors only)
   │  └─ logs/combined.log (all levels)
   │
   └─ Format
      ├─ Timestamp: YYYY-MM-DD HH:mm:ss
      ├─ Level: info, warn, error, debug
      ├─ Message: descriptive text
      └─ Meta: service name, stack traces

File Rotation: 5MB max, 5 files retained
```
