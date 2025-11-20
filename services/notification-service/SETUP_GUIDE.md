# Notification Service Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
cd /home/arwa/hometrip-microservices/services/notification-service
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Server
PORT=4009
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/hometrip-notifications

# Email (Gmail Example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM=noreply@hometrip.com

# Email (Alternative SMTP)
# EMAIL_HOST=smtp.mailtrap.io
# EMAIL_PORT=2525
# EMAIL_USER=your-mailtrap-user
# EMAIL_PASSWORD=your-mailtrap-password

# SMS (Twilio)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672

# Frontend
FRONTEND_URL=http://localhost:3000

# Application
APP_NAME=HomeTrip
SUPPORT_EMAIL=support@hometrip.com
```

### 3. Start Service

#### Development
```bash
npm run dev
```

#### Production
```bash
npm start
```

#### Docker
```bash
docker build -t notification-service:1.0.0 .
docker run -p 4009:4009 --env-file .env notification-service:1.0.0
```

### 4. Verify Service

```bash
# Health check
curl http://localhost:4009/health

# Get unread count (requires auth)
curl -H "X-User-Id: test-user" http://localhost:4009/api/notifications/unread-count
```

## Email Configuration

### Gmail Setup

1. Enable 2-factor authentication
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use the generated 16-character password

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
```

### Mailtrap Setup

1. Create account at https://mailtrap.io
2. Get credentials from Settings > API Tokens
3. Create project and get SMTP credentials

```env
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your-username
EMAIL_PASSWORD=your-password
```

### Custom SMTP Server

```env
EMAIL_HOST=your-smtp-host.com
EMAIL_PORT=587  # or 465 for SSL
EMAIL_USER=your-username
EMAIL_PASSWORD=your-password
EMAIL_SECURE=false  # set to true for port 465
```

## Twilio Configuration

### Setup Steps

1. Create account at https://www.twilio.com
2. Get credentials from Console Dashboard
3. Buy a phone number
4. Verify recipient numbers in trial account

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+15551234567
```

### Test SMS

```bash
curl -X POST http://localhost:4009/api/notifications \
  -H "X-User-Id: test-user" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "type": "verification",
    "title": "Test SMS",
    "message": "Test message",
    "category": "account",
    "channels": {"sms": true},
    "phoneNumber": "+1234567890",
    "verificationCode": "123456"
  }'
```

## Database Setup

### MongoDB Local

```bash
# Install MongoDB
# macOS
brew tap mongodb/brew
brew install mongodb-community

# Linux
sudo apt-get install -y mongodb

# Start MongoDB
mongod

# Verify
mongo --eval "db.adminCommand('ping')"
```

### MongoDB Atlas (Cloud)

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create cluster and database
3. Get connection string
4. Update .env

```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/hometrip-notifications?retryWrites=true&w=majority
```

## RabbitMQ Setup

### Local Installation

```bash
# macOS
brew install rabbitmq

# Linux
sudo apt-get install rabbitmq-server

# Start
rabbitmq-server

# Management UI
# Open http://localhost:15672
# Default: guest / guest
```

### Docker Setup

```bash
docker run -d \
  --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3-management

# Access management UI at http://localhost:15672
# Default: guest / guest
```

### CloudAMQP (Cloud)

1. Create account at https://www.cloudamqp.com
2. Create instance
3. Get connection URL
4. Update .env

```env
RABBITMQ_URL=amqp://user:password@host:5672/vhost
```

## Integration with Other Services

### Publishing Events from Other Services

Example from booking-service:

```javascript
const amqp = require('amqplib');

const publishBookingCreated = async (booking) => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    const channel = await connection.createChannel();

    const exchange = 'hometrip_events';
    await channel.assertExchange(exchange, 'topic', { durable: true });

    const event = {
      bookingId: booking._id,
      guestId: booking.guestId,
      hostId: booking.hostId,
      guestName: booking.guest.name,
      hostName: booking.host.name,
      listingTitle: booking.listing.title,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      guests: booking.guests,
      totalPrice: booking.totalPrice,
      conversationId: booking.conversationId,
      guestEmail: booking.guest.email,
      hostEmail: booking.host.email,
      guestPhone: booking.guest.phone,
      hostPhone: booking.host.phone
    };

    channel.publish(
      exchange,
      'booking.created',
      Buffer.from(JSON.stringify(event)),
      { persistent: true }
    );

    await channel.close();
    await connection.close();
  } catch (error) {
    console.error('Error publishing event:', error);
  }
};
```

### Event Payload Examples

#### user.created
```json
{
  "userId": "60d5ec49f1b2c72b8c8e4b1a",
  "email": "user@example.com",
  "fullName": "John Doe",
  "phone": "+1234567890",
  "verificationToken": "eyJ..."
}
```

#### booking.created
```json
{
  "bookingId": "60d5ec49f1b2c72b8c8e4b1a",
  "guestId": "60d5ec49f1b2c72b8c8e4b1b",
  "hostId": "60d5ec49f1b2c72b8c8e4b1c",
  "guestName": "John Doe",
  "hostName": "Jane Smith",
  "listingTitle": "Beautiful Apartment",
  "checkIn": "2024-01-15T14:00:00Z",
  "checkOut": "2024-01-20T11:00:00Z",
  "guests": 2,
  "totalPrice": 500,
  "conversationId": "60d5ec49f1b2c72b8c8e4b1d",
  "guestEmail": "john@example.com",
  "hostEmail": "jane@example.com",
  "guestPhone": "+1234567890",
  "hostPhone": "+0987654321"
}
```

#### booking.confirmed
```json
{
  "bookingId": "60d5ec49f1b2c72b8c8e4b1a",
  "guestId": "60d5ec49f1b2c72b8c8e4b1b",
  "guestEmail": "john@example.com",
  "guestName": "John Doe",
  "guestPhone": "+1234567890",
  "hostName": "Jane Smith",
  "listingTitle": "Beautiful Apartment",
  "checkIn": "2024-01-15T14:00:00Z",
  "checkOut": "2024-01-20T11:00:00Z",
  "guests": 2,
  "totalPrice": 500
}
```

#### booking.cancelled
```json
{
  "bookingId": "60d5ec49f1b2c72b8c8e4b1a",
  "guestId": "60d5ec49f1b2c72b8c8e4b1b",
  "guestEmail": "john@example.com",
  "guestName": "John Doe",
  "hostName": "Jane Smith",
  "listingTitle": "Beautiful Apartment",
  "cancellationReason": "Host requested cancellation"
}
```

#### payment.failed
```json
{
  "userId": "60d5ec49f1b2c72b8c8e4b1b",
  "bookingId": "60d5ec49f1b2c72b8c8e4b1a",
  "email": "john@example.com",
  "fullName": "John Doe",
  "phone": "+1234567890",
  "errorMessage": "Card declined"
}
```

#### payment.refunded
```json
{
  "userId": "60d5ec49f1b2c72b8c8e4b1b",
  "bookingId": "60d5ec49f1b2c72b8c8e4b1a",
  "email": "john@example.com",
  "fullName": "John Doe",
  "amount": 500
}
```

#### message.sent
```json
{
  "messageId": "60d5ec49f1b2c72b8c8e4b1a",
  "senderId": "60d5ec49f1b2c72b8c8e4b1b",
  "senderName": "Jane Smith",
  "recipientId": "60d5ec49f1b2c72b8c8e4b1c",
  "recipientEmail": "john@example.com",
  "recipientName": "John Doe",
  "recipientPhone": "+1234567890",
  "conversationId": "60d5ec49f1b2c72b8c8e4b1d",
  "preview": "Hi John, are you interested in..."
}
```

#### review.created
```json
{
  "reviewId": "60d5ec49f1b2c72b8c8e4b1a",
  "listingId": "60d5ec49f1b2c72b8c8e4b1b",
  "listingOwnerId": "60d5ec49f1b2c72b8c8e4b1c",
  "ownerEmail": "jane@example.com",
  "ownerName": "Jane Smith",
  "reviewerName": "John Doe",
  "rating": 5,
  "comment": "Great place! Very clean and comfortable."
}
```

## Deployment

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.9'

services:
  notification-service:
    build: .
    ports:
      - "4009:4009"
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://mongo:27017/hometrip-notifications
      RABBITMQ_URL: amqp://rabbitmq:5672
      EMAIL_HOST: ${EMAIL_HOST}
      EMAIL_PORT: ${EMAIL_PORT}
      EMAIL_USER: ${EMAIL_USER}
      EMAIL_PASSWORD: ${EMAIL_PASSWORD}
      TWILIO_ACCOUNT_SID: ${TWILIO_ACCOUNT_SID}
      TWILIO_AUTH_TOKEN: ${TWILIO_AUTH_TOKEN}
      TWILIO_PHONE_NUMBER: ${TWILIO_PHONE_NUMBER}
      FRONTEND_URL: ${FRONTEND_URL}
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - mongo
      - rabbitmq
    networks:
      - hometrip
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4009/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

  mongo:
    image: mongo:5
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    networks:
      - hometrip
    restart: unless-stopped

  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    networks:
      - hometrip
    restart: unless-stopped

volumes:
  mongo_data:
  rabbitmq_data:

networks:
  hometrip:
    driver: bridge
```

Start:
```bash
docker-compose up -d
```

### Kubernetes

Create `k8s-notification-service.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: notification-service-config
data:
  PORT: "4009"
  NODE_ENV: "production"
  FRONTEND_URL: "https://hometrip.com"
  APP_NAME: "HomeTrip"

---
apiVersion: v1
kind: Secret
metadata:
  name: notification-service-secrets
type: Opaque
stringData:
  MONGODB_URI: "mongodb://mongo:27017/hometrip-notifications"
  RABBITMQ_URL: "amqp://rabbitmq:5672"
  EMAIL_HOST: "smtp.gmail.com"
  EMAIL_USER: "your-email@gmail.com"
  EMAIL_PASSWORD: "your-app-password"
  TWILIO_ACCOUNT_SID: "AC..."
  TWILIO_AUTH_TOKEN: "..."
  TWILIO_PHONE_NUMBER: "+1234567890"
  JWT_SECRET: "your-secret"

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notification-service
  labels:
    app: notification-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: notification-service
  template:
    metadata:
      labels:
        app: notification-service
    spec:
      containers:
      - name: notification-service
        image: hometrip-notification-service:1.0.0
        ports:
        - containerPort: 4009
        envFrom:
        - configMapRef:
            name: notification-service-config
        - secretRef:
            name: notification-service-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 4009
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 4009
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2

---
apiVersion: v1
kind: Service
metadata:
  name: notification-service
spec:
  selector:
    app: notification-service
  ports:
  - port: 80
    targetPort: 4009
    protocol: TCP
  type: ClusterIP
```

Deploy:
```bash
kubectl apply -f k8s-notification-service.yaml
```

## Monitoring

### Logs

```bash
# View logs
tail -f logs/all.log

# View errors only
tail -f logs/error.log

# Search for specific notification
grep "booking_request" logs/all.log
```

### Health Check

```bash
# Health status
curl http://localhost:4009/health

# Metrics
curl http://localhost:4009/metrics

# Readiness (K8s)
curl http://localhost:4009/ready
```

### Database

```bash
# Connect to MongoDB
mongosh

# Check database
use hometrip-notifications

# Count notifications
db.notifications.countDocuments()

# Find unread
db.notifications.find({isRead: false}).count()

# Check indexes
db.notifications.getIndexes()
```

## Troubleshooting

### Service Won't Start

1. Check logs: `tail -f logs/error.log`
2. Verify MongoDB running: `mongosh`
3. Verify RabbitMQ running: `curl -u guest:guest http://localhost:15672/api/whoami`
4. Check port 4009 available: `lsof -i :4009`

### Emails Not Sending

1. Verify credentials in .env
2. Check logs: `grep "Email" logs/error.log`
3. For Gmail: Verify app password (not regular password)
4. Test SMTP: `telnet smtp.gmail.com 587`

### SMS Not Sending

1. Verify Twilio credentials
2. Verify phone number is in international format (+1234567890)
3. Check Twilio account balance
4. Verify numbers are verified in trial account

### Events Not Received

1. Verify RabbitMQ running
2. Check queue: `rabbitmqctl list_queues`
3. Verify exchange: `rabbitmqctl list_exchanges`
4. Check bindings: `rabbitmqctl list_bindings`

### High Database Load

1. Check indexes: `db.notifications.getIndexes()`
2. Monitor query performance: MongoDB Atlas or Studio 3T
3. Consider archiving old notifications
4. Add more replicas for read scaling

## Testing

### Manual API Testing

```bash
# Get all notifications
curl -H "X-User-Id: test-user" http://localhost:4009/api/notifications

# Get unread count
curl -H "X-User-Id: test-user" http://localhost:4009/api/notifications/unread-count

# Mark as read
curl -X PUT \
  -H "X-User-Id: test-user" \
  http://localhost:4009/api/notifications/NOTIFICATION_ID/read

# Archive
curl -X PUT \
  -H "X-User-Id: test-user" \
  http://localhost:4009/api/notifications/NOTIFICATION_ID/archive

# Delete
curl -X DELETE \
  -H "X-User-Id: test-user" \
  http://localhost:4009/api/notifications/NOTIFICATION_ID
```

### Test Email Sending

```bash
# Send test notification email
curl -X POST http://localhost:4009/api/notifications/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "subject": "Test Email",
    "message": "This is a test notification"
  }'
```

### Test SMS Sending

```bash
# Send test SMS
curl -X POST http://localhost:4009/api/notifications/test-sms \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "message": "Test SMS from HomeTrip"
  }'
```

## Performance Optimization

### Recommendations

1. **Enable MongoDB Compression:**
   ```
   MONGODB_URI=mongodb://host/db?compressors=snappy
   ```

2. **Connection Pooling:**
   ```javascript
   // Already configured in database.js
   const options = {
     maxPoolSize: 10,
     minPoolSize: 5
   };
   ```

3. **Add Redis for Caching:**
   ```javascript
   const redis = require('redis');
   const client = redis.createClient();
   // Cache frequently accessed data
   ```

4. **Database Maintenance:**
   ```javascript
   // Run daily: Delete old archived notifications
   Notification.deleteOldNotifications(90);
   ```

5. **RabbitMQ Optimization:**
   - Enable HPA (Horizontal Pod Autoscaling)
   - Increase consumer threads
   - Use dead letter exchanges for failed events

## Support

For issues or questions:
- Check logs in `/logs` directory
- Review README.md for detailed documentation
- Check IMPLEMENTATION_SUMMARY.md for architecture details
- Contact: support@hometrip.com

---

**Service:** Notification Service v1.0.0
**Status:** Production Ready
**Last Updated:** 2024-11-17
