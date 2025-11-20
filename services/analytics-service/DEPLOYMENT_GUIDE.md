# Analytics Service Deployment Guide

## Prerequisites

- Node.js 18+
- MongoDB 5.0+
- RabbitMQ 3.8+
- Redis (optional, for caching)
- Docker & Docker Compose (for containerized deployment)

## Environment Setup

### 1. Create .env file

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Service Configuration
NODE_ENV=production
PORT=4008
SERVICE_HOST=0.0.0.0

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# MongoDB Configuration
MONGODB_URI=mongodb://hometrip:password@mongodb:27017/analytics_db?authSource=admin

# RabbitMQ Configuration
RABBITMQ_URL=amqp://hometrip:password@rabbitmq:5672

# Logging
LOG_LEVEL=info

# Analytics Configuration
RETENTION_DAYS=730
AGGREGATION_INTERVAL=3600000
```

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Start in Development Mode

```bash
npm run dev
```

The service will start on `http://localhost:4008`

### 3. Verify Health

```bash
curl http://localhost:4008/health
```

## Docker Deployment

### 1. Build Image

```bash
docker build -t hometrip-analytics-service:latest .
```

### 2. Run Container

```bash
docker run -d \
  --name analytics-service \
  -p 4008:4008 \
  -e MONGODB_URI=mongodb://hometrip:password@mongodb:27017/analytics_db \
  -e RABBITMQ_URL=amqp://hometrip:password@rabbitmq:5672 \
  -e JWT_SECRET=your-secret-key \
  -e NODE_ENV=production \
  --network hometrip-network \
  hometrip-analytics-service:latest
```

### 3. Docker Compose (Recommended)

Add to your `docker-compose.yml`:

```yaml
services:
  analytics-service:
    build:
      context: ./services/analytics-service
      dockerfile: Dockerfile
    container_name: analytics-service
    ports:
      - "4008:4008"
    environment:
      NODE_ENV: production
      PORT: 4008
      MONGODB_URI: mongodb://hometrip:hometrip_mongo_pass@mongodb:27017/analytics_db?authSource=admin
      RABBITMQ_URL: amqp://hometrip:hometrip_rabbitmq_pass@rabbitmq:5672
      JWT_SECRET: ${JWT_SECRET}
      LOG_LEVEL: info
      RETENTION_DAYS: 730
    depends_on:
      - mongodb
      - rabbitmq
    networks:
      - hometrip-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4008/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    volumes:
      - ./services/analytics-service/logs:/app/logs

networks:
  hometrip-network:
    driver: bridge
```

Then start:

```bash
docker-compose up -d analytics-service
```

## Production Deployment

### 1. Kubernetes Deployment

Create `analytics-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: analytics-service
  namespace: hometrip
spec:
  replicas: 2
  selector:
    matchLabels:
      app: analytics-service
  template:
    metadata:
      labels:
        app: analytics-service
    spec:
      containers:
      - name: analytics-service
        image: hometrip-analytics-service:latest
        ports:
        - containerPort: 4008
        env:
        - name: NODE_ENV
          value: production
        - name: PORT
          value: "4008"
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: analytics-secrets
              key: mongodb-uri
        - name: RABBITMQ_URL
          valueFrom:
            secretKeyRef:
              name: analytics-secrets
              key: rabbitmq-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: analytics-secrets
              key: jwt-secret
        - name: LOG_LEVEL
          value: info
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
            port: 4008
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 4008
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: analytics-service
  namespace: hometrip
spec:
  selector:
    app: analytics-service
  ports:
  - protocol: TCP
    port: 4008
    targetPort: 4008
  type: ClusterIP
```

Deploy:

```bash
kubectl apply -f analytics-deployment.yaml
```

### 2. Create Kubernetes Secrets

```bash
kubectl create secret generic analytics-secrets \
  --from-literal=mongodb-uri='mongodb://...' \
  --from-literal=rabbitmq-url='amqp://...' \
  --from-literal=jwt-secret='your-secret' \
  -n hometrip
```

## Database Setup

### 1. Initialize MongoDB Collections

The service creates collections automatically, but you can pre-create indexes:

```bash
# Connect to MongoDB
mongosh -u hometrip -p password --authenticationDatabase admin

# Switch to analytics database
use analytics_db

# Create indexes
db.analytics.createIndex({ type: 1, hostId: 1, yearMonthDay: 1 })
db.analytics.createIndex({ date: 1, type: 1 })
db.analytics.createIndex({ period: 1, hostId: 1, date: 1 })

# Verify indexes
db.analytics.getIndexes()
```

## Health Checks & Monitoring

### Health Endpoints

```bash
# Basic health check
curl http://localhost:4008/health

# Readiness check (checks dependencies)
curl http://localhost:4008/ready

# Service metrics
curl http://localhost:4008/metrics
```

### Monitoring Setup

#### Prometheus Metrics

Create `prometheus.yml` config:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'analytics-service'
    static_configs:
      - targets: ['localhost:4008']
    metrics_path: '/metrics'
```

#### Docker Health Check

Already configured in Dockerfile with HEALTHCHECK instruction.

Check status:

```bash
docker ps | grep analytics-service
```

## Logging

### View Logs

Development:
```bash
npm run dev
```

Docker:
```bash
docker logs analytics-service -f
```

Kubernetes:
```bash
kubectl logs -f deployment/analytics-service -n hometrip
```

### Log Files

Logs are written to `/app/logs/`:
- `error.log` - Error level logs
- `combined.log` - All logs

## Performance Tuning

### MongoDB Optimization

1. **Enable Compression:**
   ```
   MONGODB_URI=mongodb://user:pass@host/db?compressors=snappy
   ```

2. **Connection Pooling:**
   ```env
   MONGODB_MAX_POOL_SIZE=20
   MONGODB_MIN_POOL_SIZE=5
   ```

3. **Read Preferences:**
   Consider secondary reads for reporting queries

### RabbitMQ Optimization

1. **Prefetch Count:**
   Adjust message prefetch for optimal throughput

2. **Queue TTL:**
   Set message TTL to prevent queue buildup

### Node.js Optimization

1. **Memory Limits:**
   ```bash
   NODE_OPTIONS="--max-old-space-size=1024"
   ```

2. **Worker Threads:**
   Scale horizontally with multiple instances

## Backup & Recovery

### Database Backup

```bash
# Backup MongoDB
mongodump --uri="mongodb://hometrip:password@mongodb:27017/analytics_db" \
  --out=/backups/mongodb

# Schedule daily backups
0 2 * * * mongodump --uri="..." --out=/backups/mongodb-$(date +\%Y\%m\%d)
```

### Data Retention

Configure in `.env`:
```env
RETENTION_DAYS=730  # 2 years
```

Old data is automatically cleaned up by the scheduler.

## Troubleshooting

### Service Won't Start

1. Check MongoDB connection:
   ```bash
   mongosh "$MONGODB_URI"
   ```

2. Check RabbitMQ connection:
   ```bash
   amqp-consume --url="$RABBITMQ_URL"
   ```

3. Check logs:
   ```bash
   docker logs analytics-service
   ```

### No Analytics Data

1. Verify events are being published:
   ```bash
   # Check RabbitMQ management UI
   http://rabbitmq:15672
   ```

2. Check event handlers are registered:
   ```bash
   curl http://localhost:4008/ready
   ```

3. Verify MongoDB has collections:
   ```bash
   db.analytics.countDocuments()
   ```

### High Memory Usage

1. Reduce batch size:
   ```env
   BATCH_SIZE=50
   ```

2. Increase garbage collection:
   ```bash
   NODE_OPTIONS="--expose-gc"
   ```

3. Monitor with:
   ```bash
   curl http://localhost:4008/metrics
   ```

## Scaling

### Horizontal Scaling

For multiple instances:

1. **Load Balancer Configuration:**
   ```nginx
   upstream analytics {
     server analytics-1:4008;
     server analytics-2:4008;
     server analytics-3:4008;
   }
   ```

2. **Database Connection Pooling:**
   Ensure MongoDB can handle multiple connections

3. **Event Processing:**
   Each instance subscribes to same queue (shared processing)

### Vertical Scaling

Increase server resources:
- CPU: 2 cores recommended for production
- Memory: 512MB - 1GB
- Storage: Based on retention period

## Security

### Environment Variables

- Never commit `.env` to version control
- Use secure secret management (Kubernetes Secrets, AWS Secrets Manager)
- Rotate JWT_SECRET regularly

### MongoDB Security

- Use authentication
- Enable TLS/SSL connections
- Restrict network access

### RabbitMQ Security

- Use strong credentials
- Enable TLS/SSL
- Restrict management UI access

### API Security

- JWT authentication on all endpoints
- Rate limiting (100 requests per 15 minutes)
- CORS enabled for trusted origins
- Helmet.js for security headers

## Monitoring Checklist

- [ ] Health endpoints responding
- [ ] Events being processed
- [ ] Database connections stable
- [ ] Memory usage within limits
- [ ] Log files being written
- [ ] Rate limiting working
- [ ] Error handling working
- [ ] Backups running

## Upgrade Process

1. Build new image:
   ```bash
   docker build -t hometrip-analytics-service:v1.1.0 .
   ```

2. Test in staging:
   ```bash
   docker-compose up analytics-service
   ```

3. Zero-downtime deployment (Kubernetes):
   ```bash
   kubectl set image deployment/analytics-service \
     analytics-service=hometrip-analytics-service:v1.1.0 \
     -n hometrip --record
   ```

4. Monitor rollout:
   ```bash
   kubectl rollout status deployment/analytics-service -n hometrip
   ```

## Support

For deployment issues or questions:
1. Check logs: `docker logs analytics-service`
2. Verify dependencies are running
3. Check configuration in `.env`
4. Consult troubleshooting section

---

**Last Updated:** 2024-01-15
**Version:** 1.0.0
