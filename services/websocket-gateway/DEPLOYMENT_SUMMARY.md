# WebSocket Gateway - Deployment Summary

## Project Overview

A complete WebSocket Gateway service for HomeTrip microservices providing real-time communication using Socket.io with Redis adapter for horizontal scaling.

**Location:** `/home/arwa/hometrip-microservices/services/websocket-gateway`

**Port:** 3002

**Version:** 1.0.0

## Files Created

### Core Application Files

1. **package.json** (869 bytes)
   - Dependencies: socket.io, redis, jsonwebtoken, amqplib, cors, winston
   - Scripts: start, dev (nodemon), test
   - Node 18+ compatible

2. **src/index.js** (873 lines)
   - Socket.io server initialization
   - Redis adapter setup for horizontal scaling
   - Connection handling with JWT auth
   - Room management (join_room, leave_room)
   - Event handlers (typing, stop_typing)
   - RabbitMQ event subscription
   - Graceful shutdown handling
   - Health check and metrics endpoints

3. **src/config/index.js**
   - Environment-based configuration
   - Socket.io settings with CORS
   - Redis client settings
   - RabbitMQ configuration
   - Service URLs
   - Logging configuration
   - Security settings

4. **src/middleware/socketAuth.js**
   - JWT token verification on connection
   - User information extraction (id, email, role)
   - Token expiry monitoring
   - Support for unauthenticated connections (optional)

5. **src/utils/logger.js**
   - Winston-based structured logging
   - Console and file output
   - Log rotation (5MB max per file)
   - Multiple log levels: error, warn, info, debug
   - JSON format logging

6. **src/utils/eventBus.js**
   - RabbitMQ connection management
   - Event subscription and publishing
   - Reconnection with exponential backoff
   - Queue and exchange setup
   - Message acknowledgment handling

### Docker & Deployment

7. **Dockerfile**
   - Multi-stage build (builder + runtime)
   - Alpine-based Node 18
   - Health check endpoint
   - Dumb-init for proper signal handling
   - Exposed port 3002

8. **.dockerignore**
   - Excludes node_modules, logs, tests, etc.
   - Reduces image size

### Configuration & Documentation

9. **.env.example**
   - All required environment variables
   - Default values for development
   - Documented settings

10. **README.md**
    - Complete feature overview
    - Architecture diagram
    - API events documentation
    - Room naming conventions
    - Installation and setup
    - Docker usage
    - Configuration reference
    - Client examples (JavaScript)
    - Monitoring endpoints
    - Horizontal scaling guide
    - Troubleshooting guide

11. **INTEGRATION_GUIDE.md**
    - Frontend integration examples
    - Service integration patterns
    - Event publishing examples
    - RabbitMQ setup for each service
    - Event schema definitions
    - Docker Compose configuration
    - Scaling considerations
    - Security best practices
    - Monitoring and debugging
    - Testing procedures

## Features Implemented

### Real-time Communication

- Socket.io with WebSocket and polling transports
- Bi-directional communication
- Room-based message broadcasting
- CORS configuration for multiple domains

### Authentication & Security

- JWT token verification on connection
- Token expiry monitoring (5-minute warning)
- User information extraction
- Optional unauthenticated connections
- Support for Bearer token in headers or auth object

### Room Management

Automatic room structure:
- **User rooms**: `user:{userId}` - Auto-joined on connect, for user-specific notifications
- **Conversation rooms**: `conversation:{conversationId}` - Manual join for chat
- **Notification rooms**: `notification:{notificationId}` - For specific notifications

Room operations:
- `join_room` - Join conversation or notification room
- `leave_room` - Leave any room
- Room joining/leaving broadcasts to other users

### Event Broadcasting

**Incoming Events (from RabbitMQ):**
1. `message.sent` -> broadcast to conversation room as `new_message`
2. `booking.confirmed` -> broadcast to user room as `booking_update`
3. `notification.created` -> broadcast to user room as `new_notification`

**Client Events:**
1. `typing` - Typing indicator in room
2. `stop_typing` - Stop typing indicator
3. `user_joined` - Notification when user joins room
4. `user_left` - Notification when user leaves room
5. `user_typing` - Received typing indicator
6. `user_stop_typing` - Received stop typing

### Infrastructure

- **Redis Adapter**: Horizontal scaling across multiple instances
- **RabbitMQ Event Bus**: Event-driven architecture
- **Health Checks**: Liveness and readiness probes
- **Metrics Endpoint**: Connected sockets and room statistics
- **Structured Logging**: Winston with file rotation

## Configuration

### Environment Variables

```env
# Application
NODE_ENV=development|production
PORT=3002
SERVICE_HOST=0.0.0.0

# JWT
JWT_SECRET=<required>
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<optional>
REDIS_DB=1

# RabbitMQ
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_VHOST=/

# CORS
CORS_ORIGIN=http://localhost:3000,https://hometrip.com

# Logging
LOG_LEVEL=info
LOG_DIR=logs
LOG_FORMAT=json

# Service URLs
MESSAGE_SERVICE_URL=http://message-service:4006
NOTIFICATION_SERVICE_URL=http://notification-service:4009
BOOKING_SERVICE_URL=http://booking-service:4004

# Security
ALLOW_AUTH_WITHOUT_JWT=false
```

## API Endpoints

### Health Check
```
GET /health
Response: { status, service, version, redis, eventBus }
```

### Metrics
```
GET /metrics
Response: { connectedSockets, rooms, totalRooms }
```

## Dependencies

### Production
- `socket.io@^4.7.2` - WebSocket server
- `socket.io-redis@^6.1.1` - Redis adapter
- `redis@^4.6.12` - Redis client
- `jsonwebtoken@^9.0.2` - JWT verification
- `cors@^2.8.5` - CORS middleware
- `winston@^3.11.0` - Logging
- `amqplib@^0.10.3` - RabbitMQ client
- `dotenv@^16.3.1` - Environment variables
- `axios@^1.6.3` - HTTP client
- `events@^3.3.0` - Event emitter

### Development
- `nodemon@^3.0.2` - Auto-restart
- `jest@^29.7.0` - Testing framework
- `supertest@^6.3.3` - HTTP testing

## Running

### Development
```bash
cd /home/arwa/hometrip-microservices/services/websocket-gateway
npm install
cp .env.example .env
npm run dev
```

### Production
```bash
npm install --production
npm start
```

### Docker
```bash
# Build
docker build -t hometrip-websocket-gateway:1.0.0 .

# Run
docker run -d \
  --name websocket-gateway \
  -p 3002:3002 \
  -e JWT_SECRET=<secret> \
  -e REDIS_HOST=redis \
  -e RABBITMQ_HOST=rabbitmq \
  hometrip-websocket-gateway:1.0.0
```

## Architecture

```
┌─────────────────────────────────────────┐
│   Frontend (Web, Mobile, Desktop)       │
└────────────────┬────────────────────────┘
                 │
        ┌────────▼──────────┐
        │  WebSocket GW     │ :3002
        │  (Socket.io)      │
        └────┬──────────┬───┘
             │          │
    ┌────────▼──┐   ┌──▼────────────┐
    │   Redis   │   │   RabbitMQ    │
    │  Adapter  │   │   EventBus    │
    └───────────┘   └──┬────────────┘
                       │
        ┌──────────────┼─────────────┐
        │              │             │
    ┌───▼───┐  ┌──────▼────┐  ┌────▼─────┐
    │Message │  │  Booking  │  │Notification
    │Service │  │  Service  │  │ Service
    │ :4006  │  │  :4004    │  │  :4009
    └────────┘  └───────────┘  └──────────┘
```

## Deployment Checklist

- [ ] Copy `.env.example` to `.env` and configure
- [ ] Update `JWT_SECRET` with strong key
- [ ] Configure `REDIS_HOST` and `RABBITMQ_HOST`
- [ ] Set `CORS_ORIGIN` for production domains
- [ ] Build Docker image
- [ ] Update `docker-compose.yml` with service definition
- [ ] Deploy and verify health check
- [ ] Test WebSocket connection
- [ ] Monitor logs and metrics
- [ ] Setup monitoring for connected sockets
- [ ] Configure log rotation

## Next Steps

1. **Service Integration**
   - Integrate with message-service
   - Integrate with booking-service
   - Integrate with notification-service

2. **Frontend Integration**
   - Update frontend WebSocket client
   - Test real-time message delivery
   - Test booking notifications
   - Test typing indicators

3. **Production Setup**
   - Configure SSL/TLS
   - Setup monitoring (Prometheus)
   - Configure alerting
   - Document runbook

4. **Testing**
   - Write unit tests for event handlers
   - Write integration tests
   - Load testing for socket scaling
   - Failover testing

## Monitoring Commands

```bash
# Check health
curl http://localhost:3002/health | jq

# Check metrics
curl http://localhost:3002/metrics | jq

# View logs
docker-compose logs -f websocket-gateway

# Check connected sockets
docker-compose exec websocket-gateway curl localhost:3002/metrics

# Monitor Redis keys
docker-compose exec redis redis-cli KEYS "ws:*"

# Monitor RabbitMQ queues
# Visit http://localhost:15672 (guest/guest)
```

## Performance Metrics

### Scalability
- Horizontal scaling via Redis adapter
- Support for multiple instances
- Recommended: 2-3 instances for production
- Max connections: Limited by Redis and system memory

### Resources
- Memory per instance: ~100MB base + connection overhead
- CPU: Low usage (mostly idle, spikes on events)
- Network: Depends on message frequency

### Recommended Setup
- Dev: 1 instance
- Staging: 2 instances with load balancer
- Production: 3+ instances with sticky sessions

## Support & Troubleshooting

See README.md for:
- Detailed API documentation
- Client connection examples
- Troubleshooting guide
- Security considerations

See INTEGRATION_GUIDE.md for:
- Service integration examples
- Event schema definitions
- Backend implementation examples
- Testing procedures

## License

MIT - Part of HomeTrip microservices

## Created

2024-11-17

**Total Code:** 873 lines of JavaScript
**Configuration Files:** 3 (package.json, .env.example, .dockerignore)
**Documentation:** 2 (README.md, INTEGRATION_GUIDE.md)
**Docker:** 1 (Dockerfile)
