# Review Service

A microservice for managing reviews in the HomeTrip platform. Handles guest-to-host and host-to-guest reviews with moderation capabilities.

## Features

- Create reviews with ratings (1-5 stars)
- Detailed ratings (cleanliness, communication, check-in, accuracy, location, value)
- Review responses from hosts
- Review moderation and flagging
- Average ratings calculation for listings and users
- Comprehensive review statistics
- Event-driven architecture with RabbitMQ
- Rate limiting and security hardening

## Technology Stack

- Node.js & Express.js
- MongoDB for data persistence
- RabbitMQ for event streaming
- Redis for caching
- Winston for logging
- JWT for authentication

## Installation

1. Clone the repository and navigate to the service directory:
```bash
cd services/review-service
```

2. Install dependencies:
```bash
npm install
```

3. Create environment configuration:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration values

## Configuration

Key environment variables:

- `PORT` - Service port (default: 4007)
- `NODE_ENV` - Environment (development/production)
- `JWT_SECRET` - Secret key for JWT verification
- `MONGODB_URI` - MongoDB connection string
- `RABBITMQ_URL` - RabbitMQ connection URL
- `LOG_LEVEL` - Logging level (debug/info/warn/error)

## Running

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Tests
```bash
npm test
```

## API Endpoints

### Create Review
```
POST /reviews
Authorization: Bearer <token>

{
  "listingId": "...",
  "reservationId": "...",
  "revieweeId": "...",
  "reviewType": "guest-to-host|host-to-guest",
  "rating": 1-5,
  "comment": "...",
  "ratings": {
    "cleanliness": 1-5,
    "communication": 1-5,
    "checkIn": 1-5,
    "accuracy": 1-5,
    "location": 1-5,
    "value": 1-5
  },
  "photos": [...]
}
```

### Get Listing Reviews
```
GET /reviews/listing/:listingId?page=1&limit=10
```

### Get User Reviews
```
GET /reviews/user/:userId?page=1&limit=20&reviewType=guest-to-host
```

### Get Review Statistics
```
GET /reviews/stats/:listingId
```

### Respond to Review
```
POST /reviews/:reviewId/response
Authorization: Bearer <token>

{
  "comment": "Thank you for your review!"
}
```

### Flag Review
```
POST /reviews/:reviewId/flag
Authorization: Bearer <token>

{
  "reason": "Inappropriate content"
}
```

### Moderate Review (Admin)
```
POST /reviews/:reviewId/moderate
Authorization: Bearer <admin-token>

{
  "action": "approve|reject",
  "reason": "Optional reason for rejection"
}
```

### Get Moderation Queue (Admin)
```
GET /reviews/moderation/queue?page=1&limit=20
Authorization: Bearer <admin-token>
```

### Delete Review
```
DELETE /reviews/:reviewId
Authorization: Bearer <token>
```

## Events

### Published Events

- `review.created` - When a new review is created
  ```json
  {
    "reviewId": "...",
    "listing": "...",
    "reviewer": "...",
    "reviewee": "...",
    "rating": 5,
    "reviewType": "guest-to-host",
    "timestamp": "2024-01-01T00:00:00Z"
  }
  ```

- `review.responded` - When a host responds to a review
  ```json
  {
    "reviewId": "...",
    "listing": "...",
    "reviewer": "...",
    "reviewee": "...",
    "timestamp": "2024-01-01T00:00:00Z"
  }
  ```

- `review.moderated` - When a review is moderated
  ```json
  {
    "reviewId": "...",
    "action": "approve|reject",
    "timestamp": "2024-01-01T00:00:00Z"
  }
  ```

### Subscribed Events

- `booking.completed` - Allows users to review after booking completion

## Database Schema

### Review Document

```javascript
{
  listing: ObjectId,           // Reference to listing
  reservation: ObjectId,       // Reference to reservation
  reviewer: ObjectId,          // User who wrote the review
  reviewee: ObjectId,          // User being reviewed
  reviewType: String,          // "guest-to-host" or "host-to-guest"
  rating: Number,              // 1-5
  comment: String,             // Review text
  ratings: {
    cleanliness: Number,
    communication: Number,
    checkIn: Number,
    accuracy: Number,
    location: Number,
    value: Number
  },
  photos: Array,
  hostResponse: {
    comment: String,
    respondedAt: Date
  },
  helpfulCount: Number,
  isPublic: Boolean,
  isFlagged: Boolean,
  flagReason: String,
  flaggedBy: ObjectId,
  flaggedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes

- `{ listing: 1, createdAt: -1 }` - For listing reviews
- `{ reviewer: 1, createdAt: -1 }` - For user's reviews written
- `{ reviewee: 1, createdAt: -1 }` - For reviews received
- `{ reservation: 1, reviewer: 1 }` - Unique index to prevent duplicates
- `{ isPublic: 1, isFlagged: 1 }` - For moderation queries

## Docker

Build the image:
```bash
docker build -t hometrip-review-service:latest .
```

Run the container:
```bash
docker run -p 4007:4007 \
  -e MONGODB_URI=mongodb://... \
  -e RABBITMQ_URL=amqp://... \
  -e JWT_SECRET=your-secret \
  hometrip-review-service:latest
```

## Health Checks

- `/health` - Service health status
- `/ready` - Readiness check (includes dependency checks)
- `/metrics` - Basic metrics (uptime, memory usage)

## Error Handling

The service returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "param": "field_name",
      "msg": "Validation error message"
    }
  ]
}
```

## Security

- JWT token-based authentication
- Role-based authorization (user, moderator, admin)
- Input validation using express-validator
- Rate limiting (100 requests per 15 minutes)
- Helmet for HTTP security headers
- CORS configuration
- Non-root Docker container execution

## Logging

Logs are written to:
- Console (development)
- `logs/error.log` - Error-level logs
- `logs/combined.log` - All logs

Log levels: debug, info, warn, error

## Contributing

1. Follow the existing code structure
2. Add tests for new features
3. Ensure all tests pass
4. Update documentation

## License

MIT
