# Search Service

Advanced search and full-text indexing microservice for HomeTrip. Handles listing searches, autocomplete suggestions, popular destinations, and search history tracking.

## Overview

The Search Service provides comprehensive search capabilities for the HomeTrip platform:

- **Full-text Search**: Fast, scalable search powered by Elasticsearch
- **Advanced Filters**: Filter by price, location, amenities, property type, and more
- **Autocomplete**: Real-time suggestions as users type
- **Popular Destinations**: Trending locations based on search patterns
- **Search History**: Track user searches for personalization and analytics
- **Event-driven Sync**: Automatic index updates when listings are created, updated, or deleted

## Architecture

### Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Search Engine**: Elasticsearch 8+
- **Database**: MongoDB (search history)
- **Message Queue**: RabbitMQ (event bus)
- **Logging**: Winston
- **Validation**: express-validator

### Service Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/search` | Advanced search with filters | Optional |
| GET | `/search/autocomplete?q=...` | Autocomplete suggestions | Optional |
| GET | `/search/popular` | Popular destinations | Optional |
| GET | `/search/filters` | Available filter options | Optional |
| GET | `/search/history` | User search history | Required |
| DELETE | `/search/history` | Clear search history | Required |
| GET | `/health` | Health check | None |
| GET | `/ready` | Readiness check | None |
| GET | `/metrics` | Service metrics | None |

## Setup & Installation

### Prerequisites

- Node.js 18+
- MongoDB running
- Elasticsearch 8+ running
- RabbitMQ running
- Environment variables configured

### Installation

1. Navigate to service directory:
```bash
cd /home/arwa/hometrip-microservices/services/search-service
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

### Environment Variables

```env
# Application
NODE_ENV=development
PORT=4010
SERVICE_HOST=0.0.0.0

# MongoDB (for search history)
MONGODB_URI=mongodb://hometrip:hometrip_mongo_pass@mongodb:27017/search_db?authSource=admin

# Elasticsearch
ELASTICSEARCH_URL=http://elasticsearch:9200
ELASTICSEARCH_INDEX=listings

# RabbitMQ (event bus)
RABBITMQ_URL=amqp://hometrip:hometrip_rabbitmq_pass@rabbitmq:5672

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# CORS Origins
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# Logging
LOG_LEVEL=info
```

## Running the Service

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Docker
```bash
docker build -t search-service .
docker run -p 4010:4010 \
  --env-file .env \
  --network hometrip-network \
  search-service
```

## API Documentation

### 1. Search Listings

**Endpoint**: `GET /search`

**Parameters**:
- `q` (string, optional): Free-text search query
- `location` (string, optional): Location search (city, address)
- `city` (string, optional): Filter by city
- `country` (string, optional): Filter by country
- `minPrice` (number, optional): Minimum price
- `maxPrice` (number, optional): Maximum price
- `guests` (number, optional): Minimum number of guests
- `bedrooms` (number, optional): Minimum bedrooms
- `beds` (number, optional): Minimum beds
- `bathrooms` (number, optional): Minimum bathrooms
- `structure` (string, optional): Property type
- `propertyType` (string, optional): Property type
- `amenities` (string, optional): Comma-separated amenities
- `petsAllowed` (boolean, optional): Filter by pet policy
- `instantBooking` (boolean, optional): Only instant booking
- `selfCheckIn` (boolean, optional): Only self check-in
- `freeParking` (boolean, optional): Only free parking
- `topRated` (boolean, optional): Only top-rated
- `sortBy` (string, optional): Sort option (relevance, price-asc, price-desc, rating, popular, newest)
- `page` (number, default: 1): Page number
- `limit` (number, default: 20, max: 100): Results per page

**Response**:
```json
{
  "success": true,
  "data": {
    "listings": [
      {
        "_id": "listing_id",
        "title": "Beautiful Apartment",
        "description": "...",
        "location": "Paris",
        "city": "Paris",
        "country": "France",
        "price": 150,
        "guests": 4,
        "bedrooms": 2,
        "beds": 3,
        "bathrooms": 1,
        "amenities": ["WiFi", "Kitchen", "Parking"],
        "averageRating": 4.8,
        "reviewCount": 25,
        "_score": 12.5
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 20,
      "pages": 5,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  },
  "meta": {
    "responseTime": 145
  }
}
```

**Example**:
```bash
curl "http://localhost:4010/search?q=apartment&city=Paris&minPrice=100&maxPrice=300&guests=2&sortBy=price-asc&page=1&limit=20"
```

### 2. Autocomplete Suggestions

**Endpoint**: `GET /search/autocomplete`

**Parameters**:
- `q` (string, required): Query string (minimum 2 characters)
- `limit` (number, optional, default: 10, max: 100): Number of suggestions

**Response**:
```json
{
  "success": true,
  "suggestions": [
    {
      "type": "city",
      "text": "Paris",
      "count": 245
    },
    {
      "type": "listing",
      "text": "Parisian Apartment with View",
      "count": 12
    }
  ]
}
```

**Example**:
```bash
curl "http://localhost:4010/search/autocomplete?q=par&limit=10"
```

### 3. Popular Destinations

**Endpoint**: `GET /search/popular`

**Parameters**:
- `limit` (number, optional, default: 10, max: 50): Number of destinations

**Response**:
```json
{
  "success": true,
  "destinations": [
    {
      "city": "Paris",
      "country": "France",
      "listingCount": 245,
      "averageRating": 4.6
    },
    {
      "city": "Barcelona",
      "country": "Spain",
      "listingCount": 198,
      "averageRating": 4.5
    }
  ]
}
```

**Example**:
```bash
curl "http://localhost:4010/search/popular?limit=10"
```

### 4. Get Filters

**Endpoint**: `GET /search/filters`

**Response**:
```json
{
  "success": true,
  "filters": {
    "propertyTypes": ["Apartment", "House", "Villa", "Studio", ...],
    "amenities": ["WiFi", "Air conditioning", "Kitchen", ...],
    "priceRange": {
      "min": 0,
      "max": 10000
    },
    "booleanFilters": [
      {"key": "petsAllowed", "label": "Pets Allowed"},
      {"key": "instantBooking", "label": "Instant Booking"},
      ...
    ],
    "sortOptions": [
      {"value": "relevance", "label": "Relevance"},
      {"value": "price-asc", "label": "Price: Low to High"},
      ...
    ]
  }
}
```

### 5. Get Search History

**Endpoint**: `GET /search/history`

**Authentication**: Required

**Parameters**:
- `limit` (number, optional, default: 20, max: 100): Number of records

**Response**:
```json
{
  "success": true,
  "history": [
    {
      "_id": "history_id",
      "query": "Paris apartment",
      "filters": {
        "city": "Paris",
        "minPrice": 100,
        "maxPrice": 300
      },
      "resultsCount": 145,
      "searchType": "advanced",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 6. Clear Search History

**Endpoint**: `DELETE /search/history`

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "message": "Search history cleared"
}
```

## Elasticsearch Integration

### Index Mapping

The service automatically creates and manages an Elasticsearch index with the following mapping:

```
Index: "listings"
- id (keyword)
- title (text + keyword)
- description (text)
- location (text)
- city (text + keyword)
- country (text + keyword)
- address (text)
- lat, lng (geo_point)
- price (integer)
- guests, bedrooms, beds, bathrooms (integer)
- structure, propertyType (keyword)
- amenities (keyword)
- hostId (keyword)
- isActive (boolean)
- averageRating, reviewCount (float/integer)
- petsAllowed, instantBooking, selfCheckIn, freeParking, topRated (boolean)
- houseRules, discounts (nested)
- createdAt, updatedAt (date)
```

### Index Operations

- Automatic index creation on service startup
- Bulk indexing support for initial data population
- Real-time index updates via event bus

## Event Bus Integration

The service subscribes to the following RabbitMQ events:

### Subscribed Events

#### 1. listing.created
When a new listing is created, the service automatically indexes it in Elasticsearch.

```json
{
  "eventName": "listing.created",
  "data": {
    "_id": "listing_id",
    "title": "New Listing",
    "description": "...",
    "price": 150,
    "city": "Paris",
    ...
  }
}
```

#### 2. listing.updated
When a listing is updated, the service updates the corresponding Elasticsearch document.

```json
{
  "eventName": "listing.updated",
  "data": {
    "_id": "listing_id",
    "title": "Updated Title",
    "price": 160,
    ...
  }
}
```

#### 3. listing.deleted
When a listing is deleted, the service removes it from Elasticsearch.

```json
{
  "eventName": "listing.deleted",
  "data": {
    "_id": "listing_id"
  }
}
```

### Published Events

The service publishes the following events:

#### search.query
When a user performs a search:

```json
{
  "eventName": "search.query",
  "data": {
    "query": "Paris apartment",
    "resultsCount": 145,
    "filters": {...},
    "userId": "user_id"
  }
}
```

## Database Schema

### SearchHistory Collection

Stores user search queries and patterns for analytics and personalization:

```javascript
{
  userId: ObjectId,
  sessionId: String,
  query: String,
  filters: {
    location: String,
    city: String,
    country: String,
    minPrice: Number,
    maxPrice: Number,
    guests: Number,
    bedrooms: Number,
    beds: Number,
    bathrooms: Number,
    structure: String,
    propertyType: String,
    amenities: [String],
    checkIn: Date,
    checkOut: Date,
    petsAllowed: Boolean,
    instantBooking: Boolean,
    selfCheckIn: Boolean,
    freeParking: Boolean,
    topRated: Boolean,
    sortBy: String
  },
  resultsCount: Number,
  selectedListingId: ObjectId,
  searchType: String, // 'basic', 'advanced', 'autocomplete'
  ipAddress: String,
  userAgent: String,
  responseTime: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### PopularDestination Collection

Tracks trending destinations:

```javascript
{
  city: String,
  country: String,
  searchCount: Number,
  bookingCount: Number,
  averageRating: Number,
  imageUrl: String,
  description: String,
  lat: Number,
  lng: Number,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## Logging

Logs are written to:
- Console (colorized in development)
- `logs/combined.log` (all logs)
- `logs/error.log` (errors only)

Log level can be configured via `LOG_LEVEL` environment variable.

## Error Handling

All endpoints return a consistent error response format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

Common HTTP status codes:
- `200`: Successful request
- `400`: Bad request (validation error)
- `401`: Unauthorized (authentication required)
- `404`: Not found
- `500`: Server error

## Performance Considerations

### Elasticsearch Optimization

- Full-text search with fuzzy matching for typo tolerance
- Field-level boosting (title > description)
- Keyword fields for exact matching and aggregations
- Efficient pagination with offset/limit

### Database Optimization

- Indexed fields: `createdAt`, `userId`, `city`, `country`
- TTL indexes for auto-cleanup of old search history

### Caching

- Rate limiting applied to prevent abuse
- Connection pooling for MongoDB and Elasticsearch

## Testing

```bash
# Run tests
npm test

# Watch mode
npm test:watch

# Coverage
npm test -- --coverage
```

## Health Checks

The service exposes health check endpoints:

- `/health`: Basic health status
- `/ready`: Readiness status (dependencies check)
- `/metrics`: Service metrics and uptime

## Troubleshooting

### Elasticsearch Connection Issues

1. Verify Elasticsearch is running: `curl http://elasticsearch:9200`
2. Check configuration in `.env`
3. Review logs: `tail -f logs/error.log`

### Search Not Finding Results

1. Verify listings are indexed: `curl http://elasticsearch:9200/listings/_search`
2. Check listing.created events are being processed
3. Review Elasticsearch query in logs

### High Response Times

1. Check Elasticsearch cluster health
2. Review query complexity
3. Monitor MongoDB connections

## Contributing

Follow the existing code style and patterns:
- Use async/await for asynchronous operations
- Include comprehensive error handling
- Add logging for debugging
- Update this README for new features

## License

MIT

## Related Services

- **Listing Service**: Creates/updates listings that trigger search indexing
- **API Gateway**: Routes search requests to this service
- **User Service**: Provides authentication for search history
- **Analytics Service**: Consumes search events for insights

## Support

For issues or questions:
1. Check logs in `logs/` directory
2. Review error messages in response
3. Consult RabbitMQ/Elasticsearch status
