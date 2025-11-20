# Review Service - Quick Start Guide

## Installation (5 minutes)

```bash
# Navigate to service directory
cd /home/arwa/hometrip-microservices/services/review-service

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your settings
# At minimum, update:
# - JWT_SECRET
# - MONGODB_URI
# - RABBITMQ_URL
```

## Running Locally

### Development Mode (with auto-reload)
```bash
npm run dev
```

Service runs on: `http://localhost:4007`

### Production Mode
```bash
npm start
```

## First API Call

### Create a Review
```bash
curl -X POST http://localhost:4007/reviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "listingId": "507f1f77bcf86cd799439011",
    "reservationId": "507f1f77bcf86cd799439012",
    "revieweeId": "507f1f77bcf86cd799439013",
    "reviewType": "guest-to-host",
    "rating": 5,
    "comment": "Amazing place, great host!",
    "ratings": {
      "cleanliness": 5,
      "communication": 5,
      "checkIn": 5,
      "accuracy": 5,
      "location": 5,
      "value": 5
    }
  }'
```

### Get Listing Reviews
```bash
curl http://localhost:4007/reviews/listing/507f1f77bcf86cd799439011?page=1&limit=10
```

### Get User Reviews
```bash
curl http://localhost:4007/reviews/user/507f1f77bcf86cd799439013?page=1&limit=20
```

## Health Checks

```bash
# Service is running
curl http://localhost:4007/health

# Service is ready
curl http://localhost:4007/ready

# Metrics
curl http://localhost:4007/metrics
```

## Docker Deployment

### Build Image
```bash
docker build -t hometrip-review-service:latest .
```

### Run Container
```bash
docker run -d \
  --name review-service \
  -p 4007:4007 \
  -e MONGODB_URI=mongodb://... \
  -e RABBITMQ_URL=amqp://... \
  -e JWT_SECRET=your-secret-key \
  hometrip-review-service:latest
```

### Check Logs
```bash
docker logs -f review-service
```

## Database Setup

MongoDB database and collections are created automatically on first run.

### Manual Index Creation (if needed)
```javascript
// In MongoDB shell or Compass
use review_db

db.reviews.createIndex({ listing: 1, createdAt: -1 })
db.reviews.createIndex({ reviewer: 1, createdAt: -1 })
db.reviews.createIndex({ reviewee: 1, createdAt: -1 })
db.reviews.createIndex({ reservation: 1, reviewer: 1 }, { unique: true })
db.reviews.createIndex({ isPublic: 1, isFlagged: 1 })
```

## Testing

### Run Tests
```bash
npm test
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm test -- --coverage
```

## Common Issues

### Port Already in Use
```bash
# Change port in .env
PORT=4008

# Or kill process using 4007
lsof -ti :4007 | xargs kill -9
```

### MongoDB Connection Failed
- Check MONGODB_URI in .env
- Verify MongoDB is running
- Check credentials and authSource parameter

### RabbitMQ Connection Failed
- Check RABBITMQ_URL in .env
- Verify RabbitMQ is running
- Check username and password

### JWT Token Errors
- Verify JWT_SECRET matches auth service
- Check token expiration (JWT_EXPIRES_IN)
- Ensure Authorization header format: "Bearer TOKEN"

## Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4007 | Service port |
| NODE_ENV | development | Environment |
| JWT_SECRET | (required) | JWT signing secret |
| MONGODB_URI | localhost:27017 | MongoDB connection |
| RABBITMQ_URL | localhost:5672 | RabbitMQ connection |
| LOG_LEVEL | info | Logging level |
| RATE_LIMIT_MAX | 100 | Requests per window |
| CORS_ORIGIN | localhost:3000 | Allowed origins |

## API Documentation

Full API documentation available in README.md

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /reviews | Create review |
| GET | /reviews/listing/:id | Get listing reviews |
| GET | /reviews/user/:id | Get user reviews |
| GET | /reviews/stats/:id | Get statistics |
| POST | /reviews/:id/response | Respond to review |
| POST | /reviews/:id/flag | Flag review |
| POST | /reviews/:id/moderate | Moderate review |
| DELETE | /reviews/:id | Delete review |

## Monitoring

### Logs Location
- Console: stdout/stderr
- Files: `logs/error.log`, `logs/combined.log`

### Log Level Configuration
```bash
# In .env
LOG_LEVEL=debug    # Most verbose
LOG_LEVEL=info     # Default
LOG_LEVEL=warn     # Warnings only
LOG_LEVEL=error    # Errors only
```

## Integration with Docker Compose

Add to docker-compose.yml:

```yaml
review-service:
  build: ./services/review-service
  container_name: review-service
  ports:
    - "4007:4007"
  environment:
    - NODE_ENV=development
    - MONGODB_URI=mongodb://hometrip:hometrip_mongo_pass@mongodb:27017/review_db?authSource=admin
    - RABBITMQ_URL=amqp://hometrip:hometrip_rabbitmq_pass@rabbitmq:5672
    - JWT_SECRET=${JWT_SECRET}
  depends_on:
    - mongodb
    - rabbitmq
  networks:
    - hometrip-network
```

## Environment Setup

### Using .env File
1. Copy `.env.example` to `.env`
2. Update all variables
3. Service reads .env automatically via dotenv

### Using Environment Variables
Set variables directly:
```bash
export MONGODB_URI=mongodb://...
export RABBITMQ_URL=amqp://...
export JWT_SECRET=your-secret
npm start
```

## Performance Tips

1. **Database Indexes**: Already configured
2. **Caching**: Use Redis (configured but optional)
3. **Rate Limiting**: 100 requests per 15 minutes
4. **Compression**: Enabled for responses
5. **Connection Pooling**: Mongoose handles automatically

## Code Quality

### Linting
```bash
npm run lint
```

### Testing Coverage
```bash
npm test -- --coverage
```

## Troubleshooting

### Service won't start
1. Check Node version (requires 16+)
2. Verify all dependencies: `npm install`
3. Check .env file exists and has required variables
4. Check MongoDB and RabbitMQ connectivity

### Reviews not publishing events
1. Check RabbitMQ connection: `curl http://localhost:15672` (admin panel)
2. Verify RABBITMQ_URL in .env
3. Check logs: `docker logs review-service`

### Database errors
1. Check MongoDB connection: `mongosh "mongodb://..."`
2. Verify database exists: `use review_db`
3. Check user permissions

## Next Steps

1. **Configure in docker-compose.yml**: Add service to main compose file
2. **Set up environment variables**: Update .env.example as needed
3. **Run tests**: Execute `npm test` to verify setup
4. **Deploy**: Build Docker image and deploy to Kubernetes/Docker Swarm

## Support

For issues or questions:
1. Check README.md for detailed documentation
2. Review logs in `logs/` directory
3. Check DELIVERY_SUMMARY.md for architecture
4. Review source code comments for implementation details

---

**Version**: 1.0.0
**Last Updated**: November 17, 2025
**Status**: Production Ready
