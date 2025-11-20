# WebSocket Gateway - Integration Guide

This guide explains how to integrate the WebSocket Gateway with other HomeTrip microservices.

## Overview

The WebSocket Gateway serves as a real-time communication hub for:
- Message notifications in conversations
- Booking status updates
- User notifications
- Typing indicators
- Presence detection

## Integration Points

### 1. Frontend Integration

#### Connection with Authentication

```javascript
import io from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
  }

  connect(token) {
    this.socket = io(process.env.REACT_APP_WS_URL || 'http://localhost:3002', {
      auth: {
        token: token
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling']
    });

    this.socket.on('connected', (data) => {
      console.log('WebSocket connected:', data);
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
    });

    this.socket.on('token_expiring_soon', (data) => {
      console.warn('Token expiring in', data.expiresIn, 'seconds');
      // Trigger token refresh
      this.refreshToken();
    });
  }

  joinConversation(conversationId) {
    this.socket.emit('join_room', {
      roomType: 'conversation',
      roomId: conversationId
    }, (response) => {
      if (response.error) {
        console.error('Failed to join conversation:', response.error);
      }
    });
  }

  leaveConversation(conversationId) {
    this.socket.emit('leave_room', {
      roomType: 'conversation',
      roomId: conversationId
    });
  }

  onNewMessage(callback) {
    this.socket.on('new_message', callback);
  }

  onBookingUpdate(callback) {
    this.socket.on('booking_update', callback);
  }

  onNewNotification(callback) {
    this.socket.on('new_notification', callback);
  }

  onUserTyping(callback) {
    this.socket.on('user_typing', callback);
  }

  sendTyping(conversationId) {
    this.socket.emit('typing', {
      roomType: 'conversation',
      roomId: conversationId
    });
  }

  stopTyping(conversationId) {
    this.socket.emit('stop_typing', {
      roomType: 'conversation',
      roomId: conversationId
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

export default new WebSocketService();
```

### 2. Message Service Integration

The Message Service should publish events when messages are sent.

#### Event Publishing

```javascript
// In message-service/src/services/messageService.js

const eventBus = require('../utils/eventBus');

async function sendMessage(conversationId, senderId, recipientId, content) {
  // Save message to database
  const message = await Message.create({
    conversationId,
    senderId,
    recipientId,
    content,
    timestamp: new Date()
  });

  // Publish event to RabbitMQ
  await eventBus.publish('message.sent', {
    conversationId: conversationId,
    senderId: senderId,
    recipientId: recipientId,
    message: {
      id: message.id,
      content: message.content,
      timestamp: message.timestamp
    },
    timestamp: new Date().toISOString()
  });

  return message;
}
```

#### RabbitMQ Setup for Message Service

```javascript
// In message-service/src/config/rabbitmq.js

module.exports = {
  exchange: 'hometrip_events',
  queues: {
    messageSent: 'message.sent'
  },
  routingKeys: {
    messageSent: 'message.sent'
  }
};
```

### 3. Booking Service Integration

The Booking Service publishes booking confirmation events.

#### Event Publishing

```javascript
// In booking-service/src/services/bookingService.js

const eventBus = require('../utils/eventBus');

async function confirmBooking(bookingId, userId) {
  // Update booking status
  const booking = await Booking.findByIdAndUpdate(
    bookingId,
    { status: 'confirmed' },
    { new: true }
  );

  // Publish event to RabbitMQ
  await eventBus.publish('booking.confirmed', {
    bookingId: bookingId,
    userId: userId,
    status: 'confirmed',
    booking: {
      id: booking.id,
      listingId: booking.listingId,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      totalPrice: booking.totalPrice
    },
    timestamp: new Date().toISOString()
  });

  return booking;
}
```

### 4. Notification Service Integration

The Notification Service publishes notification creation events.

#### Event Publishing

```javascript
// In notification-service/src/services/notificationService.js

const eventBus = require('../utils/eventBus');

async function createNotification(userId, type, title, message, data = {}) {
  // Save notification to database
  const notification = await Notification.create({
    userId,
    type,
    title,
    message,
    data,
    isRead: false,
    timestamp: new Date()
  });

  // Publish event to RabbitMQ
  await eventBus.publish('notification.created', {
    notificationId: notification.id,
    userId: userId,
    type: type,
    title: title,
    message: message,
    data: data,
    timestamp: new Date().toISOString()
  });

  return notification;
}
```

## Event Bus Implementation in Services

Each service that publishes events needs an EventBus implementation. Here's a template:

```javascript
// service/src/utils/eventBus.js

const amqp = require('amqplib');
const logger = require('./logger');
const config = require('../config');

class EventBus {
  constructor() {
    this.connection = null;
    this.channel = null;
  }

  async connect() {
    try {
      const url = `amqp://${config.rabbitmq.user}:${config.rabbitmq.password}@${config.rabbitmq.host}:${config.rabbitmq.port}/${config.rabbitmq.vhost}`;
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();

      // Assert exchange
      await this.channel.assertExchange(config.rabbitmq.exchange, 'topic', {
        durable: true
      });

      logger.info('Connected to RabbitMQ');
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  async publish(routingKey, data) {
    try {
      const message = JSON.stringify(data);
      await this.channel.publish(
        config.rabbitmq.exchange,
        routingKey,
        Buffer.from(message),
        { persistent: true }
      );

      logger.info('Event published:', { routingKey });
    } catch (error) {
      logger.error('Failed to publish event:', error);
      throw error;
    }
  }

  async close() {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
    } catch (error) {
      logger.error('Error closing RabbitMQ connection:', error);
    }
  }
}

module.exports = new EventBus();
```

## Docker Compose Configuration

Update the docker-compose.yml to include the WebSocket Gateway:

```yaml
websocket-gateway:
  build:
    context: ./services/websocket-gateway
    dockerfile: Dockerfile
  container_name: websocket-gateway
  restart: unless-stopped
  ports:
    - "3002:3002"
  environment:
    - NODE_ENV=production
    - PORT=3002
    - JWT_SECRET=${JWT_SECRET}
    - REDIS_HOST=redis
    - REDIS_PORT=6379
    - REDIS_PASSWORD=${REDIS_PASSWORD}
    - RABBITMQ_HOST=rabbitmq
    - RABBITMQ_PORT=5672
    - RABBITMQ_USER=${RABBITMQ_USER}
    - RABBITMQ_PASSWORD=${RABBITMQ_PASSWORD}
    - CORS_ORIGIN=http://localhost:3000,https://hometrip.com
    - LOG_LEVEL=info
  depends_on:
    - redis
    - rabbitmq
  networks:
    - hometrip-network
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3002/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 5s
```

## Event Schema Definitions

### Message Sent Event

```javascript
{
  routingKey: 'message.sent',
  payload: {
    conversationId: string,      // ID of conversation
    senderId: string,             // ID of message sender
    recipientId: string,          // ID of message recipient
    message: {
      id: string,                 // Message ID
      content: string,            // Message content
      timestamp: ISO8601string    // Sent timestamp
    },
    timestamp: ISO8601string      // Event timestamp
  }
}
```

### Booking Confirmed Event

```javascript
{
  routingKey: 'booking.confirmed',
  payload: {
    bookingId: string,           // ID of booking
    userId: string,              // ID of user (guest/host)
    status: string,              // 'confirmed'
    booking: {
      id: string,                // Booking ID
      listingId: string,         // Listing ID
      checkIn: ISO8601string,    // Check-in date
      checkOut: ISO8601string,   // Check-out date
      totalPrice: number         // Total price
    },
    timestamp: ISO8601string     // Event timestamp
  }
}
```

### Notification Created Event

```javascript
{
  routingKey: 'notification.created',
  payload: {
    notificationId: string,      // ID of notification
    userId: string,              // ID of user receiving notification
    type: string,                // Type of notification (e.g., 'booking', 'message')
    title: string,               // Notification title
    message: string,             // Notification message
    data: object,                // Additional data
    timestamp: ISO8601string     // Event timestamp
  }
}
```

## Scaling Considerations

### Multiple WebSocket Gateway Instances

When scaling horizontally, use a load balancer with sticky sessions:

```nginx
# nginx.conf
upstream websocket_gateway {
  ip_hash;  # Sticky sessions
  server websocket-gateway-1:3002;
  server websocket-gateway-2:3002;
  server websocket-gateway-3:3002;
}

server {
  listen 80;
  location /socket.io {
    proxy_pass http://websocket_gateway;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
  }
}
```

### Redis Pub/Sub for Multiple Instances

The Redis adapter automatically handles:
- Message broadcasting across instances
- Room synchronization
- Socket metadata sharing

## Security Best Practices

1. **JWT Token Validation**
   - Always use strong JWT_SECRET in production
   - Implement token rotation
   - Monitor token expiration

2. **CORS Configuration**
   - Whitelist only trusted domains
   - Use HTTPS in production
   - Set appropriate credentials policy

3. **Rate Limiting**
   - Implement client-side rate limiting
   - Monitor event frequency per socket
   - Implement server-side throttling if needed

4. **Room Authorization**
   - Validate user has access to conversation before joining
   - Implement permission checks on backend
   - Log unauthorized access attempts

## Monitoring and Debugging

### Health Check

```bash
curl http://localhost:3002/health
```

### Metrics

```bash
curl http://localhost:3002/metrics
```

### Logs

```bash
# Follow WebSocket Gateway logs
docker-compose logs -f websocket-gateway

# Check specific errors
grep "error" logs/error.log
```

### Redis Monitoring

```bash
# Connect to Redis CLI
redis-cli

# Monitor WebSocket keys
KEYS ws:*

# Check socket adapter state
GET ws:socket:*
```

### RabbitMQ Monitoring

Visit RabbitMQ management UI:
```
http://localhost:15672
Username: guest
Password: guest
```

Monitor queues:
- `websocket.message.sent`
- `websocket.booking.confirmed`
- `websocket.notification.created`

## Troubleshooting

### Events Not Reaching Frontend

1. Check WebSocket connection status: `/health` endpoint
2. Verify RabbitMQ queue names match expectations
3. Check event routing keys in service configuration
4. Review logs for subscription errors

### Missing Messages

1. Verify RabbitMQ message persistence is enabled
2. Check Redis memory usage
3. Monitor WebSocket connections for disconnections
4. Review message acknowledgment logs

### Performance Issues

1. Check number of connected sockets: `/metrics` endpoint
2. Monitor Redis memory: `redis-cli INFO memory`
3. Check RabbitMQ queue depths
4. Review application logs for bottlenecks

## Testing Integration

### Local Testing

```bash
# Terminal 1: Start WebSocket Gateway
cd services/websocket-gateway
npm install
npm run dev

# Terminal 2: Send test event
node scripts/test-event.js

# Terminal 3: Connect test client
node scripts/test-client.js
```

### Docker Testing

```bash
docker-compose up websocket-gateway redis rabbitmq

# Monitor health
watch curl http://localhost:3002/health

# Check metrics
watch curl http://localhost:3002/metrics
```

## Support

For integration issues:
1. Check logs in `logs/` directory
2. Review configuration in `.env`
3. Verify service connectivity
4. Consult README.md for detailed API documentation
