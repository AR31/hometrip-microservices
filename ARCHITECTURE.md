# 🏗️ Architecture Microservices HomeTrip

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Services](#services)
3. [Infrastructure](#infrastructure)
4. [Communication](#communication)
5. [Déploiement](#déploiement)

---

## 🎯 Vue d'ensemble

### Architecture Globale

```
Internet
    ↓
┌─────────────────────────────────────────┐
│     Load Balancer (Nginx)               │
│          Port 80/443                    │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼────┐ ┌──▼────┐ ┌───▼────┐
│API GW  │ │WS GW  │ │ Admin │
│:3001   │ │:3002  │ │:3003  │
└───┬────┘ └──┬────┘ └────────┘
    │         │
    └────┬────┘
         │
    ┌────┴────────────────────┐
    │   Service Mesh          │
    │   (Consul/Eureka)       │
    └────┬────────────────────┘
         │
┌────────┼────────────────────────┐
│        │                        │
▼        ▼        ▼        ▼      ▼
Auth   User   Listing  Booking Payment
:4001  :4002  :4003    :4004   :4005
  │      │      │        │       │
  ▼      ▼      ▼        ▼       ▼
Message Review Analytics Notification Search
:4006   :4007  :4008    :4009    :4010
```

---

## 📦 Services

### 1. API Gateway (Port 3001)
- Routage des requêtes
- Rate limiting
- Authentication check
- Request/Response transformation
- Circuit breaker

### 2. WebSocket Gateway (Port 3002)
- Real-time messaging
- Notifications
- Live updates
- Presence detection

### 3. Auth Service (Port 4001)
- JWT token management
- OAuth2 (Google, Facebook)
- 2FA/MFA
- Password reset
- Email verification

### 4. User Service (Port 4002)
- Profile management
- Avatar upload
- Identity verification
- Preferences
- User search

### 5. Listing Service (Port 4003)
- Property CRUD
- Photo management
- Calendar management
- Pricing rules
- Amenities

### 6. Booking Service (Port 4004)
- Reservation creation
- Status management
- Cancellation policies
- Auto-confirm/cancel
- Availability check

### 7. Payment Service (Port 4005)
- Stripe integration
- Webhook handling
- Refunds
- Payouts
- Transaction history

### 8. Message Service (Port 4006)
- Conversations
- Real-time chat
- File attachments
- Read receipts
- Notifications

### 9. Review Service (Port 4007)
- Ratings & reviews
- Moderation
- Spam detection
- Response management
- Average calculations

### 10. Analytics Service (Port 4008)
- Event tracking
- Dashboard metrics
- Revenue reports
- User behavior
- Performance monitoring

### 11. Notification Service (Port 4009)
- Email (Nodemailer)
- SMS (Twilio)
- Push notifications
- In-app notifications
- Template management

### 12. Search Service (Port 4010)
- Elasticsearch integration
- Filters (price, location, dates)
- Auto-complete
- Recommendations
- Geo-search

---

## 🗄️ Infrastructure

### Bases de Données

**PostgreSQL (Port 5432)**
- Auth DB
- User DB
- Booking DB
- Payment DB

**MongoDB (Port 27017)**
- Listing DB
- Message DB
- Review DB
- Analytics DB

**Redis (Port 6379)**
- Session cache
- Rate limiting
- Queue (Bull)
- Pub/Sub
- WebSocket state

**Elasticsearch (Port 9200)**
- Search index
- Logs (ELK stack)
- Analytics data

### Message Queue

**RabbitMQ (Port 5672, 15672)**
- Event-driven communication
- Async processing
- Retry logic
- Dead letter queue

### Monitoring

**Prometheus (Port 9090)**
- Metrics collection
- Alerting rules
- Service health

**Grafana (Port 3000)**
- Dashboards
- Visualizations
- Alerts

**Jaeger (Port 16686)**
- Distributed tracing
- Performance analysis
- Request flow

---

## 🔄 Communication Patterns

### 1. Synchronous (REST)
```javascript
// Service-to-service HTTP calls
const user = await userServiceClient.get(`/users/${userId}`)
```

### 2. Asynchronous (Events)
```javascript
// Publish event
eventBus.publish('booking.created', {
  bookingId: '123',
  userId: '456',
  listingId: '789'
})

// Subscribe to event
eventBus.subscribe('booking.created', async (event) => {
  // Send confirmation email
  // Update analytics
  // Notify host
})
```

### 3. Real-time (WebSocket)
```javascript
// Socket.io with Redis adapter
io.to(userId).emit('notification', {
  type: 'booking_confirmed',
  data: booking
})
```

---

## 🚀 Scalabilité

### Horizontal Scaling
```yaml
# Docker Compose scaling
docker-compose up --scale booking-service=3
docker-compose up --scale payment-service=2
```

### Load Balancing Strategies
- **Round Robin**: Default
- **Least Connections**: Pour services stateful
- **IP Hash**: Pour sticky sessions
- **Weighted**: Selon capacité serveur

### Auto-scaling (Kubernetes)
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: booking-service
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: booking-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

---

## 🔐 Sécurité

### 1. API Gateway Level
- JWT validation
- Rate limiting (Redis)
- CORS configuration
- API key management

### 2. Service Level
- Internal authentication
- Request validation
- Input sanitization
- SQL injection prevention

### 3. Network Level
- Services in private network
- Only Gateway exposed
- mTLS between services
- Firewall rules

---

## 📊 Monitoring & Observability

### Metrics (Prometheus)
```javascript
// Custom metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
})
```

### Logging (ELK Stack)
```javascript
// Structured logging
logger.info('Booking created', {
  bookingId: booking.id,
  userId: user.id,
  listingId: listing.id,
  amount: booking.totalPrice
})
```

### Tracing (Jaeger)
```javascript
// Distributed tracing
const span = tracer.startSpan('create_booking')
span.setTag('user.id', userId)
span.setTag('listing.id', listingId)
// ... operation
span.finish()
```

---

## 🧪 Testing Strategy

### Unit Tests
- Each service independently
- Mock external dependencies
- Jest + Supertest

### Integration Tests
- Service-to-service communication
- Database interactions
- Docker Compose for test env

### E2E Tests
- Full user flows
- Cypress / Playwright
- Production-like environment

### Load Tests
- Apache JMeter / k6
- Simulate concurrent users
- Identify bottlenecks

---

## 📦 Déploiement

### Development
```bash
docker-compose -f docker-compose.dev.yml up
```

### Staging
```bash
docker-compose -f docker-compose.staging.yml up
```

### Production (Kubernetes)
```bash
kubectl apply -f k8s/
```

### CI/CD Pipeline
```
GitHub Push
    ↓
GitHub Actions
    ↓
Run Tests
    ↓
Build Docker Images
    ↓
Push to Registry
    ↓
Deploy to K8s
    ↓
Health Checks
    ↓
Traffic Switch
```

---

## 🎯 Migration depuis Monolithe

### Phase 1: Préparation
1. Identifier les bounded contexts
2. Créer interfaces de communication
3. Setup infrastructure (Docker, DB)

### Phase 2: Extraction Progressive
1. Commencer par services indépendants (Analytics, Notification)
2. Extraire domaines métier (Auth, User, Listing)
3. Migrer services critiques (Booking, Payment)

### Phase 3: Optimisation
1. Monitoring et métriques
2. Performance tuning
3. Auto-scaling
4. Disaster recovery

---

**Prochaine étape:** Structure de fichiers détaillée et Docker Compose complet
