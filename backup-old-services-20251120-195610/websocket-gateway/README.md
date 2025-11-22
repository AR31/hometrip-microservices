# WebSocket Gateway

Real-time communication gateway for HomeTrip microservices using Socket.io with Redis adapter for horizontal scaling.

## Features

- **Real-time Communication**: Socket.io for bidirectional communication
- **JWT Authentication**: Token-based socket connection security
- **Room Management**: User rooms, conversation rooms, notification rooms
- **Redis Adapter**: Horizontal scaling support with Redis pub/sub
- **Event Broadcasting**: Automatic event subscription and broadcasting to relevant users/rooms
- **Graceful Shutdown**: Clean shutdown handling with signal management
- **Health Checks**: Built-in health and metrics endpoints
- **Structured Logging**: Winston-based logging with file persistence

## Architecture

```
┌─────────────────────────────────────────┐
│        Frontend Applications            │
│  (Web, Mobile, Desktop Clients)         │
└─────────────────┬───────────────────────┘
                  │
                  ▼
         ┌────────────────────┐
         │   WebSocket GW     │ (:3002)
         │  (Socket.io)       │
         └────┬──────────┬────┘
              │          │
    ┌─────────▼┐    ┌───▼──────────┐
    │  Redis   │    │  RabbitMQ    │
    │ Adapter  │    │  EventBus    │
    └──────────┘    └───┬──────────┘
                        │
            ┌───────────┼──────────────┐
            │           │              │
         ┌──▼──┐  ┌────▼─────┐  ┌────▼────┐
         │Message Booking Notification
         │Service Service   Service
         └──────┘  └────────┘  └─────────┘
```

## Components

### 1. Socket.io Server (`src/index.js`)

Main server that:
- Initializes Socket.io with Redis adapter
- Handles socket connections and events
- Manages room operations
- Broadcasts events to specific users/rooms

### 2. Authentication Middleware (`src/middleware/socketAuth.js`)

- JWT token verification on connection
- User information extraction from token
- Token expiry monitoring
- Support for unauthenticated connections (optional)

### 3. Configuration (`src/config/index.js`)

- Environment-based configuration
- Socket.io settings (CORS, transports)
- Redis connection settings
- RabbitMQ connection settings
- Service URLs for integration

### 4. Event Bus (`src/utils/eventBus.js`)

- RabbitMQ connection management
- Event subscription and publishing
- Reconnection logic with exponential backoff
- Consumer acknowledgment handling

### 5. Logger (`src/utils/logger.js`)

- Winston-based structured logging
- Console and file output
- Log rotation and file management
- Different log levels (error, warn, info, debug)

## API Events

### Client Events (emitted from frontend)

#### `join_room`
Join a specific room (conversation or notification).

```javascript
socket.emit('join_room', {
  roomType: 'conversation', // or 'notification'
  roomId: 'conversation-123'
}, (response) => {
  console.log(response.message);
});
```

#### `leave_room`
Leave a specific room.

```javascript
socket.emit('leave_room', {
  roomType: 'conversation',
  roomId: 'conversation-123'
}, (response) => {
  console.log(response.message);
});
```

#### `typing`
Send typing indicator in a room.

```javascript
socket.emit('typing', {
  roomType: 'conversation',
  roomId: 'conversation-123'
});
```

#### `stop_typing`
Stop typing indicator.

```javascript
socket.emit('stop_typing', {
  roomType: 'conversation',
  roomId: 'conversation-123'
});
```

### Server Events (received by frontend)

#### `connected`
Emitted on successful connection.

```javascript
socket.on('connected', (data) => {
  console.log('Connected with socketId:', data.socketId);
  console.log('UserId:', data.userId);
});
```

#### `new_message`
New message in a conversation room.

```javascript
socket.on('new_message', (data) => {
  // data: { conversationId, senderId, recipientId, message, timestamp }
});
```

#### `booking_update`
Booking status update for a user.

```javascript
socket.on('booking_update', (data) => {
  // data: { bookingId, status, type, timestamp }
});
```

#### `new_notification`
New notification for a user.

```javascript
socket.on('new_notification', (data) => {
  // data: { notificationId, type, title, message, data, timestamp }
});
```

#### `user_joined`
Another user joined the room.

```javascript
socket.on('user_joined', (data) => {
  // data: { socketId, userId, room, timestamp }
});
```

#### `user_left`
Another user left the room.

```javascript
socket.on('user_left', (data) => {
  // data: { socketId, userId, room, timestamp }
});
```

#### `user_typing`
Another user is typing.

```javascript
socket.on('user_typing', (data) => {
  // data: { socketId, userId, room, timestamp }
});
```

#### `user_stop_typing`
Another user stopped typing.

```javascript
socket.on('user_stop_typing', (data) => {
  // data: { socketId, userId, room, timestamp }
});
```

#### `token_expiring_soon`
User's token is expiring soon (within 5 minutes).

```javascript
socket.on('token_expiring_soon', (data) => {
  console.log('Token expires in:', data.expiresIn, 'seconds');
  // Prompt user to refresh token
});
```

## Room Naming Conventions

- **User Rooms**: `user:{userId}`
  - Private room for user-specific notifications
  - Automatically joined on connection
  - Example: `user:123456`

- **Conversation Rooms**: `conversation:{conversationId}`
  - Shared room for message exchange
  - Users join manually
  - Example: `conversation:conv-789`

- **Notification Rooms**: `notification:{notificationId}`
  - Specific notification room
  - Example: `notification:notif-456`

## Event Flow

### Message Sending

```
Message Service
     ↓ (publishes)
RabbitMQ: message.sent
     ↓ (EventBus subscribes)
WebSocket Gateway
     ↓ (broadcasts to conversation room)
All users in conversation
```

### Booking Confirmation

```
Booking Service
     ↓ (publishes)
RabbitMQ: booking.confirmed
     ↓ (EventBus subscribes)
WebSocket Gateway
     ↓ (broadcasts to user room)
Relevant user
```

### Notification Creation

```
Notification Service
     ↓ (publishes)
RabbitMQ: notification.created
     ↓ (EventBus subscribes)
WebSocket Gateway
     ↓ (broadcasts to user room)
Relevant user
```

## Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

## Running

### Development

```bash
npm run dev
```

This uses nodemon for automatic restart on file changes.

### Production

```bash
npm start
```

## Docker

### Build Image

```bash
docker build -t hometrip-websocket-gateway:1.0.0 .
```

### Run Container

```bash
docker run -d \
  --name websocket-gateway \
  -p 3002:3002 \
  -e NODE_ENV=production \
  -e JWT_SECRET=your-secret \
  -e REDIS_HOST=redis \
  -e RABBITMQ_HOST=rabbitmq \
  hometrip-websocket-gateway:1.0.0
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | development | Environment (development, production) |
| `PORT` | 3002 | Server port |
| `JWT_SECRET` | - | Required JWT secret key |
| `REDIS_HOST` | redis | Redis host |
| `REDIS_PORT` | 6379 | Redis port |
| `REDIS_PASSWORD` | - | Redis password (optional) |
| `REDIS_DB` | 1 | Redis database number |
| `RABBITMQ_HOST` | rabbitmq | RabbitMQ host |
| `RABBITMQ_PORT` | 5672 | RabbitMQ port |
| `RABBITMQ_USER` | guest | RabbitMQ username |
| `RABBITMQ_PASSWORD` | guest | RabbitMQ password |
| `CORS_ORIGIN` | localhost:3000 | CORS allowed origins |
| `LOG_LEVEL` | info | Logging level (debug, info, warn, error) |

## Endpoints

### Health Check

```bash
curl http://localhost:3002/health
```

Response:
```json
{
  "status": "healthy",
  "service": "websocket-gateway",
  "version": "1.0.0",
  "redis": "connected",
  "eventBus": {
    "isConnected": true,
    "reconnectAttempts": 0,
    "host": "redis",
    "port": 6379
  }
}
```

### Metrics

```bash
curl http://localhost:3002/metrics
```

Response:
```json
{
  "connectedSockets": 42,
  "rooms": [
    "user:123",
    "user:456",
    "conversation:conv-789"
  ],
  "totalRooms": 123
}
```

## Client Connection Example

### JavaScript (Node.js/Browser)

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3002', {
  auth: {
    token: 'your-jwt-token'
  },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5
});

// Connection
socket.on('connected', (data) => {
  console.log('Connected:', data);
});

// Join conversation room
socket.emit('join_room', {
  roomType: 'conversation',
  roomId: 'conv-123'
}, (response) => {
  if (response.success) {
    console.log('Joined room');
  }
});

// Listen for messages
socket.on('new_message', (data) => {
  console.log('New message:', data);
});

// Send typing indicator
socket.emit('typing', {
  roomType: 'conversation',
  roomId: 'conv-123'
});

// Handle disconnection
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

## Monitoring

### Health Check Endpoint

The `/health` endpoint provides real-time status of:
- Socket.io server status
- Redis adapter connectivity
- RabbitMQ event bus connectivity
- Connected sockets count

### Metrics Endpoint

The `/metrics` endpoint provides:
- Number of connected sockets
- List of active rooms
- Total room count

### Logs

Logs are stored in the `logs/` directory:
- `all.log` - All log levels
- `error.log` - Errors only

## Horizontal Scaling

The gateway supports horizontal scaling through:

1. **Redis Adapter**: Socket.io uses Redis to sync messages across multiple instances
2. **Load Balancer**: Nginx or similar distributes traffic across instances
3. **Sticky Sessions**: Load balancer maintains user connections to same instance (recommended)

### Docker Compose Scaling

```bash
# Scale to 3 instances
docker-compose up --scale websocket-gateway=3
```

## Security Considerations

1. **JWT Validation**: All connections must provide valid JWT token
2. **CORS**: Only allowed origins can connect
3. **Room Authorization**: Clients can join any room (implement authorization in your app)
4. **Token Expiry**: Clients receive warning when token is expiring
5. **Production**: Change `JWT_SECRET` in production environment

## Troubleshooting

### Connection Issues

1. Check CORS configuration matches your frontend URL
2. Verify JWT token is valid: `jwt.io`
3. Check Redis connectivity: `redis-cli ping`
4. Check RabbitMQ connectivity: `curl http://localhost:15672`

### Performance Issues

1. Monitor connected sockets: `/metrics` endpoint
2. Check Redis memory usage
3. Verify RabbitMQ queue sizes
4. Review logs in `logs/` directory

### Missing Events

1. Verify RabbitMQ is running
2. Check event routing keys match expectations
3. Verify service is publishing events correctly
4. Check logs for subscription errors

## Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm test -- --coverage
```

## Contributing

1. Create feature branch
2. Make changes
3. Add tests
4. Run lint check
5. Submit pull request

## License

MIT

## Support

For issues and questions, contact the HomeTrip Team.
