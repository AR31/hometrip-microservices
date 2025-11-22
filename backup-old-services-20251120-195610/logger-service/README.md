# Logger Service - HomeTrip Microservices

Centralized logging service for HomeTrip microservices. Collects, stores, indexes, and provides querying capabilities for logs from all services.

## Features

- **Centralized Log Collection**: Aggregates logs from 13 microservices
- **Multiple Storage Backends**:
  - MongoDB for persistent storage with automatic TTL-based cleanup
  - Elasticsearch for fast full-text search and analytics
- **Event-Driven Architecture**: Listens to RabbitMQ events for real-time log ingestion
- **REST API**: Complete API for log queries, filtering, and export
- **Log Levels**: Supports error, warn, info, debug, verbose with different retention policies
- **Advanced Filtering**: Filter by service, level, time range, user, request ID, tags
- **Full-Text Search**: Elasticsearch-powered search across all log fields
- **Export Capabilities**: Export logs as CSV or JSON
- **Statistics & Analytics**: Generate statistics grouped by level and service
- **Request Tracing**: Track logs by request ID across microservices
- **Auto-Cleanup**: Automatic deletion of old logs based on retention policies
- **Health Monitoring**: Built-in health check and metrics endpoints

## Architecture

```
┌─────────────────┐
│  Microservices  │
│  (13 services)  │
└────────┬────────┘
         │
         │ POST /logs (REST API)
         │ OR
         │ RabbitMQ log.* events
         │
    ┌────▼─────────────────┐
    │  Logger Service      │
    │  (Port 5000)         │
    ├─────────────────────┤
    │ • Express API       │
    │ • Log Controller    │
    │ • Event Bus         │
    └────┬─────────┬──────┘
         │         │
    ┌────▼──┐  ┌──▼──────────┐
    │MongoDB│  │Elasticsearch│
    │logs_db│  │Full-text    │
    │ (TTL) │  │search index │
    └───────┘  └─────────────┘
```

## Tech Stack

- **Framework**: Express.js
- **Databases**: MongoDB (storage), Elasticsearch (search)
- **Message Queue**: RabbitMQ
- **Logging**: Winston
- **HTTP Client**: Axios
- **Date Utilities**: date-fns
- **Security**: Helmet, CORS
- **Rate Limiting**: express-rate-limit
- **Compression**: gzip compression

## Installation

### Prerequisites

- Node.js 18+
- MongoDB 4.4+
- Elasticsearch 8.x
- RabbitMQ 3.x

### Setup

1. Clone the repository and navigate to the service directory:
```bash
cd /home/arwa/hometrip-microservices/services/logger-service
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from template:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/logs_db
ELASTICSEARCH_URL=http://localhost:9200
RABBITMQ_URL=amqp://guest:guest@localhost:5672
VALID_API_KEYS=your-api-key-1,your-api-key-2
```

5. Start the service:

**Development**:
```bash
npm run dev
```

**Production**:
```bash
npm start
```

## Docker Deployment

Build the Docker image:
```bash
docker build -t logger-service:1.0.0 .
```

Run the container:
```bash
docker run -d \
  -p 5000:5000 \
  -e MONGODB_URI=mongodb://mongo:27017/logs_db \
  -e ELASTICSEARCH_URL=http://elasticsearch:9200 \
  -e RABBITMQ_URL=amqp://rabbitmq:5672 \
  -e VALID_API_KEYS=your-api-key \
  --name logger-service \
  logger-service:1.0.0
```

## API Endpoints

All endpoints (except health checks) require authentication via `X-API-Key` header.

### Health & Status

#### GET /health
Check service health status
```bash
curl http://localhost:5000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600,
  "mongodb": true,
  "elasticsearch": true,
  "rabbitmq": true
}
```

#### GET /ready
Check service readiness (dependencies ready)
```bash
curl http://localhost:5000/ready
```

#### GET /metrics
Get detailed metrics
```bash
curl http://localhost:5000/metrics
```

### Log Ingestion

#### POST /logs
Ingest a single log entry

```bash
curl -X POST http://localhost:5000/logs \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "service": "booking-service",
    "level": "error",
    "message": "Failed to process booking",
    "requestId": "req-12345",
    "userId": "user-789",
    "method": "POST",
    "url": "/bookings",
    "statusCode": 500,
    "errorCode": "DB_ERROR",
    "stack": "Error: Connection failed\n  at ...",
    "metadata": {"bookingId": "book-456"}
  }'
```

Request body fields:
- `service` (required): Name of the service
- `level` (required): Log level (error, warn, info, debug, verbose)
- `message` (required): Log message
- `timestamp`: ISO 8601 timestamp (optional, defaults to now)
- `requestId`: Request correlation ID
- `userId`: User ID
- `method`: HTTP method
- `url`: Request URL
- `statusCode`: HTTP status code
- `responseTime`: Response time in ms
- `errorCode`: Application error code
- `errorType`: Type of error
- `stack`: Stack trace
- `tags`: Array of tags for filtering
- `metadata`: Additional metadata object
- `hostname`: Hostname of the service
- `environment`: Environment (development, staging, production)
- `userAgent`: User agent string
- `ip`: Client IP address

#### POST /logs/batch
Ingest multiple logs in batch

```bash
curl -X POST http://localhost:5000/logs/batch \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "logs": [
      {
        "service": "auth-service",
        "level": "info",
        "message": "User login successful",
        "userId": "user-123"
      },
      {
        "service": "payment-service",
        "level": "warn",
        "message": "High payment latency detected",
        "responseTime": 5000
      }
    ]
  }'
```

### Log Querying

#### GET /logs
Query logs with filters and pagination

```bash
# Get all error logs from booking-service
curl "http://localhost:5000/logs?service=booking-service&level=error" \
  -H "X-API-Key: your-api-key"

# Search and filter with pagination
curl "http://localhost:5000/logs?service=auth-service&level=error&page=1&limit=50&sort=timestamp&order=desc" \
  -H "X-API-Key: your-api-key"

# Filter by date range and user
curl "http://localhost:5000/logs?startDate=2024-01-15T00:00:00Z&endDate=2024-01-16T00:00:00Z&userId=user-123" \
  -H "X-API-Key: your-api-key"
```

Query parameters:
- `service`: Filter by service name
- `level`: Filter by log level
- `startDate`: Start date (ISO 8601)
- `endDate`: End date (ISO 8601)
- `userId`: Filter by user ID
- `requestId`: Filter by request ID
- `tags`: Comma-separated tags
- `search`: Full-text search in message
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 100, max: 1000)
- `sort`: Field to sort by (default: timestamp)
- `order`: Sort order - 'asc' or 'desc' (default: desc)

Response:
```json
{
  "success": true,
  "logs": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "timestamp": "2024-01-15T10:30:00Z",
      "level": "error",
      "service": "booking-service",
      "message": "Failed to process booking",
      "requestId": "req-12345",
      "statusCode": 500
    }
  ],
  "total": 150,
  "page": 1,
  "pages": 2
}
```

#### GET /logs/request/:requestId
Get all logs for a specific request

```bash
curl "http://localhost:5000/logs/request/req-12345" \
  -H "X-API-Key: your-api-key"
```

Response:
```json
{
  "success": true,
  "requestId": "req-12345",
  "count": 5,
  "logs": [...]
}
```

#### GET /logs/errors
Get error logs with details

```bash
curl "http://localhost:5000/logs/errors?service=payment-service&page=1&limit=50" \
  -H "X-API-Key: your-api-key"
```

#### GET /logs/stats
Get log statistics

```bash
curl "http://localhost:5000/logs/stats?service=booking-service&startDate=2024-01-15T00:00:00Z&endDate=2024-01-16T00:00:00Z" \
  -H "X-API-Key: your-api-key"
```

Response:
```json
{
  "success": true,
  "stats": {
    "byLevel": {
      "error": {
        "count": 45,
        "avgResponseTime": 2500
      },
      "warn": {
        "count": 120,
        "avgResponseTime": 1200
      },
      "info": {
        "count": 5000,
        "avgResponseTime": 800
      }
    },
    "byService": [
      {
        "_id": "booking-service",
        "total": 1200,
        "errors": 45,
        "warnings": 120
      }
    ]
  }
}
```

#### GET /logs/search
Full-text search logs with Elasticsearch

```bash
curl "http://localhost:5000/logs/search?query=database%20connection&service=auth-service&level=error" \
  -H "X-API-Key: your-api-key"
```

Query parameters:
- `query` (required): Search query
- `service`: Filter by service
- `level`: Filter by level
- `startDate`: Start date
- `endDate`: End date
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 100, max: 1000)

### Log Management

#### GET /logs/export
Export logs to CSV or JSON

```bash
# Export as JSON
curl "http://localhost:5000/logs/export?service=booking-service&format=json" \
  -H "X-API-Key: your-api-key" \
  -o logs-export.json

# Export as CSV
curl "http://localhost:5000/logs/export?service=booking-service&format=csv" \
  -H "X-API-Key: your-api-key" \
  -o logs-export.csv
```

#### DELETE /logs/cleanup
Delete logs older than specified days

```bash
# Delete logs older than 90 days
curl -X DELETE "http://localhost:5000/logs/cleanup?days=90" \
  -H "X-API-Key: your-api-key"

# Delete logs older than 30 days
curl -X DELETE "http://localhost:5000/logs/cleanup?days=30" \
  -H "X-API-Key: your-api-key"
```

Response:
```json
{
  "success": true,
  "message": "Logs cleaned up successfully",
  "deletedCount": 15432
}
```

## Integration Guide for Other Services

### 1. Using the REST API

Add Logger Service SDK to your service:

```javascript
const LoggerClient = require('hometrip-logger-client');

const logger = new LoggerClient({
  serviceUrl: 'http://localhost:5000',
  apiKey: 'your-api-key',
  serviceName: 'booking-service'
});

// Log an error
await logger.error('Payment processing failed', {
  requestId: req.id,
  userId: req.user.id,
  errorCode: 'PAYMENT_ERROR',
  metadata: { amount: 100, currency: 'USD' }
});

// Log info
await logger.info('Booking created successfully', {
  requestId: req.id,
  metadata: { bookingId: booking.id }
});
```

### 2. Using RabbitMQ Events

Publish logs directly to RabbitMQ:

```javascript
const amqp = require('amqplib');

async function publishLog(logData) {
  const connection = await amqp.connect('amqp://guest:guest@localhost:5672');
  const channel = await connection.createChannel();

  await channel.assertExchange('hometrip-logs', 'topic', { durable: true });

  const routingKey = `log.${logData.level}`; // log.error, log.info, etc.

  channel.publish(
    'hometrip-logs',
    routingKey,
    Buffer.from(JSON.stringify(logData)),
    { persistent: true }
  );

  await channel.close();
  await connection.close();
}

// Example
await publishLog({
  service: 'booking-service',
  level: 'error',
  message: 'Database connection failed',
  timestamp: new Date(),
  requestId: 'req-123',
  errorCode: 'DB_CONNECTION_ERROR'
});
```

### 3. RabbitMQ Routing Keys

Subscribe to specific log events:

- `log.*` - All log events
- `log.error` - Error logs only
- `log.warn` - Warning logs only
- `log.info` - Info logs only
- `log.debug` - Debug logs only
- `log.verbose` - Verbose logs only

```javascript
channel.bindQueue(queueName, 'hometrip-logs', 'log.error');
```

## Log Retention Policy

Different log levels have different retention periods:

| Level | Retention | Purpose |
|-------|-----------|---------|
| error | 90 days | Critical issues, keep for analysis |
| warn | 60 days | Warnings and issues |
| info | 30 days | General information |
| debug | 7 days | Development and debugging |
| verbose | 3 days | Very detailed tracing |

Retention is managed through:
1. **MongoDB TTL**: Automatic document deletion via TTL index
2. **Manual Cleanup**: DELETE /logs/cleanup endpoint
3. **Scheduled Tasks**: Cron job to run cleanup periodically

Configure retention in `.env`:
```env
ERROR_RETENTION_DAYS=90
WARN_RETENTION_DAYS=60
INFO_RETENTION_DAYS=30
DEBUG_RETENTION_DAYS=7
VERBOSE_RETENTION_DAYS=3
```

## Elasticsearch Index Mapping

The service automatically creates and manages the Elasticsearch index with the following mapping:

```json
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "refresh_interval": "1s"
  },
  "mappings": {
    "properties": {
      "timestamp": { "type": "date" },
      "level": { "type": "keyword" },
      "service": { "type": "keyword" },
      "message": { "type": "text", "analyzer": "standard" },
      "requestId": { "type": "keyword" },
      "userId": { "type": "keyword" },
      "statusCode": { "type": "integer" },
      "responseTime": { "type": "integer" },
      "tags": { "type": "keyword" },
      "metadata": { "type": "object" },
      "expiresAt": { "type": "date" }
    }
  }
}
```

## Performance & Scalability

### Optimization Tips

1. **Batch Ingestion**: Use `/logs/batch` for multiple logs
2. **Filtering**: Always use specific filters to reduce query scope
3. **Pagination**: Use limit parameter to get only needed results
4. **Cleanup**: Run cleanup during off-peak hours
5. **Search**: Use Elasticsearch for complex full-text searches

### MongoDB Indexes

The service creates the following indexes for optimal query performance:

- `timestamp: -1, level: 1`
- `service: 1, timestamp: -1`
- `level: 1, timestamp: -1`
- `requestId: 1`
- `userId: 1, timestamp: -1`
- `expiresAt: 1` (TTL index)

### Elasticsearch Optimization

- 3 shards for distributed search
- 1 replica for availability
- 1-second refresh interval for near-real-time search

## Monitoring & Debugging

### Health Check

```bash
curl http://localhost:5000/health
```

### Metrics

```bash
curl http://localhost:5000/metrics
```

### Logs

Application logs are written to `logs/` directory:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only

### Common Issues

1. **MongoDB connection fails**: Check MONGODB_URI and ensure MongoDB is running
2. **Elasticsearch not working**: Verify ELASTICSEARCH_URL and cluster health
3. **RabbitMQ events not received**: Check RABBITMQ_URL and exchange/queue setup
4. **API key errors**: Verify X-API-Key header and VALID_API_KEYS environment variable

## Configuration Reference

| Variable | Default | Purpose |
|----------|---------|---------|
| PORT | 5000 | Server port |
| NODE_ENV | development | Environment |
| MONGODB_URI | mongodb://localhost:27017/logs_db | MongoDB connection |
| ELASTICSEARCH_URL | http://localhost:9200 | Elasticsearch URL |
| RABBITMQ_URL | amqp://guest:guest@localhost:5672 | RabbitMQ URL |
| ELASTICSEARCH_INDEX | hometrip-logs | ES index name |
| RABBITMQ_EXCHANGE | hometrip-logs | RabbitMQ exchange |
| API_KEY_HEADER | x-api-key | Auth header name |
| LOG_LEVEL | info | Winston log level |
| RATE_LIMIT_WINDOW_MS | 900000 | Rate limit window (15 min) |
| RATE_LIMIT_MAX_REQUESTS | 1000 | Max requests per window |

## Development

Run in development mode with auto-reload:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Run tests with coverage:

```bash
npm test -- --coverage
```

## License

MIT

## Support

For issues, questions, or contributions, please contact the HomeTrip Team.
