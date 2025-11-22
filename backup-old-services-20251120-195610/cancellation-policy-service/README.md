# Experience Service

Experience and Activity management microservice for the HomeTrip platform.

## Overview

The Experience Service handles all operations related to experiences (activities, tours, workshops) and their bookings. It provides a complete API for hosts to create and manage experiences, and for guests to discover and book them.

## Features

- ✅ **Experience Management**
  - Create, read, update, delete experiences
  - 10 categories: food, art, nature, sports, wellness, culture, adventure, entertainment, workshop, sightseeing
  - Multi-language support
  - Activity level classification (easy, moderate, challenging, extreme)
  - Online and in-person experiences
  - Age restrictions and capacity management

- ✅ **Booking System**
  - Book experiences with participant details
  - Real-time availability checking
  - Dynamic pricing based on participants
  - Multiple cancellation policies (flexible, moderate, strict)
  - Automatic refund calculation
  - Host confirmation workflow

- ✅ **Search & Filtering**
  - Filter by category, city, country
  - Price range filtering
  - Activity level and language filtering
  - Date availability filtering
  - Rating-based filtering
  - Sorting options

- ✅ **Reviews & Ratings**
  - Integrated with Review Service
  - Average rating calculation
  - Review count tracking

## Technology Stack

- **Framework**: Express.js 4.18.2
- **Database**: MongoDB with Mongoose 7.6.3
- **Message Queue**: RabbitMQ (amqplib)
- **Cache**: Redis 4.6.10
- **API Documentation**: Swagger/OpenAPI
- **Logging**: Winston 3.11.0
- **Validation**: express-validator 7.0.1
- **Security**: Helmet 7.0.0, JWT

## API Endpoints

### Experiences

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/experiences` | Create experience | Host |
| GET | `/api/experiences` | List experiences with filters | Public |
| GET | `/api/experiences/:id` | Get experience details | Public |
| PUT | `/api/experiences/:id` | Update experience | Host |
| DELETE | `/api/experiences/:id` | Delete experience | Host |
| GET | `/api/experiences/host/my` | Get host's experiences | Host |
| GET | `/api/experiences/host/:hostId` | Get experiences by host | Public |

### Experience Bookings

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/experience-bookings` | Create booking | User |
| GET | `/api/experience-bookings/my` | Get user's bookings | User |
| GET | `/api/experience-bookings/host/all` | Get host's bookings | Host |
| GET | `/api/experience-bookings/:id` | Get booking details | User/Host |
| PUT | `/api/experience-bookings/:id/cancel` | Cancel booking | User |
| PUT | `/api/experience-bookings/:id/confirm` | Confirm booking | Host |
| PUT | `/api/experience-bookings/:id/complete` | Complete booking | Host |

## Database Models

### Experience

```javascript
{
  title: String,
  description: String,
  category: String, // 10 categories
  host: String, // User ID
  location: {
    city: String,
    country: String,
    address: String,
    coordinates: { lat: Number, lng: Number }
  },
  images: [String], // Max 10
  duration: Number, // minutes (30-1440)
  capacity: { min: Number, max: Number },
  pricePerPerson: Number,
  currency: String, // EUR, USD, GBP, CHF
  languages: [String],
  activityLevel: String, // easy, moderate, challenging, extreme
  ageRestriction: { min: Number, max: Number },
  included: [String],
  toBring: [String],
  cancellationPolicy: String, // flexible, moderate, strict
  availability: [{
    date: Date,
    startTime: String,
    endTime: String,
    availableSpots: Number
  }],
  isActive: Boolean,
  isOnline: Boolean,
  averageRating: Number,
  totalReviews: Number
}
```

### ExperienceBooking

```javascript
{
  experience: ObjectId,
  user: String, // User ID
  host: String, // Host ID
  date: Date,
  startTime: String,
  endTime: String,
  numberOfParticipants: Number,
  participantDetails: [{
    name: String,
    age: Number,
    email: String
  }],
  totalPrice: Number,
  currency: String,
  status: String, // pending, confirmed, completed, cancelled, declined
  paymentIntentId: String,
  specialRequests: String,
  cancellationReason: String,
  refundAmount: Number
}
```

## Events Published

- `experience.created` - New experience created
- `experience.updated` - Experience updated
- `experience.deleted` - Experience deleted
- `experience.viewed` - Experience viewed
- `experience.booking.created` - Booking created
- `experience.booking.confirmed` - Booking confirmed by host
- `experience.booking.completed` - Booking completed
- `experience.booking.cancelled` - Booking cancelled

## Events Subscribed

- `booking.completed` - Trigger review requests
- `user.deleted` - Handle user deletion (anonymize data)

## Environment Variables

```bash
PORT=4011
NODE_ENV=development
SERVICE_NAME=experience-service

MONGO_URI=mongodb://mongodb:27017/experience_db
JWT_SECRET=your_jwt_secret_here

RABBITMQ_URL=amqp://rabbitmq:5672
REDIS_HOST=redis
REDIS_PORT=6379

CONSUL_HOST=consul
CONSUL_PORT=8500

API_GATEWAY_URL=http://api-gateway:3001
USER_SERVICE_URL=http://user-service:4002
NOTIFICATION_SERVICE_URL=http://notification-service:4009
```

## Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Run in development
npm run dev

# Run in production
npm start

# Run tests
npm test
```

## Docker

```bash
# Build image
docker build -t hometrip/experience-service:latest .

# Run container
docker run -p 4011:4011 --env-file .env hometrip/experience-service:latest
```

## API Documentation

Once the service is running, access the Swagger documentation at:
- http://localhost:4011/api-docs

## Health Checks

- **Health**: `GET /health` - Basic health check
- **Readiness**: `GET /ready` - Check database and RabbitMQ connections

## Cancellation Policies

### Flexible
- Full refund anytime before experience

### Moderate
- Full refund: 24+ hours before
- 50% refund: 12-24 hours before
- No refund: < 12 hours before

### Strict
- Full refund: 7+ days before
- No refund: < 7 days before

## Database Indexes

For optimal performance, the following indexes are created:

**Experience Collection:**
- `{ host: 1, createdAt: -1 }`
- `{ category: 1, isActive: 1 }`
- `{ 'location.city': 1, 'location.country': 1 }`
- `{ averageRating: -1 }`
- `{ pricePerPerson: 1 }`

**ExperienceBooking Collection:**
- `{ experience: 1, date: 1 }`
- `{ user: 1, status: 1, createdAt: -1 }`
- `{ host: 1, status: 1, createdAt: -1 }`
- `{ status: 1, date: 1 }`

## License

MIT
