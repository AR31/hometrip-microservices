# Notification Service - File Index

## Complete File Listing

### Root Level Files

| File | Purpose | Lines |
|------|---------|-------|
| `package.json` | NPM dependencies & scripts | 65 |
| `.env.example` | Environment configuration template | 50 |
| `Dockerfile` | Docker container build specification | 35 |
| `.dockerignore` | Files to exclude from Docker build | 20 |
| `README.md` | Complete API & deployment documentation | 650 |
| `IMPLEMENTATION_SUMMARY.md` | Architecture & features overview | 550 |
| `SETUP_GUIDE.md` | Step-by-step setup & configuration | 600 |
| `INDEX.md` | This file - quick reference | - |

---

## Source Code Structure

### `/src/index.js` (165 lines)
**Express Server & Service Initialization**
- Express app setup with middleware
- Security configuration (helmet, CORS, rate-limiting)
- Service initialization (MongoDB, Email, Twilio, RabbitMQ)
- Graceful shutdown handling
- Health check & metrics endpoints
- Error handling

**Key Exports:** Express app instance

---

### `/src/config/` - Configuration Management

#### `config/index.js` (45 lines)
**Centralized Environment Configuration**
- Environment variable loading
- Default values for development
- 30+ configuration options
- Configuration validation ready

**Exports:**
- PORT
- MONGODB_URI
- EMAIL_* settings
- TWILIO_* settings
- JWT_SECRET
- FRONTEND_URL
- etc.

#### `config/database.js` (55 lines)
**MongoDB Connection Management**

**Functions:**
- `connectDB()` - Establish MongoDB connection
- `disconnectDB()` - Close connection
- `getConnectionStatus()` - Check connection state
- `getReadyStateString()` - Describe ready state

---

### `/src/models/` - Data Models

#### `models/Notification.js` (180 lines)
**MongoDB Notification Schema**

**Schema Fields:**
- userId - Recipient (indexed)
- sender - Optional sender info
- type - 30+ notification types (indexed)
- title & message - Content
- data - Flexible nested object
- channels - Multi-channel config (inApp, email, push, sms)
- sentStatus - Delivery status per channel
- isRead - Read/unread state (indexed)
- readAt - Read timestamp
- priority - low/medium/high/urgent
- category - Filtering (indexed)
- isArchived - Archive state (indexed)
- expiresAt - Auto-deletion date

**Indexes:**
- Single: userId, type, isRead, category, isArchived
- Composite: (userId, isRead, createdAt), (userId, category, createdAt), etc.
- TTL: expiresAt

**Instance Methods:**
- `markAsRead()` - Mark as read
- `markAsUnread()` - Mark as unread
- `archive()` - Archive notification

**Static Methods:**
- `getUnreadCount(userId)` - Count unread
- `markAllAsRead(userId)` - Bulk mark as read
- `deleteOldNotifications(daysOld)` - Clean up old notifications

---

### `/src/controllers/` - Request Handlers

#### `controllers/notificationController.js` (320 lines)
**API Request Handling & Business Logic**

**REST Handlers:**
- `getNotifications()` - GET all with pagination
- `getNotification()` - GET single by ID
- `markAsRead()` - PUT mark as read
- `markAsUnread()` - PUT mark as unread
- `markAllAsRead()` - PUT mark all as read
- `archiveNotification()` - PUT archive
- `deleteNotification()` - DELETE single
- `bulkDeleteNotifications()` - DELETE multiple
- `getUnreadCount()` - GET unread count

**Internal Functions:**
- `sendNotification()` - Create & dispatch multi-channel notifications
- `sendNotificationEmail()` - Route to email templates
- `sendNotificationSMS()` - Route to SMS templates

**Features:**
- Input validation
- Pagination support
- Filtering (category, read status)
- Error handling
- Multi-channel dispatch coordination

---

### `/src/routes/` - API Routes

#### `routes/notifications.js` (55 lines)
**Express Route Definitions**

**Endpoints:**
```
GET    /                    - List all notifications
GET    /unread-count        - Get unread count
GET    /:id                 - Get single
PUT    /:id/read            - Mark as read
PUT    /:id/unread          - Mark as unread
PUT    /mark-all-read       - Mark all as read
PUT    /:id/archive         - Archive
DELETE /:id                 - Delete single
DELETE /bulk-delete         - Delete multiple
```

**Middleware:** auth (on all routes)

---

### `/src/services/` - Business Logic Services

#### `services/emailService.js` (520 lines)
**Email Notification System with Nodemailer**

**Functions:**
- `initializeTransporter()` - Setup Nodemailer
- `sendEmail()` - Generic email function
- `sendUserConfirmationEmail()` - User signup confirmation
- `sendNewReservationRequestEmail()` - Booking request to host
- `sendReservationConfirmedEmail()` - Booking confirmation
- `sendReservationCancelledEmail()` - Booking cancellation
- `sendPaymentFailedEmail()` - Payment failure
- `sendRefundConfirmationEmail()` - Refund notification
- `sendNewMessageEmail()` - Message notification
- `sendReviewReceivedEmail()` - Review notification

**Email Templates (8 total):**
1. User Confirmation - Registration
2. New Reservation Request - Booking inquiry
3. Reservation Confirmed - Booking accepted
4. Reservation Cancelled - Booking cancelled
5. Payment Failed - Payment error
6. Refund Confirmation - Refund processed
7. New Message - Message received
8. Review Received - New review posted

**Features:**
- SMTP/Gmail support
- Connection verification
- Professional HTML templates
- Responsive design
- Text fallback
- Error handling & logging

#### `services/smsService.js` (160 lines)
**SMS Notification System with Twilio**

**Functions:**
- `initializeTwilio()` - Setup Twilio client
- `sendSMS()` - Generic SMS function
- `sendVerificationCodeSMS()` - 2FA codes
- `sendReservationConfirmationSMS()` - Booking confirmation
- `sendCheckInReminderSMS()` - Arrival reminder
- `sendCheckOutReminderSMS()` - Departure reminder
- `sendNewMessageSMS()` - Message notification
- `sendPaymentFailedSMS()` - Payment alert
- `sendBookingRequestSMS()` - Booking notification

**SMS Templates (7 total):**
1. Verification Code - Two-factor auth
2. Reservation Confirmation - Booking confirmed
3. Check-in Reminder - Arrival day
4. Check-out Reminder - Departure day
5. New Message - Message received
6. Payment Failed - Payment error
7. Booking Request - New booking inquiry

**Features:**
- Twilio API integration
- Character-optimized messages
- International format support
- Error handling & logging

---

### `/src/middleware/` - Request Middleware

#### `middleware/auth.js` (110 lines)
**Authentication & Authorization**

**Functions:**
- `auth` - Required authentication middleware
- `optionalAuth` - Optional authentication
- `webhookAuth` - Webhook secret validation

**Authentication Methods:**
1. Bearer Token (JWT)
2. X-Auth-Token header
3. X-User-Id header (development)
4. Query parameter token

**Features:**
- Multiple authentication strategies
- Fallback mechanisms
- Development mode support
- Error handling

---

### `/src/utils/` - Utility Functions

#### `utils/logger.js` (130 lines)
**Structured Logging System**

**Functions:**
- `error()` - Log errors
- `warn()` - Log warnings
- `info()` - Log information
- `debug()` - Log debug messages
- `logUncaughtError()` - Handle uncaught errors
- `logUnhandledRejection()` - Handle rejected promises

**Log Levels:** error, warn, info, debug

**Output Destinations:**
- `/logs/error.log` - Errors only
- `/logs/warn.log` - Warnings only
- `/logs/info.log` - Info only
- `/logs/debug.log` - Debug only
- `/logs/all.log` - All logs

**Features:**
- Timestamp formatting
- Log rotation ready
- Console + file output
- Configurable log level

#### `utils/eventBus.js` (380 lines)
**RabbitMQ Event-Driven Architecture**

**Functions:**
- `connect()` - Connect to RabbitMQ
- `subscribe()` - Subscribe to events
- `handleEvent()` - Process received event
- `mapEventToNotification()` - Map event data to notification
- `publish()` - Publish events (testing)
- `disconnect()` - Close connection

**Subscribed Events (9 total):**
1. `user.created` → `user_created`
2. `booking.created` → `booking_request`
3. `booking.confirmed` → `booking_confirmed`
4. `booking.cancelled` → `booking_cancelled`
5. `payment.succeeded` → `payment_received`
6. `payment.failed` → `payment_failed`
7. `payment.refunded` → `refund_processed`
8. `message.sent` → `new_message`
9. `review.created` → `review_received`

**Features:**
- Auto-reconnection
- Durable queues
- Message TTL (24h)
- Error handling
- Event data mapping

---

## Documentation Files

### `README.md` (650 lines)
**Complete Service Documentation**

Sections:
1. Features & characteristics
2. Technology stack
3. Installation & setup
4. Configuration guide
5. Running (dev/prod/Docker)
6. API documentation
7. Notification types
8. RabbitMQ events
9. Email templates
10. Health checks
11. Authentication
12. Testing guide
13. Performance & monitoring
14. Deployment (Docker, K8s)
15. Troubleshooting guide

### `IMPLEMENTATION_SUMMARY.md` (550 lines)
**Architecture & Implementation Details**

Sections:
1. Project overview
2. Directory structure
3. Detailed file descriptions
4. Feature implementation
5. Notification types (30+)
6. Event specifications
7. API response formats
8. Authentication methods
9. Performance optimizations
10. Scalability features
11. File statistics
12. Quick commands

### `SETUP_GUIDE.md` (600 lines)
**Step-by-Step Setup & Configuration**

Sections:
1. Quick start
2. Environment configuration
3. Email setup (Gmail, Mailtrap, custom SMTP)
4. Twilio SMS setup
5. Database setup (MongoDB, Atlas)
6. RabbitMQ setup (local, Docker, CloudAMQP)
7. Integration with other services
8. Event publishing examples
9. Event payload formats
10. Docker Compose deployment
11. Kubernetes deployment
12. Monitoring & logging
13. Troubleshooting
14. Performance tuning
15. Testing endpoints

---

## Configuration Files

### `package.json` (65 lines)
**NPM Package Configuration**

**Dependencies (25+):**
- express, mongoose, dotenv
- nodemailer, twilio, axios
- amqplib (RabbitMQ)
- helmet, cors, express-rate-limit
- winston (logging)
- uuid, joi

**Dev Dependencies:**
- nodemon, jest, supertest, eslint

**Scripts:**
- start - Production server
- dev - Development with nodemon
- test - Run tests
- lint - Check code quality

### `.env.example` (50 lines)
**Environment Variable Template**

**Configuration Categories:**
- Server (PORT, HOST, NODE_ENV)
- Database (MONGODB_URI)
- Email (SMTP settings)
- SMS (Twilio)
- RabbitMQ
- JWT & Security
- Frontend URL
- Application settings
- Logging & CORS

### `Dockerfile` (35 lines)
**Docker Container Build**

**Features:**
- Multi-stage build (smaller image)
- Alpine Linux (lightweight)
- Non-root user (security)
- Health checks
- dumb-init (signal handling)
- Production optimized

### `.dockerignore` (20 lines)
**Docker Build Exclusions**

Excludes:
- node_modules, logs, tests
- Git files, environment files
- IDE files, build artifacts
- Package manager files

---

## Quick Reference

### File Statistics
- **Total Files:** 16
- **Total Lines of Code:** ~3,865
- **Documentation Lines:** ~1,800
- **Configuration Files:** 4
- **Source Files:** 10
- **Documentation Files:** 3

### API Endpoints Summary
- 9 notification CRUD endpoints
- 2 utility endpoints (health, metrics)
- 11 total endpoints
- All support pagination & filtering

### Notification Types
- 30+ notification types
- 8 email templates
- 7 SMS templates
- 9 event subscriptions
- 4 notification channels

### Services & Dependencies
- Email: Nodemailer (SMTP)
- SMS: Twilio
- Queue: RabbitMQ
- Database: MongoDB
- Framework: Express.js
- Language: JavaScript/Node.js

---

## Getting Started Checklist

- [ ] Review README.md for overview
- [ ] Check SETUP_GUIDE.md for setup steps
- [ ] Review IMPLEMENTATION_SUMMARY.md for architecture
- [ ] npm install dependencies
- [ ] Configure .env file
- [ ] Set up MongoDB
- [ ] Set up RabbitMQ
- [ ] Configure email provider
- [ ] Configure Twilio (optional)
- [ ] npm run dev to start
- [ ] Test health endpoint
- [ ] Test API endpoints
- [ ] Integrate with other services

---

## Support & Documentation

For questions about specific files or features:

1. **Architecture Questions** → IMPLEMENTATION_SUMMARY.md
2. **Setup Questions** → SETUP_GUIDE.md
3. **API Questions** → README.md
4. **Code Questions** → Inline comments in source files
5. **Configuration Questions** → .env.example
6. **Deployment Questions** → README.md or SETUP_GUIDE.md

---

**Version:** 1.0.0
**Status:** Production Ready
**Last Updated:** 2024-11-17
