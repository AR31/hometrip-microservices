# Analytics Service

Complete analytics and reporting microservice for HomeTrip platform.

## Features

- **Host Dashboard Statistics**: Revenue, bookings, views, occupancy rates
- **Admin KPI Dashboard**: Platform-wide metrics and performance indicators
- **Report Generation**: Custom reports in JSON/CSV format
- **Time-Series Data Aggregation**: Daily, weekly, monthly aggregations
- **Event-Driven Architecture**: Subscribes to platform events for real-time analytics

## Events Subscribed

The service subscribes to and processes the following events:

- `booking.created` - Track new bookings
- `booking.confirmed` - Track confirmed bookings
- `booking.cancelled` - Track cancellations
- `payment.succeeded` - Track revenue
- `listing.created` - Track new listings
- `listing.viewed` - Track listing views
- `user.created` - Track user registrations
- `review.created` - Track reviews

## API Endpoints

### Host Endpoints

```
GET /analytics/host/stats?period=7d|30d|90d|1y
  Get host dashboard statistics

GET /analytics/summary?days=30
  Get analytics summary
```

### Admin Endpoints

```
GET /analytics/admin/stats?period=7d|30d|90d|1y
  Get admin KPI dashboard
```

### Report Generation

```
POST /analytics/report
  Request body:
  {
    "reportType": "host|admin",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "format": "json|csv"
  }
```

### Internal Endpoints

```
POST /analytics/track
  Track analytics event (internal endpoint)
  Request body:
  {
    "eventType": "string",
    "hostId": "string (optional)",
    "data": { ... }
  }
```

## Analytics Metrics

### Host Dashboard Metrics

- **Revenue**: Total revenue, monthly revenue, revenue trends
- **Bookings**: Total, confirmed, completed, cancelled bookings
- **Listings**: Total, active, inactive listings
- **Occupancy**: Occupancy rate, available nights, booked nights
- **Reviews**: Average rating, total reviews, unanswered reviews
- **Views**: Listing views, unique viewers
- **Guests**: Unique guests, repeating guests

### Admin Dashboard Metrics

- **Revenue**: Total revenue, commission, platform fees
- **Users**: Total users, new users, host count, guest count
- **Bookings**: Confirmed, completed, cancelled bookings
- **Listings**: Total, active, new listings
- **Performance**: Average rating, listing views, top hosts
- **Trends**: Time-series data for all metrics

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Production

```bash
npm start
```

## Docker

Build image:
```bash
docker build -t hometrip-analytics-service:latest .
```

Run container:
```bash
docker run -p 4008:4008 \
  -e MONGODB_URI=mongodb://... \
  -e RABBITMQ_URL=amqp://... \
  -e JWT_SECRET=your-secret \
  hometrip-analytics-service:latest
```

## Configuration

See `.env.example` for all configuration options.

### Key Environment Variables

- `PORT` - Service port (default: 4008)
- `MONGODB_URI` - MongoDB connection string
- `RABBITMQ_URL` - RabbitMQ connection URL
- `JWT_SECRET` - JWT signing secret
- `LOG_LEVEL` - Logging level (debug, info, warn, error)

## Database

MongoDB collections:
- `analytics` - Time-series analytics data

Indexes:
- `type, hostId, yearMonthDay`
- `date, type`
- `period, hostId, date`

## Health Checks

- `GET /health` - Basic health check
- `GET /ready` - Readiness check (checks dependencies)
- `GET /metrics` - Service metrics

## Architecture

```
Analytics Service
├── src/
│   ├── controllers/     # Request handlers
│   ├── models/         # MongoDB schemas
│   ├── routes/         # API routes
│   ├── middleware/     # Express middleware
│   ├── services/       # Business logic
│   ├── utils/          # Utilities (logger, eventBus, etc)
│   ├── config/         # Configuration
│   └── index.js        # Entry point
├── tests/              # Test files
├── logs/               # Application logs
├── Dockerfile          # Container definition
├── package.json        # Dependencies
└── README.md           # This file
```

## Event Flow

1. Other services publish events to RabbitMQ
2. Analytics Service subscribes to relevant events
3. Event handlers process events and update MongoDB
4. Analytics API provides aggregated data
5. Dashboards consume analytics via REST API

## Data Retention

By default, analytics data is retained for 2 years (730 days). Configure with `RETENTION_DAYS` environment variable.

## Performance

- Aggregation: Data is aggregated at the service level
- Caching: Can be integrated with Redis for caching frequently accessed data
- Indexes: Optimized MongoDB indexes for common queries

## Error Handling

- All errors are logged with Winston
- Graceful error handling for database and RabbitMQ failures
- Automatic reconnection attempts for failed connections
- 30-second graceful shutdown timeout

## Testing

```bash
npm test              # Run tests with coverage
npm run test:watch   # Run tests in watch mode
```

## Linting

```bash
npm run lint
```

## License

MIT

## Support

For issues or questions, please refer to the main HomeTrip documentation.
