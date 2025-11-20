# Review Service - File Index & Quick Reference

## Directory Structure

```
review-service/
├── src/
│   ├── config/
│   │   ├── index.js              # Configuration management
│   │   └── database.js           # MongoDB connection
│   ├── controllers/
│   │   └── reviewController.js   # Business logic (8 functions)
│   ├── middleware/
│   │   └── auth.js               # JWT & authorization
│   ├── models/
│   │   └── Review.js             # Mongoose schema
│   ├── routes/
│   │   └── reviews.js            # API endpoints
│   ├── utils/
│   │   ├── eventBus.js           # RabbitMQ integration
│   │   └── logger.js             # Winston logging
│   └── index.js                  # Main application
├── logs/                          # Log directory (auto-created)
├── package.json                   # npm configuration
├── Dockerfile                     # Docker image definition
├── .dockerignore                  # Docker ignore rules
├── .env.example                   # Environment template
├── .gitignore                     # Git ignore rules
├── README.md                      # Complete documentation
├── QUICK_START.md                 # Quick start guide
├── DELIVERY_SUMMARY.md            # Detailed delivery report
└── INDEX.md                       # This file
```

## File Descriptions

### Configuration Files

| File | Purpose | Key Content |
|------|---------|------------|
| package.json | npm configuration | Dependencies, scripts, metadata |
| .env.example | Environment template | All configurable variables |
| Dockerfile | Docker image | Multi-stage build, health checks |
| .dockerignore | Docker build ignore | Build optimization |
| .gitignore | Git ignore rules | Files to exclude from git |

### Source Code - Entry Point

| File | Purpose | Key Functions |
|------|---------|---------------|
| src/index.js | Main application | Express setup, middleware, health endpoints, graceful shutdown |

### Source Code - Configuration

| File | Purpose | Key Functions |
|------|---------|---------------|
| src/config/index.js | Configuration management | Centralized config, validation, defaults |
| src/config/database.js | Database connection | connectDB(), disconnectDB() |

### Source Code - Database

| File | Purpose | Key Features |
|------|---------|---------------|
| src/models/Review.js | Mongoose schema | Fields, indexes, static methods |

### Source Code - Business Logic

| File | Purpose | Functions |
|------|---------|-----------|
| src/controllers/reviewController.js | Business logic | createReview, getListingReviews, getUserReviews, respondToReview, flagReview, moderateReview, getModerationQueue, getReviewStats, deleteReview |

### Source Code - HTTP Routes

| File | Purpose | Endpoints |
|------|---------|-----------|
| src/routes/reviews.js | API routes | 8 endpoints with validation, auth protection |

### Source Code - Middleware & Auth

| File | Purpose | Functions |
|------|---------|-----------|
| src/middleware/auth.js | Authentication | authMiddleware, optionalAuth, requireRole |

### Source Code - Utilities

| File | Purpose | Functions |
|------|---------|-----------|
| src/utils/logger.js | Logging | Winston logger instance, Morgan stream |
| src/utils/eventBus.js | Event management | connect, publish, subscribe, close |

### Documentation

| File | Purpose | Contents |
|------|---------|----------|
| README.md | Complete guide | Features, API, events, database, deployment |
| QUICK_START.md | Getting started | Installation, running, health checks, examples |
| DELIVERY_SUMMARY.md | Delivery report | Architecture, features, specifications |
| INDEX.md | This file | Quick reference and file index |

## Quick Reference

### Starting the Service

```bash
# Development
npm run dev

# Production
npm start

# Tests
npm test
```

### API Endpoints

```
POST   /reviews                              Create review
GET    /reviews/listing/:listingId           Get listing reviews
GET    /reviews/user/:userId                 Get user reviews
GET    /reviews/stats/:listingId             Get statistics
POST   /reviews/:reviewId/response           Respond to review
POST   /reviews/:reviewId/flag               Flag review
POST   /reviews/:reviewId/moderate           Moderate review (admin)
GET    /reviews/moderation/queue             Get moderation queue (admin)
DELETE /reviews/:reviewId                    Delete review
```

### Health Endpoints

```
GET /health                                  Service health
GET /ready                                   Readiness check
GET /metrics                                 Metrics
```

### Events

**Published:**
- review.created
- review.responded
- review.moderated

**Subscribed:**
- booking.completed

### Key Directories

- **src/config/** - Configuration management
- **src/models/** - Database schemas
- **src/controllers/** - Business logic
- **src/routes/** - API endpoints
- **src/middleware/** - Express middleware
- **src/utils/** - Utility functions
- **logs/** - Application logs

### Environment Variables

**Critical:**
- `JWT_SECRET` - Required for production
- `MONGODB_URI` - Database connection
- `RABBITMQ_URL` - Message broker

**Optional (with defaults):**
- `PORT` - Default 4007
- `NODE_ENV` - Default development
- `LOG_LEVEL` - Default info

### Database

**MongoDB Database:** review_db

**Collection:** reviews

**Indexes:**
1. { listing: 1, createdAt: -1 }
2. { reviewer: 1, createdAt: -1 }
3. { reviewee: 1, createdAt: -1 }
4. { reservation: 1, reviewer: 1 } UNIQUE
5. { isPublic: 1, isFlagged: 1 }

### Controller Functions (8 total)

1. **createReview** - POST /reviews
2. **getListingReviews** - GET /reviews/listing/:id
3. **getUserReviews** - GET /reviews/user/:id
4. **respondToReview** - POST /reviews/:id/response
5. **flagReview** - POST /reviews/:id/flag
6. **moderateReview** - POST /reviews/:id/moderate
7. **getModerationQueue** - GET /reviews/moderation/queue
8. **getReviewStats** - GET /reviews/stats/:id
9. **deleteReview** - DELETE /reviews/:id

### Authentication Methods

1. **Bearer Token** - Authorization: Bearer <jwt>
2. **Custom Headers** - x-user-id, x-user-email, x-user-role
3. **Optional Auth** - Token not required for public endpoints

### Roles & Permissions

- **user** - Create reviews, respond to own reviews, flag reviews
- **moderator** - Moderate reviews
- **admin** - Full access

### Technology Stack

- **Runtime:** Node.js 16+
- **Framework:** Express.js 4.18.2
- **Database:** MongoDB with Mongoose 7.6.3
- **Message Broker:** RabbitMQ
- **Authentication:** JWT
- **Validation:** express-validator
- **Logging:** Winston 3.11.0
- **Security:** Helmet, CORS, Rate Limiting

### File Sizes

- Largest file: src/controllers/reviewController.js (~450 lines)
- Configuration files: Minimal and focused
- Total size: ~100KB (excluding node_modules)

### Integration Points

- **Booking Service:** Subscribes to booking.completed
- **User Service:** Publishes review.created
- **Listing Service:** Reviews and ratings
- **Notification Service:** Review events
- **API Gateway:** Routes /reviews/*

### Development Workflow

1. Copy .env.example to .env
2. Configure environment variables
3. npm install
4. npm run dev
5. Test endpoints
6. Deploy with docker build && docker run

### Production Deployment

1. Build image: `docker build -t hometrip-review-service:latest .`
2. Run container with environment variables
3. Verify health: `curl http://localhost:4007/health`
4. Check logs: `docker logs <container-id>`

### Monitoring

- **Health:** /health endpoint
- **Readiness:** /ready endpoint
- **Metrics:** /metrics endpoint
- **Logs:** logs/error.log, logs/combined.log
- **Events:** RabbitMQ management interface

### Error Handling

All endpoints return consistent error format:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [{"param": "field", "msg": "Error message"}]
}
```

### Features Checklist

- [x] Guest-to-host reviews
- [x] Host-to-guest reviews
- [x] 1-5 star ratings
- [x] Detailed category ratings
- [x] Host responses
- [x] Review moderation
- [x] Flagging system
- [x] Statistics & analytics
- [x] Event publishing
- [x] Event subscription
- [x] Input validation
- [x] Rate limiting
- [x] JWT authentication
- [x] Role-based authorization
- [x] Graceful shutdown
- [x] Health checks
- [x] Docker support
- [x] Comprehensive logging

---

**Service Status:** PRODUCTION READY
**Total Files:** 16
**Source Files:** 9
**Documentation:** 4
**Configuration:** 3

**For detailed information, see:**
- README.md - Full documentation
- QUICK_START.md - Getting started
- DELIVERY_SUMMARY.md - Delivery details
- Source files - Implementation details
