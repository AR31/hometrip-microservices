# Message Service

Real-time messaging microservice for HomeTrip platform handling conversations, messages, and instant notifications.

## Features

- Real-time messaging between users
- Conversation management (create, list, archive)
- Message history with pagination
- Read/unread status tracking
- Message search functionality
- Multi-language translation support
- Label and archiving capabilities
- Soft delete for GDPR compliance
- WebSocket integration ready
- Event-driven architecture with RabbitMQ
- Automatic cleanup on user deletion

## Architecture

The service uses:
- **Express.js** for REST API
- **MongoDB** for data persistence
- **RabbitMQ** for event-driven communication
- **Winston** for logging
- **JWT** for authentication

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Configure the following variables:

- `NODE_ENV` - Environment (development/production)
- `PORT` - Service port (default: 4006)
- `MONGODB_URI` - MongoDB connection string
- `RABBITMQ_URL` - RabbitMQ connection URL
- `REDIS_URL` - Redis connection URL
- `LOG_LEVEL` - Logging level (info/debug/error)
- `JWT_SECRET` - JWT secret for token verification
- `CORS_ORIGIN` - Allowed CORS origins
- `API_GATEWAY_URL` - API Gateway URL

## Development

```bash
npm run dev
```

## Production

```bash
npm start
```

## API Endpoints

### Messages

- `POST /api/messages/:conversationId/send` - Send a message
- `GET /api/messages/:conversationId` - Get conversation messages (with pagination)
- `POST /api/messages/:messageId/read` - Mark message as read
- `POST /api/messages/:conversationId/mark-read` - Mark all as read
- `DELETE /api/messages/:messageId` - Delete message (soft delete)
- `GET /api/messages/stats/unread` - Get unread count
- `POST /api/messages/:messageId/translate` - Add translation
- `GET /api/messages/:conversationId/search` - Search messages

### Conversations

- `GET /api/conversations` - List user conversations
- `POST /api/conversations` - Create conversation
- `GET /api/conversations/:conversationId` - Get conversation details
- `POST /api/conversations/:conversationId/archive` - Archive/unarchive
- `POST /api/conversations/:conversationId/read` - Mark as read
- `POST /api/conversations/:conversationId/labels` - Manage labels
- `DELETE /api/conversations/:conversationId` - Delete conversation
- `POST /api/conversations/:conversationId/typing` - Set typing indicator
- `GET /api/conversations/stats/unread` - Get unread stats

## Authentication

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

## Events

### Published Events

- `message.sent` - When a message is sent
- `message.read` - When a message is marked as read
- `conversation.created` - When a conversation is created

### Subscribed Events

- `user.deleted` - Cleanup messages and conversations for deleted user

## Database Models

### Message Schema

- `conversation` - Reference to Conversation
- `sender` - User who sent the message
- `text` - Message content
- `type` - Message type (user/system/automated)
- `attachments` - Array of file attachments
- `translations` - Multi-language translations
- `isRead` - Read status
- `readAt` - Read timestamp
- `metadata` - Additional metadata
- `deleted` - Soft delete flag
- Timestamps

### Conversation Schema

- `listing` - Associated listing
- `reservation` - Associated reservation
- `participants` - Array of participants
- `guest` / `host` - Direct references
- `status` - Conversation status
- `lastMessage` - Cache of last message
- `unreadCount` - Map of unread counts per user
- `archived` - Map of archive status per user
- `typingUsers` - Active typing indicators
- `autoTranslate` - Per-user translation settings
- `labels` - Conversation labels
- `metadata` - Reservation metadata cache
- Timestamps

## Docker

Build the Docker image:

```bash
docker build -t hometrip-message-service:1.0 .
```

Run in a container:

```bash
docker run -p 4006:4006 \
  -e MONGODB_URI=mongodb://mongo:27017/hometrip-messages \
  -e RABBITMQ_URL=amqp://rabbitmq:5672 \
  hometrip-message-service:1.0
```

## Health Check

```bash
curl http://localhost:4006/health
```

## Testing

```bash
npm test
```

## Logging

Logs are stored in `/logs` directory:
- `error.log` - Error logs
- `combined.log` - All logs

In development, logs are also output to console with colors.

## Performance Optimization

The service includes:
- Database indexes on frequently queried fields
- Message pagination (default 50 per page)
- Unread count caching
- Soft deletes for GDPR compliance
- Automatic cleanup of deleted user data

## WebSocket Integration

The service is designed to integrate with a WebSocket Gateway for real-time notifications:
- Message delivery events
- Read receipts
- Typing indicators
- Connection status

## Error Handling

All endpoints return standardized JSON responses:

Success:
```json
{
  "success": true,
  "data": {}
}
```

Error:
```json
{
  "success": false,
  "error": "Error message"
}
```

## Contributing

Follow the existing code style and patterns. Ensure all tests pass before submitting changes.

## License

MIT

## Support

For issues or questions, contact the HomeTrip development team.
