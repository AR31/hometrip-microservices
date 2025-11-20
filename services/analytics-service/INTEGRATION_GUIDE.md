# Analytics Service Integration Guide

## Overview

The Analytics Service collects and aggregates data from across the HomeTrip platform via event-driven architecture. This guide shows how to integrate with the Analytics Service.

## Event Publishing

Other microservices should publish events to RabbitMQ using the EventBus. Here's how to publish events from other services:

### Example: Booking Service

```javascript
const eventBus = require('./utils/eventBus');

// When a booking is created
async function createBooking(bookingData) {
  // ... booking creation logic ...

  // Publish event
  await eventBus.publish('booking.created', {
    bookingId: booking._id,
    hostId: booking.listing.host,
    guestId: booking.guest,
    listingId: booking.listing._id,
    nights: booking.numberOfNights,
    checkIn: booking.startDate,
    checkOut: booking.endDate,
    price: booking.pricing.total
  });
}

// When booking is confirmed
async function confirmBooking(bookingId) {
  const booking = await Booking.findById(bookingId);

  await eventBus.publish('booking.confirmed', {
    bookingId: booking._id,
    hostId: booking.listing.host,
    guestId: booking.guest,
    nights: booking.numberOfNights,
    price: booking.pricing.total,
    timestamp: new Date()
  });
}

// When booking is cancelled
async function cancelBooking(bookingId) {
  const booking = await Booking.findById(bookingId);

  await eventBus.publish('booking.cancelled', {
    bookingId: booking._id,
    hostId: booking.listing.host,
    guestId: booking.guest,
    cancelledAt: new Date()
  });
}
```

### Example: Payment Service

```javascript
const eventBus = require('./utils/eventBus');

async function processPayment(paymentData) {
  // ... payment processing logic ...

  if (paymentResult.status === 'success') {
    await eventBus.publish('payment.succeeded', {
      paymentId: payment._id,
      bookingId: payment.bookingId,
      hostId: payment.hostId,
      amount: payment.amount,
      currency: payment.currency,
      timestamp: new Date()
    });
  }
}
```

### Example: Listing Service

```javascript
const eventBus = require('./utils/eventBus');

async function createListing(listingData) {
  const listing = await Listing.create(listingData);

  await eventBus.publish('listing.created', {
    listingId: listing._id,
    hostId: listing.host,
    title: listing.title,
    category: listing.category,
    price: listing.pricePerNight,
    timestamp: new Date()
  });
}

async function viewListing(listingId, viewerId) {
  // ... view tracking logic ...

  await eventBus.publish('listing.viewed', {
    listingId,
    hostId: listing.host,
    viewerId,
    timestamp: new Date()
  });
}
```

### Example: User Service

```javascript
const eventBus = require('./utils/eventBus');

async function createUser(userData) {
  const user = await User.create(userData);

  await eventBus.publish('user.created', {
    userId: user._id,
    email: user.email,
    role: user.role, // 'host' or 'guest'
    timestamp: new Date()
  });
}
```

### Example: Review Service

```javascript
const eventBus = require('./utils/eventBus');

async function createReview(reviewData) {
  const review = await Review.create(reviewData);

  await eventBus.publish('review.created', {
    reviewId: review._id,
    bookingId: review.booking,
    hostId: review.listing.host,
    guestId: review.guest,
    rating: review.rating,
    comment: review.comment,
    timestamp: new Date()
  });
}
```

## Supported Events

### Booking Events

#### booking.created
Triggered when a new booking is made.

```json
{
  "bookingId": "string",
  "hostId": "string",
  "guestId": "string",
  "listingId": "string",
  "nights": "number",
  "checkIn": "ISO8601 date",
  "checkOut": "ISO8601 date",
  "price": "number"
}
```

**Updates Analytics**:
- Host: `metrics.totalBookings`, `metrics.bookedNights`

#### booking.confirmed
Triggered when booking is confirmed.

```json
{
  "bookingId": "string",
  "hostId": "string",
  "guestId": "string",
  "nights": "number",
  "price": "number"
}
```

**Updates Analytics**:
- Host: `metrics.confirmedBookings`, `metrics.totalRevenue`
- Admin: `metrics.confirmedBookings`, `metrics.totalRevenue`, `metrics.totalBookings`

#### booking.cancelled
Triggered when booking is cancelled.

```json
{
  "bookingId": "string",
  "hostId": "string",
  "guestId": "string",
  "cancelledAt": "ISO8601 date"
}
```

**Updates Analytics**:
- Host: `metrics.cancelledBookings`
- Admin: `metrics.cancelledBookings`

### Payment Events

#### payment.succeeded
Triggered when payment is successfully processed.

```json
{
  "paymentId": "string",
  "bookingId": "string",
  "hostId": "string",
  "amount": "number",
  "currency": "string"
}
```

**Updates Analytics**:
- Host: `metrics.totalRevenue`, `metrics.completedBookings`
- Admin: `metrics.totalRevenue`, `metrics.completedBookings`

### Listing Events

#### listing.created
Triggered when a new listing is created.

```json
{
  "listingId": "string",
  "hostId": "string",
  "title": "string",
  "category": "string",
  "price": "number"
}
```

**Updates Analytics**:
- Host: `metrics.newListings`
- Admin: `metrics.newListings`

#### listing.viewed
Triggered when a listing is viewed.

```json
{
  "listingId": "string",
  "hostId": "string",
  "viewerId": "string"
}
```

**Updates Analytics**:
- Host: `metrics.listingViews`

### User Events

#### user.created
Triggered when a new user registers.

```json
{
  "userId": "string",
  "email": "string",
  "role": "host|guest"
}
```

**Updates Analytics**:
- Admin: `metrics.newUsers`, `metrics.hostCount` (if host), `metrics.guestCount` (if guest)

### Review Events

#### review.created
Triggered when a review is posted.

```json
{
  "reviewId": "string",
  "bookingId": "string",
  "hostId": "string",
  "guestId": "string",
  "rating": "number",
  "comment": "string"
}
```

**Updates Analytics**:
- Host: `metrics.newReviews`, `metrics.totalReviews`

## Fetching Analytics Data

### Host Dashboard Statistics

Get statistics for the authenticated host:

```bash
curl -X GET http://localhost:4008/analytics/host/stats?period=30d \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
{
  "success": true,
  "period": "30d",
  "summary": {
    "totalRevenue": 5000,
    "totalBookings": 25,
    "confirmedBookings": 24,
    "completedBookings": 20,
    "cancelledBookings": 1,
    "totalListings": 3,
    "activeListings": 3,
    "averageRating": 4.8,
    "totalReviews": 20,
    "occupancyRate": 75,
    "listingViews": 1200,
    "uniqueGuests": 18
  },
  "timeSeries": [
    {
      "date": "2024-01-01",
      "metrics": {
        "totalRevenue": 150,
        "totalBookings": 1
      }
    }
  ]
}
```

Query Parameters:
- `period`: '7d', '30d', '90d', '1y' (default: '7d')

### Admin KPI Dashboard

Get platform-wide statistics (admin only):

```bash
curl -X GET http://localhost:4008/analytics/admin/stats?period=30d \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

Response:
```json
{
  "success": true,
  "period": "30d",
  "summary": {
    "totalRevenue": 50000,
    "totalCommission": 5000,
    "totalPlatformFee": 2500,
    "totalBookings": 250,
    "confirmedBookings": 240,
    "completedBookings": 200,
    "cancelledBookings": 10,
    "totalUsers": 1000,
    "newUsers": 100,
    "hostCount": 150,
    "guestCount": 850,
    "totalListings": 500,
    "newListings": 25,
    "activeListings": 480,
    "totalReviews": 200,
    "averageRating": 4.7,
    "listingViews": 15000
  },
  "timeSeries": [...],
  "topHosts": [
    {
      "hostId": "host123",
      "hostName": "John Doe",
      "totalRevenue": 5000,
      "totalBookings": 25
    }
  ]
}
```

### Generate Report

Generate custom analytics reports:

```bash
curl -X POST http://localhost:4008/analytics/report \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "host",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "format": "json"
  }'
```

For CSV format:
```bash
curl -X POST http://localhost:4008/analytics/report \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "host",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "format": "csv"
  }' > report.csv
```

### Get Summary

Get quick analytics summary:

```bash
curl -X GET http://localhost:4008/analytics/summary?days=30 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   Platform Services                         │
│  (Booking, Payment, Listing, User, Review Services)         │
└───────────────────────┬─────────────────────────────────────┘
                        │ Publish Events
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                     RabbitMQ Exchange                        │
│                    hometrip_events (topic)                  │
└───────────────────────┬─────────────────────────────────────┘
                        │ Subscribe to Events
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  Analytics Service                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Event Handlers                              │   │
│  │  (booking.created, payment.succeeded, etc)          │   │
│  └────────────────────┬─────────────────────────────────┘   │
│                       │ Update Analytics
│                       ▼
│  ┌──────────────────────────────────────────────────────┐   │
│  │         MongoDB                                     │   │
│  │  (analytics collection with time-series data)      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         REST API                                    │   │
│  │  /analytics/host/stats                              │   │
│  │  /analytics/admin/stats                             │   │
│  │  /analytics/report                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                        │ Serve Analytics Data
                        ▼
┌─────────────────────────────────────────────────────────────┐
│               Dashboards & Frontend Apps                     │
└─────────────────────────────────────────────────────────────┘
```

## Best Practices

1. **Event Publishing**: Always publish events after successful operations
2. **Event Structure**: Keep event payloads lightweight and focused
3. **Error Handling**: Implement retry logic for failed event publishes
4. **Data Retention**: Configure retention period based on business needs
5. **Monitoring**: Monitor event processing and aggregation tasks
6. **Testing**: Test event handling thoroughly before deploying

## Troubleshooting

### Events not being processed

1. Check RabbitMQ connection: `GET /ready`
2. Verify event routing key matches subscription
3. Check logs: `docker logs analytics-service`
4. Verify MongoDB connection is active

### Missing analytics data

1. Verify events are being published
2. Check MongoDB has analytics collection
3. Review event handler error logs
4. Ensure aggregation tasks are running

### Performance issues

1. Monitor MongoDB query performance
2. Check index usage with MongoDB profiler
3. Consider archiving old data
4. Implement caching for frequently accessed data

## Support

For issues or questions, refer to the main Analytics Service README or contact the platform team.
