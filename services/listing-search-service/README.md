# Listing Service

A comprehensive microservice for managing property listings in the HomeTrip platform.

## Overview

The Listing Service handles all operations related to property listings including:

- CRUD operations (Create, Read, Update, Delete)
- Photo/media management with Cloudinary integration
- Availability and calendar management
- Amenities and features management
- Pricing rules and seasonal pricing
- Listing publication and activation

## Features

### Core Functionality
- Create, read, update, and delete listings
- Advanced search with multiple filters
- Publish/unpublish listings
- Activate/deactivate listings
- Photo uploads to Cloudinary
- Availability management with blocked dates

### Pricing Management
- Base pricing per night
- Service fees (14% default)
- Fixed taxes (5 default)
- Cleaning fees
- Weekly/monthly discounts
- Seasonal pricing
- Custom pricing for specific dates

### Search Capabilities
- Filter by location, price range, guests
- Filter by property type and structure
- Filter by amenities and features
- Search by rating
- Sort by price, rating, or newest
- Pagination support

### Photo Management
- Upload multiple photos to Cloudinary
- Delete photos
- Automatic cleanup on listing deletion

### Listing Details
- Property structure (Appartement, Maison, Villa, etc.)
- Property type (entire, private, shared)
- Room information (bedrooms, beds, bathrooms)
- Guest capacity
- Amenities and accessible features
- House rules
- Cancellation policies
- Stay requirements

## API Endpoints

### Listings

#### Search/Get All Listings
```
GET /listings
GET /listings/search
```
Query Parameters:
- `location` - Search by city, country, street, or title
- `guests` - Minimum guests
- `minPrice` - Minimum price
- `maxPrice` - Maximum price
- `structure` - Property structure type
- `propertyType` - entire, private, or shared
- `minBedrooms` - Minimum bedrooms
- `minBathrooms` - Minimum bathrooms
- `minRating` - Minimum rating
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `sortBy` - newest, price-asc, price-desc, rating

#### Get Listing by ID
```
GET /listings/:id
```

#### Create Listing
```
POST /listings
Headers: x-user-id, x-user-email (from API Gateway)
Body:
{
  "title": "Beautiful Apartment",
  "description": "A cozy apartment in the city center",
  "structure": "Appartement",
  "propertyType": "entire",
  "price": 100,
  "guests": 2,
  "bedrooms": 1,
  "beds": 1,
  "bathrooms": 1,
  "address": {
    "street": "123 Main Street",
    "zipCode": "75001",
    "city": "Paris",
    "country": "France"
  },
  "amenities": ["WiFi", "Kitchen", "TV"],
  "images": []
}
```

#### Get Host's Listings
```
GET /listings/my-listings
Headers: x-user-id, x-user-email
```

#### Update Listing
```
PUT /listings/:id
Headers: x-user-id, x-user-email
Body: Listing fields to update
```

#### Toggle Listing Active Status
```
PATCH /listings/:id/toggle-active
Headers: x-user-id, x-user-email
```

#### Delete Listing
```
DELETE /listings/:id
Headers: x-user-id, x-user-email
```

### Photos

#### Upload Photos
```
POST /listings/:id/photos
Headers: x-user-id, x-user-email
Content-Type: multipart/form-data
Body: Multiple images in "photos" field (max 10 files, 10MB each)
```

#### Delete Photo
```
DELETE /listings/:listingId/photos/:imageUrl
Headers: x-user-id, x-user-email
```

### Availability

#### Get Availability
```
GET /listings/:id/availability
Query: startDate, endDate (ISO 8601)
```

#### Block Dates
```
POST /listings/:id/block-dates
Headers: x-user-id, x-user-email
Body:
{
  "startDate": "2024-01-15",
  "endDate": "2024-01-20",
  "reason": "Personal use"
}
```

## Events Published

The service publishes the following events via RabbitMQ:

- `listing.created` - When a new listing is created
- `listing.updated` - When a listing is updated
- `listing.deleted` - When a listing is deleted
- `listing.published` - When a listing is activated
- `listing.unpublished` - When a listing is deactivated

Event payload example:
```json
{
  "eventName": "listing.created",
  "data": {
    "listingId": "507f1f77bcf86cd799439011",
    "host": "507f1f77bcf86cd799439012",
    "title": "Beautiful Apartment",
    "price": 100,
    "timestamp": "2024-01-10T10:30:00Z"
  },
  "timestamp": "2024-01-10T10:30:00Z",
  "service": "listing-service"
}
```

## Environment Variables

```env
# Application
NODE_ENV=development
PORT=4003
SERVICE_HOST=0.0.0.0

# MongoDB
MONGODB_URI=mongodb://user:pass@host:27017/listing_db

# RabbitMQ
RABBITMQ_URL=amqp://user:pass@host:5672

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# Logging
LOG_LEVEL=info
```

## Installation

```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev

# Start production server
npm start

# Run tests
npm test
```

## Database Schema

### Listing Model

```javascript
{
  title: String,                          // Required
  description: String,                    // Required
  structure: String,                      // Enum: various property types
  propertyType: String,                   // Enum: entire, private, shared
  price: Number,                          // Base price per night
  serviceFee: Number,                     // Calculated fee
  totalWithFees: Number,                  // Total with fees
  cleaningFee: Number,                    // Optional cleaning fee

  // Pricing
  discounts: {
    weekly: Number,                       // % discount for 7+ nights
    monthly: Number                       // % discount for 28+ nights
  },
  seasonalPricing: [{
    name: String,
    startDate: Date,
    endDate: Date,
    pricePerNight: Number,
    minimumStay: Number
  }],
  customPricing: [{
    date: Date,
    pricePerNight: Number,
    reason: String
  }],

  // Location
  location: String,
  lat: Number,
  lng: Number,
  address: {
    streetNumber: String,
    street: String,
    zipCode: String,
    city: String,
    country: String,
    fullAddress: String
  },

  // Details
  images: [String],                       // Cloudinary URLs
  guests: Number,
  bedrooms: Number,
  beds: Number,
  bathrooms: Number,
  amenities: [String],
  accessibleFeatures: [String],

  // Rules
  petsAllowed: Boolean,
  instantBooking: Boolean,
  selfCheckIn: Boolean,
  freeParking: Boolean,

  houseRules: {
    checkInTime: String,
    checkOutTime: String,
    smokingAllowed: Boolean,
    partiesAllowed: Boolean,
    childrenAllowed: Boolean,
    additionalRules: [String]
  },

  stayRequirements: {
    minimumNights: Number,
    maximumNights: Number,
    advanceNotice: Number,
    preparationTime: Number
  },

  // Availability
  blockedDates: [{
    startDate: Date,
    endDate: Date,
    reason: String
  }],

  // Cancellation
  cancellationPolicy: {
    type: String,
    details: Object
  },

  // Status
  isActive: Boolean,
  isPublished: Boolean,
  host: ObjectId,                         // Reference to User

  // Ratings
  averageRating: Number,
  reviewCount: Number,

  // Metadata
  createdAt: Date,
  updatedAt: Date
}
```

## Docker

Build and run with Docker:

```bash
# Build image
docker build -t listing-service:latest .

# Run container
docker run -p 4003:4003 \
  -e MONGODB_URI=mongodb://user:pass@mongodb:27017/listing_db \
  -e CLOUDINARY_CLOUD_NAME=your_cloud_name \
  -e CLOUDINARY_API_KEY=your_api_key \
  -e CLOUDINARY_API_SECRET=your_api_secret \
  listing-service:latest
```

## Health Checks

The service provides health check endpoints:

- `GET /health` - Basic health status
- `GET /ready` - Readiness check (checks RabbitMQ connection)
- `GET /metrics` - Service metrics (uptime, memory usage)

## Authentication

The service expects authentication headers from the API Gateway:

- `x-user-id` - User ID
- `x-user-email` - User email
- `x-user-role` - User role (optional)

These headers are typically set by the API Gateway after verifying the JWT token.

## Integration with Other Services

### API Gateway
The Listing Service is called through the API Gateway at `/api/listings/*`

### Auth Service
User authentication is handled by the Auth Service. The API Gateway validates JWTs and forwards user info via headers.

### Event Bus (RabbitMQ)
Events are published to RabbitMQ for other services to consume:
- Reservation Service listens to `listing.published` and `listing.unpublished`
- Review Service may listen to `listing.deleted`
- Notification Service may listen to all listing events

## Performance Optimizations

- Database indexes on frequently queried fields
- Request compression with gzip
- Rate limiting to prevent abuse
- Lean queries for read operations
- Connection pooling for MongoDB
- Cloudinary integration for efficient image handling

## Error Handling

The service implements comprehensive error handling:
- Input validation with express-validator
- MongoDB error handling
- Cloudinary upload error handling
- Graceful error responses
- Detailed logging for debugging

## Development

### Running Tests
```bash
npm test
npm run test:watch
```

### Code Quality
```bash
npm run lint
```

### Logs
Logs are written to:
- Console (development)
- `logs/combined.log` (all logs)
- `logs/error.log` (error logs only)

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and lint
4. Commit with clear messages
5. Create a pull request

## License

MIT
