# Logger Service - Quick Start Guide

## Installation & Setup

### 1. Install Dependencies
```bash
cd /home/arwa/hometrip-microservices/services/logger-service
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start the Service

**Development** (with auto-reload):
```bash
npm run dev
```

**Production**:
```bash
npm start
```

### 4. Verify it's Running
```bash
curl http://localhost:5000/health
```

## API Quick Reference

### Authentication
All endpoints (except /health, /ready, /metrics) require:
```bash
-H "X-API-Key: your-api-key"
```

### Ingest a Single Log
```bash
curl -X POST http://localhost:5000/logs \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "service": "booking-service",
    "level": "error",
    "message": "Error message here",
    "requestId": "req-123"
  }'
```

### Ingest Multiple Logs
```bash
curl -X POST http://localhost:5000/logs/batch \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "logs": [
      {"service": "booking", "level": "error", "message": "Error 1"},
      {"service": "payment", "level": "warn", "message": "Warning 1"}
    ]
  }'
```

### Query Logs
```bash
# Get error logs from booking-service
curl "http://localhost:5000/logs?service=booking-service&level=error&page=1&limit=50" \
  -H "X-API-Key: your-api-key"
```

### Search Logs
```bash
# Full-text search
curl "http://localhost:5000/logs/search?query=database%20connection" \
  -H "X-API-Key: your-api-key"
```

### Get Statistics
```bash
curl "http://localhost:5000/logs/stats?service=booking-service" \
  -H "X-API-Key: your-api-key"
```

### Get Request Logs
```bash
curl "http://localhost:5000/logs/request/req-12345" \
  -H "X-API-Key: your-api-key"
```

### Get Error Logs
```bash
curl "http://localhost:5000/logs/errors?service=payment-service" \
  -H "X-API-Key: your-api-key"
```

### Export Logs
```bash
# Export as JSON
curl "http://localhost:5000/logs/export?format=json" \
  -H "X-API-Key: your-api-key" \
  -o logs.json

# Export as CSV
curl "http://localhost:5000/logs/export?format=csv" \
  -H "X-API-Key: your-api-key" \
  -o logs.csv
```

### Cleanup Old Logs
```bash
# Delete logs older than 90 days
curl -X DELETE "http://localhost:5000/logs/cleanup?days=90" \
  -H "X-API-Key: your-api-key"
```

## Integration with Other Services

### Option 1: REST API

```javascript
const axios = require('axios');

class LoggerClient {
  constructor(serviceUrl, apiKey, serviceName) {
    this.serviceUrl = serviceUrl;
    this.apiKey = apiKey;
    this.serviceName = serviceName;
  }

  async log(level, message, data = {}) {
    await axios.post(`${this.serviceUrl}/logs`, {
      service: this.serviceName,
      level,
      message,
      timestamp: new Date(),
      ...data
    }, {
      headers: { 'X-API-Key': this.apiKey }
    });
  }

  async error(message, data) { return this.log('error', message, data); }
  async warn(message, data) { return this.log('warn', message, data); }
  async info(message, data) { return this.log('info', message, data); }
}

// Usage
const logger = new LoggerClient('http://localhost:5000', 'your-api-key', 'booking-service');
await logger.error('Payment failed', { orderId: '123' });
```

### Option 2: RabbitMQ Events

```javascript
const amqp = require('amqplib');

const connection = await amqp.connect('amqp://guest:guest@localhost:5672');
const channel = await connection.createChannel();

await channel.assertExchange('hometrip-logs', 'topic', { durable: true });

// Publish a log event
channel.publish(
  'hometrip-logs',
  'log.error',  // Routing key: log.error, log.warn, log.info, log.debug, log.verbose
  Buffer.from(JSON.stringify({
    service: 'booking-service',
    level: 'error',
    message: 'Payment processing failed',
    timestamp: new Date(),
    requestId: 'req-123',
    errorCode: 'PAYMENT_ERROR'
  })),
  { persistent: true }
);
```

## Docker Deployment

### Build Image
```bash
docker build -t logger-service:1.0.0 .
```

### Run Container
```bash
docker run -d \
  --name logger-service \
  -p 5000:5000 \
  -e MONGODB_URI=mongodb://mongo:27017/logs_db \
  -e ELASTICSEARCH_URL=http://elasticsearch:9200 \
  -e RABBITMQ_URL=amqp://rabbitmq:5672 \
  -e VALID_API_KEYS=your-api-key \
  logger-service:1.0.0
```

### Docker Compose
```yaml
version: '3.8'
services:
  logger-service:
    build: .
    ports:
      - "5000:5000"
    environment:
      MONGODB_URI: mongodb://mongo:27017/logs_db
      ELASTICSEARCH_URL: http://elasticsearch:9200
      RABBITMQ_URL: amqp://rabbitmq:5672
      VALID_API_KEYS: your-api-key
    depends_on:
      - mongo
      - elasticsearch
      - rabbitmq

  mongo:
    image: mongo:6
    ports:
      - "27017:27017"

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.10.0
    environment:
      discovery.type: single-node
      xpack.security.enabled: 'false'
    ports:
      - "9200:9200"

  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"
```

## Monitoring

### Health Status
```bash
curl http://localhost:5000/health
```

### Service Readiness
```bash
curl http://localhost:5000/ready
```

### Metrics
```bash
curl http://localhost:5000/metrics
```

### Service Info
```bash
curl http://localhost:5000/info
```

## Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/logs_db

# Search
ELASTICSEARCH_URL=http://localhost:9200

# Events
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# Security
VALID_API_KEYS=your-api-key-1,your-api-key-2

# Retention (in days)
ERROR_RETENTION_DAYS=90
WARN_RETENTION_DAYS=60
INFO_RETENTION_DAYS=30
DEBUG_RETENTION_DAYS=7
VERBOSE_RETENTION_DAYS=3
```

## Log Levels

| Level | Retention | Usage |
|-------|-----------|-------|
| error | 90 days | Critical errors, exceptions |
| warn | 60 days | Warnings, potential issues |
| info | 30 days | General information |
| debug | 7 days | Debug information |
| verbose | 3 days | Detailed tracing |

## Request Body Fields

Required:
- `service`: Service name (e.g., 'booking-service')
- `level`: Log level (error, warn, info, debug, verbose)
- `message`: Log message

Optional:
- `timestamp`: ISO 8601 timestamp
- `requestId`: Correlation ID
- `userId`: User ID
- `method`: HTTP method
- `url`: Request URL
- `statusCode`: HTTP status code
- `responseTime`: Response time in ms
- `errorCode`: Application error code
- `errorType`: Error type
- `stack`: Stack trace
- `tags`: Array of tags
- `metadata`: Custom object with additional data
- `hostname`: Service hostname
- `environment`: development|staging|production
- `userAgent`: User agent string
- `ip`: Client IP address

## Query Parameters

### Common Filters
- `service`: Filter by service
- `level`: Filter by level
- `startDate`: Start date (ISO 8601)
- `endDate`: End date (ISO 8601)
- `userId`: Filter by user ID
- `requestId`: Filter by request ID
- `tags`: Comma-separated tags

### Pagination
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 100, max: 1000)

### Sorting
- `sort`: Field to sort by (default: timestamp)
- `order`: asc or desc (default: desc)

### Export
- `format`: json or csv (default: json)

## Troubleshooting

### Service won't start
1. Check MongoDB is running: `mongo --version`
2. Check Elasticsearch is running: `curl http://localhost:9200`
3. Check RabbitMQ is running: `curl http://localhost:15672`

### Health check fails
```bash
# Check all dependencies
curl http://localhost:5000/health

# Check if ready
curl http://localhost:5000/ready
```

### API returns 401/403
- Verify X-API-Key header is set
- Check VALID_API_KEYS in .env matches the key you're using

### Logs not appearing
1. Check service name matches in queries
2. Verify log ingestion endpoint: `POST /logs`
3. Check RabbitMQ connection if using events
4. Review application logs: `tail -f logs/combined.log`

## Default Credentials

Edit .env to customize:

```env
# API Key (default)
VALID_API_KEYS=logger-service-key

# MongoDB (default)
MONGODB_URI=mongodb://localhost:27017/logs_db

# Elasticsearch (default)
ELASTICSEARCH_URL=http://localhost:9200

# RabbitMQ (default)
RABBITMQ_URL=amqp://guest:guest@localhost:5672
```

## File Structure

```
logger-service/
├── src/
│   ├── config/          # Configuration
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Express middleware
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utilities
│   └── index.js         # Main app
├── logs/                # Application logs
├── Dockerfile           # Docker image
├── package.json         # Dependencies
├── .env.example         # Config template
└── README.md            # Full documentation
```

## More Information

For complete documentation, see:
- `README.md` - Full API reference and guide
- `IMPLEMENTATION_SUMMARY.md` - Technical overview
