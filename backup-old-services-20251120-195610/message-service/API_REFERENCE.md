# Message Service API Reference

## Base URL
```
http://localhost:4006/api
```

## Authentication
All endpoints require JWT token in header:
```
Authorization: Bearer <jwt_token>
```

---

## Messages API

### Send Message
**POST** `/messages/:conversationId/send`

Request:
```json
{
  "text": "Hello!",
  "type": "user",
  "attachments": []
}
```

Response:
```json
{
  "success": true,
  "message": {
    "_id": "...",
    "conversation": "...",
    "sender": { "_id": "...", "fullName": "...", "email": "...", "avatar": "..." },
    "text": "Hello!",
    "type": "user",
    "isRead": false,
    "createdAt": "2024-01-01T12:00:00Z",
    "updatedAt": "2024-01-01T12:00:00Z"
  }
}
```

---

### Get Messages
**GET** `/messages/:conversationId?page=1&limit=50`

Query Parameters:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Messages per page (default: 50)

Response:
```json
{
  "success": true,
  "messages": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
```

---

### Mark Message as Read
**POST** `/messages/:messageId/read`

Response:
```json
{
  "success": true,
  "message": { ... }
}
```

---

### Mark Conversation as Read
**POST** `/messages/:conversationId/mark-read`

Response:
```json
{
  "success": true,
  "messagesMarked": 5
}
```

---

### Delete Message
**DELETE** `/messages/:messageId`

Response:
```json
{
  "success": true,
  "message": "Message deleted"
}
```

---

### Get Unread Count
**GET** `/messages/stats/unread`

Response:
```json
{
  "success": true,
  "totalUnread": 12,
  "conversationsWithUnread": [
    {
      "conversationId": "...",
      "unreadCount": 5
    }
  ]
}
```

---

### Add Translation
**POST** `/messages/:messageId/translate`

Request:
```json
{
  "language": "en",
  "translatedText": "Hello!"
}
```

Response:
```json
{
  "success": true,
  "message": { ... }
}
```

---

### Search Messages
**GET** `/messages/:conversationId/search?query=hello&type=user`

Query Parameters:
- `query` (required): Search text
- `type` (optional): Filter by message type

Response:
```json
{
  "success": true,
  "messages": [...],
  "count": 10
}
```

---

## Conversations API

### List Conversations
**GET** `/conversations?status=pending&archived=false&labels=important&page=1&limit=20`

Query Parameters:
- `status` (optional): Filter by status (pending, accepted, confirmed, rejected, cancelled, completed, expired)
- `archived` (optional): true/false
- `labels` (optional): Comma-separated labels
- `page` (optional): Page number
- `limit` (optional): Items per page

Response:
```json
{
  "success": true,
  "conversations": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

---

### Create Conversation
**POST** `/conversations`

Request:
```json
{
  "participantId": "user_id",
  "listingId": "listing_id",
  "reservationId": "reservation_id"
}
```

Response:
```json
{
  "success": true,
  "conversation": {
    "_id": "...",
    "participants": [...],
    "listing": { ... },
    "status": "pending",
    "createdAt": "2024-01-01T12:00:00Z"
  }
}
```

---

### Get Conversation Details
**GET** `/conversations/:conversationId`

Response:
```json
{
  "success": true,
  "conversation": { ... }
}
```

---

### Archive Conversation
**POST** `/conversations/:conversationId/archive`

Request:
```json
{
  "archive": true
}
```

Response:
```json
{
  "success": true,
  "message": "Conversation archived",
  "archived": true
}
```

---

### Mark Conversation as Read
**POST** `/conversations/:conversationId/read`

Response:
```json
{
  "success": true,
  "message": "Conversation marked as read"
}
```

---

### Add/Remove Label
**POST** `/conversations/:conversationId/labels`

Request:
```json
{
  "label": "important",
  "action": "add"
}
```

Response:
```json
{
  "success": true,
  "message": "Label important added",
  "labels": ["important"]
}
```

---

### Delete Conversation
**DELETE** `/conversations/:conversationId`

Response:
```json
{
  "success": true,
  "message": "Conversation and messages deleted"
}
```

---

### Set Typing Indicator
**POST** `/conversations/:conversationId/typing`

Response:
```json
{
  "success": true,
  "message": "Typing indicator set"
}
```

---

### Get Unread Stats
**GET** `/conversations/stats/unread`

Response:
```json
{
  "success": true,
  "totalUnread": 12,
  "conversationsWithUnread": 3
}
```

---

## Health Check

**GET** `/health`

Response:
```json
{
  "success": true,
  "service": "message-service",
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message"
}
```

Common HTTP Status Codes:
- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Events Emitted

### message.sent
Emitted when a new message is sent.

```json
{
  "messageId": "...",
  "conversationId": "...",
  "senderId": "...",
  "text": "...",
  "timestamp": "..."
}
```

### message.read
Emitted when a message is marked as read.

```json
{
  "messageId": "...",
  "conversationId": "...",
  "readBy": "...",
  "readAt": "..."
}
```

### conversation.created
Emitted when a new conversation is created.

```json
{
  "conversationId": "...",
  "participants": [...],
  "listingId": "...",
  "timestamp": "..."
}
```

---

## Rate Limiting

No rate limiting is currently implemented. Add middleware as needed for production.

## Pagination

All list endpoints support pagination:
- `page`: 1-based page number
- `limit`: Items per page (max recommended: 100)

Example: `/api/conversations?page=2&limit=20`

## Sorting

Default sorting:
- Conversations: `updatedAt` descending
- Messages: `createdAt` ascending

## Filtering

Supported filters vary by endpoint. See individual endpoint documentation.

## Field Soft Delete

Messages use soft delete (set `deleted: true`). Hard delete is available via direct database operations for GDPR compliance.

## Transactions

Currently, operations are not atomic. For critical operations, consider adding transaction support via MongoDB sessions.
