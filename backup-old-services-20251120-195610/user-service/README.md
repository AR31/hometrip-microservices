# User Service

User profile management, favorites, identity verification, and device management microservice for HomeTrip platform.

## Overview

The User Service handles:
- User profile management (GET, PUT operations)
- User favorites management (GET, POST, DELETE)
- Identity verification (email, phone, document, selfie)
- User settings and preferences
- Device management (registration, tracking, removal)
- Event-driven architecture with RabbitMQ

## Architecture

- **Port**: 4002
- **Database**: MongoDB (user_db)
- **Message Queue**: RabbitMQ
- **Authentication**: JWT tokens via Authorization header or custom headers

## API Endpoints

### User Profile

#### Get User Profile
```
GET /users/:id
```
Get a user's profile information (public, no auth required).

#### Get Current User Profile
```
GET /users/me
Authorization: Bearer {token}
```
Get authenticated user's profile with full details.

#### Update User Profile
```
PUT /users/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "fullName": "John Doe",
  "bio": "Travel enthusiast",
  "phoneNumber": "+33612345678",
  "dateOfBirth": "1990-01-01",
  "address": {
    "street": "123 Rue de Paris",
    "city": "Paris",
    "state": "Île-de-France",
    "zipCode": "75001",
    "country": "France"
  }
}
```

#### Delete User Account
```
DELETE /users/:id
Authorization: Bearer {token}
```
Delete user account permanently.

### Favorites Management

#### Get User Favorites
```
GET /users/:id/favorites
Authorization: Bearer {token}
```
Get all favorite listings for a user.

#### Add to Favorites
```
POST /users/:id/favorites/:listingId
Authorization: Bearer {token}
```
Add a listing to user's favorites.

#### Remove from Favorites
```
DELETE /users/:id/favorites/:listingId
Authorization: Bearer {token}
```
Remove a listing from user's favorites.

### Identity Verification

#### Verify Identity
```
POST /users/:id/verify-identity
Authorization: Bearer {token}
Content-Type: application/json

{
  "documentType": "passport",
  "documentUrl": "https://example.com/document.jpg",
  "verificationMethod": "identity" | "selfie" | "phone"
}
```
Verify user identity with document or selfie.

#### Get Verification Status
```
GET /users/:id/verification-status
Authorization: Bearer {token}
```
Get current verification status for a user.

Response:
```json
{
  "success": true,
  "data": {
    "isVerified": true,
    "verificationStatus": {
      "email": true,
      "phone": true,
      "identity": true,
      "selfie": false
    }
  }
}
```

### Settings & Preferences

#### Update User Settings
```
PUT /users/:id/settings
Authorization: Bearer {token}
Content-Type: application/json

{
  "notifications": {
    "email": true,
    "push": true,
    "sms": false,
    "marketing": false
  },
  "preferences": {
    "language": "fr",
    "currency": "EUR",
    "theme": "dark"
  }
}
```

### Device Management

#### Get User Devices
```
GET /users/:id/devices
Authorization: Bearer {token}
```
Get all registered devices for a user.

#### Register Device
```
POST /users/:id/devices
Authorization: Bearer {token}
Content-Type: application/json

{
  "deviceId": "device-uuid",
  "deviceName": "iPhone 14",
  "deviceType": "mobile",
  "browser": "Safari",
  "os": "iOS 16.0",
  "ipAddress": "192.168.1.1"
}
```
Register or update a device.

#### Remove Device
```
DELETE /users/:id/devices/:deviceId
Authorization: Bearer {token}
```
Remove a registered device.

## Events

### Published Events

#### user.updated
```json
{
  "eventName": "user.updated",
  "data": {
    "userId": "user_id",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "host"
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "service": "user-service"
}
```

#### user.deleted
```json
{
  "eventName": "user.deleted",
  "data": {
    "userId": "user_id",
    "email": "user@example.com",
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "service": "user-service"
}
```

#### favorite.added
```json
{
  "eventName": "favorite.added",
  "data": {
    "userId": "user_id",
    "listingId": "listing_id",
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "service": "user-service"
}
```

#### favorite.removed
```json
{
  "eventName": "favorite.removed",
  "data": {
    "userId": "user_id",
    "listingId": "listing_id",
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "service": "user-service"
}
```

### Subscribed Events

#### user.created (from auth-service)
Automatically syncs user data when a new user is created in the auth-service.

## Authentication

The service supports two authentication methods:

### 1. JWT Token (Primary)
```
Authorization: Bearer {jwt_token}
```

### 2. Custom Headers (Inter-service Communication)
```
x-user-id: user_id
x-user-email: user@example.com
x-user-role: host
```

These headers should be used for service-to-service communication via API gateway or service mesh.

## Setup & Installation

### Prerequisites
- Node.js 18+
- MongoDB
- RabbitMQ
- Docker (optional)

### Local Development

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the service**
   ```bash
   npm run dev
   ```

### Docker Deployment

1. **Build Docker image**
   ```bash
   docker build -t hometrip/user-service:latest .
   ```

2. **Run container**
   ```bash
   docker run -d \
     -e NODE_ENV=production \
     -e MONGODB_URI=mongodb://hometrip:pass@mongodb:27017/user_db \
     -e JWT_SECRET=your-secret \
     -e RABBITMQ_URL=amqp://hometrip:pass@rabbitmq:5672 \
     -p 4002:4002 \
     hometrip/user-service:latest
   ```

## Health Checks

### Liveness Check
```
GET /health
```
Returns 200 if service is running.

### Readiness Check
```
GET /ready
```
Returns 200 if all dependencies (RabbitMQ, MongoDB) are ready.

### Metrics
```
GET /metrics
```
Returns service metrics (uptime, memory usage).

## Project Structure

```
user-service/
├── src/
│   ├── config/
│   │   ├── index.js           # Configuration management
│   │   └── database.js        # MongoDB connection
│   ├── controllers/
│   │   └── userController.js  # Business logic
│   ├── middleware/
│   │   └── auth.js            # JWT authentication
│   ├── models/
│   │   └── User.js            # User schema
│   ├── routes/
│   │   └── users.js           # Route definitions
│   ├── utils/
│   │   ├── logger.js          # Winston logger
│   │   └── eventBus.js        # RabbitMQ event bus
│   └── index.js               # Application entry point
├── logs/                      # Log files
├── Dockerfile
├── .dockerignore
├── .env.example
├── package.json
└── README.md
```

## Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "message": "Error description",
  "details": "Additional information (development only)"
}
```

Common error codes:
- 400: Bad request
- 401: Unauthorized (authentication required)
- 403: Forbidden (insufficient permissions)
- 404: Not found
- 500: Server error

## Best Practices

1. **Always use HTTPS** in production
2. **Validate all inputs** on both client and server
3. **Use rate limiting** to prevent abuse
4. **Implement proper logging** for debugging
5. **Handle errors gracefully** with meaningful messages
6. **Test all endpoints** before deployment

## Dependencies

- **express**: Web framework
- **mongoose**: MongoDB ODM
- **jsonwebtoken**: JWT authentication
- **bcryptjs**: Password hashing
- **amqplib**: RabbitMQ client
- **winston**: Logging
- **express-validator**: Input validation
- **cors**: Cross-origin resource sharing
- **helmet**: Security headers

## Development

### Run Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Linting
```bash
npm run lint
```

### Watch Mode (Development)
```bash
npm run dev
```

## Contributing

1. Follow the existing code structure
2. Add tests for new features
3. Update documentation
4. Use meaningful commit messages

## License

MIT

## Support

For issues or questions, please contact the HomeTrip development team.
