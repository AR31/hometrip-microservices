# Message Service Deployment Guide

## Prerequisites

- Docker & Docker Compose
- Node.js 16+
- MongoDB 4.4+
- RabbitMQ 3.10+
- Redis 6.0+ (optional, for future caching)

## Development Setup

### 1. Install Dependencies

```bash
cd services/message-service
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your local configuration:

```env
NODE_ENV=development
PORT=4006
MONGODB_URI=mongodb://localhost:27017/hometrip-messages
RABBITMQ_URL=amqp://guest:guest@localhost:5672
LOG_LEVEL=debug
```

### 3. Start MongoDB and RabbitMQ

Using Docker Compose:

```bash
docker-compose up -d mongodb rabbitmq
```

Or install locally and start services manually.

### 4. Start the Service

```bash
npm run dev
```

Service will be available at `http://localhost:4006`

---

## Docker Deployment

### Building the Image

```bash
docker build -t hometrip-message-service:1.0.0 .
```

### Running with Docker

```bash
docker run \
  -p 4006:4006 \
  -e NODE_ENV=production \
  -e MONGODB_URI=mongodb://mongodb:27017/hometrip-messages \
  -e RABBITMQ_URL=amqp://rabbitmq:5672 \
  hometrip-message-service:1.0.0
```

### Using Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  message-service:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: hometrip-message-service
    ports:
      - "4006:4006"
    environment:
      NODE_ENV: production
      PORT: 4006
      MONGODB_URI: mongodb://mongodb:27017/hometrip-messages
      RABBITMQ_URL: amqp://guest:guest@rabbitmq:5672
      LOG_LEVEL: info
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGIN: ${CORS_ORIGIN}
    depends_on:
      - mongodb
      - rabbitmq
    restart: unless-stopped
    networks:
      - hometrip-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4006/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 5s

  mongodb:
    image: mongo:6.0
    container_name: hometrip-mongodb
    ports:
      - "27017:27017"
    volumes:
      - mongodb-data:/data/db
    environment:
      MONGO_INITDB_DATABASE: hometrip-messages
    restart: unless-stopped
    networks:
      - hometrip-network

  rabbitmq:
    image: rabbitmq:3.12-management
    container_name: hometrip-rabbitmq
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq
    restart: unless-stopped
    networks:
      - hometrip-network

volumes:
  mongodb-data:
  rabbitmq-data:

networks:
  hometrip-network:
    driver: bridge
```

Start all services:

```bash
docker-compose up -d
```

---

## Kubernetes Deployment

### Create ConfigMap

```bash
kubectl create configmap message-service-config \
  --from-literal=MONGODB_URI=mongodb://mongodb:27017/hometrip-messages \
  --from-literal=RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672 \
  --from-literal=LOG_LEVEL=info
```

### Create Secret

```bash
kubectl create secret generic message-service-secret \
  --from-literal=JWT_SECRET=$(openssl rand -base64 32)
```

### Deployment YAML

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: message-service
  labels:
    app: message-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: message-service
  template:
    metadata:
      labels:
        app: message-service
    spec:
      containers:
      - name: message-service
        image: hometrip-message-service:1.0.0
        imagePullPolicy: Always
        ports:
        - containerPort: 4006
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "4006"
        - name: MONGODB_URI
          valueFrom:
            configMapKeyRef:
              name: message-service-config
              key: MONGODB_URI
        - name: RABBITMQ_URL
          valueFrom:
            configMapKeyRef:
              name: message-service-config
              key: RABBITMQ_URL
        - name: LOG_LEVEL
          valueFrom:
            configMapKeyRef:
              name: message-service-config
              key: LOG_LEVEL
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: message-service-secret
              key: JWT_SECRET
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 4006
          initialDelaySeconds: 10
          periodSeconds: 30
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 4006
          initialDelaySeconds: 5
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 3

---
apiVersion: v1
kind: Service
metadata:
  name: message-service
  labels:
    app: message-service
spec:
  type: ClusterIP
  ports:
  - port: 4006
    targetPort: 4006
    protocol: TCP
    name: http
  selector:
    app: message-service
```

Deploy:

```bash
kubectl apply -f k8s/deployment.yaml
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | development | Environment (development/production) |
| `PORT` | 4006 | Service port |
| `MONGODB_URI` | mongodb://localhost:27017/hometrip-messages | MongoDB connection string |
| `RABBITMQ_URL` | amqp://guest:guest@localhost:5672 | RabbitMQ connection URL |
| `REDIS_URL` | redis://localhost:6379 | Redis connection URL |
| `LOG_LEVEL` | info | Logging level (debug/info/warn/error) |
| `JWT_SECRET` | your-secret-key | JWT secret for token verification |
| `CORS_ORIGIN` | http://localhost:3000,http://localhost:3001 | Allowed CORS origins |
| `API_GATEWAY_URL` | http://localhost:4000 | API Gateway URL |

---

## Monitoring & Logging

### Log Files

Logs are stored in `/logs` directory:
- `error.log` - Error logs only
- `combined.log` - All logs

### Docker Logging

View logs:

```bash
docker logs -f hometrip-message-service
```

### Kubernetes Logging

```bash
kubectl logs -f deployment/message-service
```

### Health Check

```bash
curl http://localhost:4006/health
```

Expected response:

```json
{
  "success": true,
  "service": "message-service",
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

## Performance Tuning

### MongoDB Optimization

Create indexes:

```javascript
db.messages.createIndex({ conversation: 1, createdAt: -1 });
db.messages.createIndex({ sender: 1, createdAt: -1 });
db.messages.createIndex({ isRead: 1, conversation: 1 });
db.messages.createIndex({ deleted: 1 });

db.conversations.createIndex({ participants: 1, "lastMessage.createdAt": -1 });
db.conversations.createIndex({ guest: 1, status: 1 });
db.conversations.createIndex({ host: 1, status: 1 });
db.conversations.createIndex({ reservation: 1 });
db.conversations.createIndex({ labels: 1 });
db.conversations.createIndex({ updatedAt: -1 });
```

### Node.js Optimization

Set environment variables for production:

```bash
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=512"
```

### Message Pagination

Default pagination is 50 messages per page. Adjust in code if needed.

---

## Backup & Recovery

### MongoDB Backup

```bash
mongodump --uri "mongodb://localhost:27017/hometrip-messages" --out /backups/mongodb
```

### MongoDB Restore

```bash
mongorestore --uri "mongodb://localhost:27017/hometrip-messages" /backups/mongodb/hometrip-messages
```

### RabbitMQ Backup

```bash
docker exec hometrip-rabbitmq rabbitmqctl export_definitions /tmp/definitions.json
docker cp hometrip-rabbitmq:/tmp/definitions.json ./rabbitmq-backup.json
```

---

## Troubleshooting

### Service won't start

1. Check MongoDB connection:
   ```bash
   mongosh --uri "mongodb://localhost:27017"
   ```

2. Check RabbitMQ connection:
   ```bash
   curl http://localhost:15672/api/aliveness-test/% 2F
   ```

3. Check logs:
   ```bash
   tail -f logs/combined.log
   ```

### High Memory Usage

1. Increase Node.js heap:
   ```bash
   NODE_OPTIONS="--max-old-space-size=1024" npm start
   ```

2. Check for memory leaks in logs

3. Restart the service:
   ```bash
   docker restart hometrip-message-service
   ```

### Database Locked

1. Check MongoDB replication status:
   ```bash
   rs.status()
   ```

2. Restart MongoDB if needed:
   ```bash
   docker restart hometrip-mongodb
   ```

### RabbitMQ Connection Issues

1. Check RabbitMQ status:
   ```bash
   docker exec hometrip-rabbitmq rabbitmqctl status
   ```

2. Restart RabbitMQ:
   ```bash
   docker restart hometrip-rabbitmq
   ```

---

## Security

### API Gateway Integration

Configure API Gateway to:
- Validate JWT tokens
- Rate limit requests
- Add request/response logging
- Enforce HTTPS

### MongoDB Security

1. Enable authentication:
   ```javascript
   db.createUser({
     user: "hometrip",
     pwd: "strong-password",
     roles: ["dbOwner"]
   });
   ```

2. Use connection string:
   ```
   mongodb://hometrip:password@localhost:27017/hometrip-messages?authSource=admin
   ```

### RabbitMQ Security

1. Change default credentials:
   ```bash
   docker exec hometrip-rabbitmq rabbitmqctl change_password guest new-password
   ```

2. Create dedicated user:
   ```bash
   docker exec hometrip-rabbitmq rabbitmqctl add_user hometrip password
   docker exec hometrip-rabbitmq rabbitmqctl set_permissions -p / hometrip ".*" ".*" ".*"
   ```

---

## Scaling

### Horizontal Scaling

Deploy multiple instances behind a load balancer:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: message-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: message-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Database Scaling

Use MongoDB replication set for high availability:

```bash
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongodb-0:27017" },
    { _id: 1, host: "mongodb-1:27017" },
    { _id: 2, host: "mongodb-2:27017" }
  ]
})
```

---

## Version Management

### Release Notes

Document all changes in `CHANGELOG.md`.

### Database Migrations

Create migration scripts in `migrations/` directory.

### Backward Compatibility

Maintain backward compatibility for API endpoints.

---

## Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [RabbitMQ Documentation](https://www.rabbitmq.com/documentation.html)
- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
