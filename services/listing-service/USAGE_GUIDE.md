# Listing Service - Usage Guide

## Quick Start

### 1. Installation

```bash
cd /home/arwa/hometrip-microservices/services/listing-service

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Edit .env with your settings
# Especially configure:
# - MONGODB_URI
# - CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
# - RABBITMQ_URL (if not using default)
```

### 2. Development

```bash
# Start development server with hot reload
npm run dev

# Server runs on http://localhost:4003
# Check health: http://localhost:4003/health
```

### 3. Production

```bash
# Start production server
npm start

# Or with Docker
docker build -t listing-service:latest .
docker run -p 4003:4003 \
  -e MONGODB_URI=mongodb://... \
  -e CLOUDINARY_CLOUD_NAME=... \
  -e CLOUDINARY_API_KEY=... \
  -e CLOUDINARY_API_SECRET=... \
  listing-service:latest
```

## API Examples

### Authentication Headers

All protected endpoints require these headers from the API Gateway:
```
x-user-id: 507f1f77bcf86cd799439011
x-user-email: user@example.com
x-user-role: host
```

### 1. Create a Listing

```bash
curl -X POST http://localhost:4003/listings \
  -H "Content-Type: application/json" \
  -H "x-user-id: 507f1f77bcf86cd799439011" \
  -H "x-user-email: host@example.com" \
  -d '{
    "title": "Cozy Apartment in Paris",
    "description": "Beautiful 2-bedroom apartment in the heart of Paris",
    "structure": "Appartement",
    "propertyType": "entire",
    "price": 150,
    "guests": 4,
    "bedrooms": 2,
    "beds": 2,
    "bathrooms": 1,
    "cleaningFee": 30,
    "address": {
      "street": "123 Rue de la Paix",
      "zipCode": "75001",
      "city": "Paris",
      "country": "France"
    },
    "amenities": ["WiFi", "Kitchen", "TV", "Parking"],
    "petsAllowed": true,
    "instantBooking": false,
    "houseRules": {
      "checkInTime": "15:00",
      "checkOutTime": "11:00",
      "smokingAllowed": false,
      "partiesAllowed": false,
      "childrenAllowed": true
    },
    "stayRequirements": {
      "minimumNights": 2,
      "maximumNights": 90,
      "advanceNotice": 1,
      "preparationTime": 1
    }
  }'
```

Response:
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "title": "Cozy Apartment in Paris",
  "description": "Beautiful 2-bedroom apartment...",
  "structure": "Appartement",
  "propertyType": "entire",
  "price": 150,
  "serviceFee": 21,
  "totalWithFees": 176,
  "isActive": false,
  "isPublished": false,
  "host": "507f1f77bcf86cd799439011",
  "location": "123 Rue De La Paix, 75001 Paris, France",
  "lat": 48.8566,
  "lng": 2.3522,
  "createdAt": "2024-01-10T10:30:00Z"
}
```

### 2. Search Listings

```bash
# Basic search
curl "http://localhost:4003/listings?location=Paris&minPrice=100&maxPrice=200"

# Advanced search
curl "http://localhost:4003/listings/search?location=Paris&guests=2&bedrooms=2&propertyType=entire&minPrice=100&maxPrice=200&sortBy=price-asc&page=1&limit=10"
```

Response:
```json
{
  "success": true,
  "data": {
    "listings": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "title": "Cozy Apartment in Paris",
        "price": 150,
        "location": "123 Rue De La Paix, 75001 Paris, France",
        "guests": 4,
        "bedrooms": 2,
        "bathrooms": 1,
        "averageRating": 4.8,
        "reviewCount": 24,
        "images": ["url1", "url2"],
        "host": {
          "_id": "507f1f77bcf86cd799439011",
          "fullName": "Jean Dupont",
          "email": "host@example.com",
          "avatar": "url",
          "isSuperhost": true
        }
      }
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "limit": 10,
      "pages": 5,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

### 3. Get Listing Details

```bash
curl http://localhost:4003/listings/507f1f77bcf86cd799439012
```

### 4. Get Host's Listings

```bash
curl http://localhost:4003/listings/my-listings \
  -H "x-user-id: 507f1f77bcf86cd799439011" \
  -H "x-user-email: host@example.com"
```

### 5. Update Listing

```bash
curl -X PUT http://localhost:4003/listings/507f1f77bcf86cd799439012 \
  -H "Content-Type: application/json" \
  -H "x-user-id: 507f1f77bcf86cd799439011" \
  -H "x-user-email: host@example.com" \
  -d '{
    "price": 175,
    "discounts": {
      "weekly": 10,
      "monthly": 15
    }
  }'
```

### 6. Upload Photos

```bash
curl -X POST http://localhost:4003/listings/507f1f77bcf86cd799439012/photos \
  -H "x-user-id: 507f1f77bcf86cd799439011" \
  -H "x-user-email: host@example.com" \
  -F "photos=@/path/to/photo1.jpg" \
  -F "photos=@/path/to/photo2.jpg" \
  -F "photos=@/path/to/photo3.jpg"
```

Response:
```json
{
  "message": "Photos téléchargées avec succès",
  "images": [
    "https://res.cloudinary.com/.../photo1.jpg",
    "https://res.cloudinary.com/.../photo2.jpg",
    "https://res.cloudinary.com/.../photo3.jpg"
  ],
  "listing": { ... }
}
```

### 7. Publish Listing

```bash
curl -X PATCH http://localhost:4003/listings/507f1f77bcf86cd799439012/toggle-active \
  -H "x-user-id: 507f1f77bcf86cd799439011" \
  -H "x-user-email: host@example.com"
```

### 8. Block Dates

```bash
curl -X POST http://localhost:4003/listings/507f1f77bcf86cd799439012/block-dates \
  -H "Content-Type: application/json" \
  -H "x-user-id: 507f1f77bcf86cd799439011" \
  -H "x-user-email: host@example.com" \
  -d '{
    "startDate": "2024-03-15",
    "endDate": "2024-03-20",
    "reason": "Personal use"
  }'
```

### 9. Check Availability

```bash
curl "http://localhost:4003/listings/507f1f77bcf86cd799439012/availability?startDate=2024-04-01&endDate=2024-04-10"
```

Response:
```json
{
  "listingId": "507f1f77bcf86cd799439012",
  "available": true,
  "blockedDates": []
}
```

### 10. Delete Photo

```bash
curl -X DELETE "http://localhost:4003/listings/507f1f77bcf86cd799439012/photos/https%3A%2F%2Fres.cloudinary.com%2F...%2Fphoto1.jpg" \
  -H "x-user-id: 507f1f77bcf86cd799439011" \
  -H "x-user-email: host@example.com"
```

### 11. Delete Listing

```bash
curl -X DELETE http://localhost:4003/listings/507f1f77bcf86cd799439012 \
  -H "x-user-id: 507f1f77bcf86cd799439011" \
  -H "x-user-email: host@example.com"
```

## Event Examples

### Listing Created Event

Published to `hometrip_events` exchange with routing key `listing.created`:

```json
{
  "eventName": "listing.created",
  "data": {
    "listingId": "507f1f77bcf86cd799439012",
    "host": "507f1f77bcf86cd799439011",
    "title": "Cozy Apartment in Paris",
    "price": 150,
    "timestamp": "2024-01-10T10:30:00Z"
  },
  "timestamp": "2024-01-10T10:30:00Z",
  "service": "listing-service"
}
```

### Listing Updated Event

```json
{
  "eventName": "listing.updated",
  "data": {
    "listingId": "507f1f77bcf86cd799439012",
    "host": "507f1f77bcf86cd799439011",
    "title": "Cozy Apartment in Paris",
    "timestamp": "2024-01-10T11:30:00Z"
  },
  "timestamp": "2024-01-10T11:30:00Z",
  "service": "listing-service"
}
```

### Listing Published Event

```json
{
  "eventName": "listing.published",
  "data": {
    "listingId": "507f1f77bcf86cd799439012",
    "host": "507f1f77bcf86cd799439011",
    "title": "Cozy Apartment in Paris",
    "timestamp": "2024-01-10T12:30:00Z"
  },
  "timestamp": "2024-01-10T12:30:00Z",
  "service": "listing-service"
}
```

## Query Parameters Reference

### Search Endpoints
- `location` (string) - City, country, street, or title
- `guests` (number) - Minimum guests
- `minPrice` (number) - Minimum price per night
- `maxPrice` (number) - Maximum price per night
- `structure` (string) - Property structure type
- `propertyType` (string) - entire, private, or shared
- `minBedrooms` (number) - Minimum bedrooms
- `minBathrooms` (number) - Minimum bathrooms
- `minRating` (number) - Minimum average rating (0-5)
- `page` (number) - Page number, default: 1
- `limit` (number) - Results per page, default: 20
- `sortBy` (string) - newest, price-asc, price-desc, or rating

### Sort Options
- `newest` - Most recently created (default)
- `price-asc` - Lowest price first
- `price-desc` - Highest price first
- `rating` - Highest rating first

## Request Body Examples

### Complete Listing Data

```json
{
  "title": "Luxury Villa with Pool",
  "description": "Spacious 5-bedroom villa with private pool and garden",
  "structure": "Villa",
  "propertyType": "entire",
  "price": 500,
  "cleaningFee": 100,
  "guests": 10,
  "bedrooms": 5,
  "beds": 6,
  "bathrooms": 3,
  "address": {
    "streetNumber": "123",
    "street": "Rue de la Côte",
    "zipCode": "06110",
    "city": "Cannes",
    "country": "France",
    "fullAddress": "123 Rue de la Côte, 06110 Cannes, France"
  },
  "amenities": [
    "WiFi",
    "Kitchen",
    "Parking",
    "Pool",
    "Garden",
    "Air Conditioning"
  ],
  "accessibleFeatures": [
    "Wheelchair accessible",
    "Accessible bathroom"
  ],
  "petsAllowed": true,
  "instantBooking": true,
  "selfCheckIn": true,
  "freeParking": true,
  "houseRules": {
    "checkInTime": "16:00",
    "checkOutTime": "10:00",
    "smokingAllowed": false,
    "partiesAllowed": false,
    "childrenAllowed": true,
    "additionalRules": [
      "No loud noise after 22:00",
      "No pets in bedrooms"
    ]
  },
  "stayRequirements": {
    "minimumNights": 3,
    "maximumNights": 180,
    "advanceNotice": 7,
    "preparationTime": 2
  },
  "discounts": {
    "weekly": 10,
    "monthly": 20
  },
  "seasonalPricing": [
    {
      "name": "High Season",
      "startDate": "2024-07-01",
      "endDate": "2024-08-31",
      "pricePerNight": 650,
      "minimumStay": 7
    }
  ],
  "cancellationPolicy": {
    "type": "moderate",
    "details": {
      "moderate": {
        "fullRefundDays": 5,
        "partialRefundDays": 1,
        "partialRefundPercent": 50
      }
    }
  }
}
```

## Health & Monitoring

### Check Service Health

```bash
curl http://localhost:4003/health
```

Response:
```json
{
  "status": "healthy",
  "service": "listing-service",
  "version": "1.0.0",
  "timestamp": "2024-01-10T10:30:00Z"
}
```

### Check Service Readiness

```bash
curl http://localhost:4003/ready
```

Response:
```json
{
  "status": "ready",
  "service": "listing-service"
}
```

### Get Service Metrics

```bash
curl http://localhost:4003/metrics
```

Response:
```json
{
  "service": "listing-service",
  "uptime": 3600.5,
  "memory": {
    "rss": 50000000,
    "heapTotal": 30000000,
    "heapUsed": 15000000,
    "external": 1000000,
    "arrayBuffers": 500000
  },
  "timestamp": "2024-01-10T10:30:00Z"
}
```

## Troubleshooting

### MongoDB Connection Issues
- Verify `MONGODB_URI` is correct
- Check MongoDB service is running
- Ensure authentication credentials are valid

### Cloudinary Upload Fails
- Verify `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Check file size is under 10MB
- Ensure file is a valid image format

### RabbitMQ Events Not Publishing
- Verify `RABBITMQ_URL` is correct
- Check RabbitMQ service is running
- Check service is connected: `GET /ready` should return status "ready"

### Rate Limiting
- Default: 100 requests per 15 minutes
- Adjust with `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS`

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

## Logging

View logs in:
- Console (development)
- `logs/combined.log` (all logs)
- `logs/error.log` (errors only)

Adjust log level with `LOG_LEVEL` env var:
- debug
- info (default)
- warn
- error

## Next Steps

1. Configure environment variables
2. Test API endpoints with provided examples
3. Integrate with API Gateway
4. Set up RabbitMQ for event publishing
5. Configure Cloudinary for image storage
6. Deploy with Docker
7. Monitor health and metrics
