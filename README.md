# 🏠 HomeTrip Microservices Architecture

Architecture microservices complète avec load balancing pour la plateforme HomeTrip.

---

## 🚨 CURRENT STATUS (Local Development Setup)

**Date:** 2025-11-17 18:45

### ✅ Ready to Run
- ✅ All 13 microservices configured
- ✅ Dependencies installed
- ✅ .env files configured for localhost
- ✅ Development scripts working
- ✅ **Swagger/OpenAPI documentation integrated** 🆕

### ⚠️ Blocker: MongoDB Not Installed

**Quick Fix:**
```bash
# Install MongoDB
sudo apt-get update && sudo apt-get install -y mongodb-org
sudo systemctl start mongod

# Start all services
npx tsx scripts/dev.ts start

# Check status
npx tsx scripts/dev.ts status
```

**📖 See:** [QUICK_START_LOCAL_DEV.md](QUICK_START_LOCAL_DEV.md) and [STATUS.md](STATUS.md) for local development setup.

### 📚 API Documentation (Swagger)

All services now have interactive API documentation:

| Service | Swagger UI |
|---------|------------|
| API Gateway | http://localhost:3000/api-docs |
| Auth Service | http://localhost:3001/api-docs |
| User Service | http://localhost:3002/api-docs |
| All others... | http://localhost:{port}/api-docs |

**📖 See:** [SWAGGER_DOCUMENTATION_GUIDE.md](SWAGGER_DOCUMENTATION_GUIDE.md) for complete guide

---

## 🎯 Vue d'ensemble

HomeTrip est passé d'une architecture monolithique à une architecture microservices distribuée pour améliorer:
- **Scalabilité**: Chaque service peut scaler indépendamment
- **Résilience**: Une panne d'un service n'affecte pas les autres
- **Maintenabilité**: Code plus modulaire et équipes autonomes
- **Performance**: Load balancing et caching distribué

---

## 📊 Architecture

```
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
┌────────┴─────────────────────────┐
│        Microservices             │
│  Auth | User | Listing | Booking │
│  Payment | Message | Review      │
│  Analytics | Notification | Search│
└──────────────┬───────────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼────┐ ┌──▼────┐ ┌───▼────┐
│Postgres│ │ Mongo │ │ Redis  │
└────────┘ └───────┘ └────────┘
```

---

## 🚀 Démarrage Rapide

```bash
# 1. Configuration
cp .env.example .env
# Éditer .env avec vos valeurs

# 2. Lancer l'infrastructure
docker-compose up -d

# 3. Vérifier le statut
docker-compose ps

# 4. Accéder à l'API
curl http://localhost:3001/health
```

📖 **Guide complet**: [QUICK_START.md](./QUICK_START.md)

---

## 📦 Services

### Gateways
- **API Gateway** (3001): Point d'entrée principal, routing, auth
- **WebSocket Gateway** (3002): Real-time communication
- **Admin Dashboard** (3003): Interface d'administration

### Core Services
- **Auth Service** (4001): Authentification, JWT, OAuth2
- **User Service** (4002): Profils utilisateurs, vérification
- **Listing Service** (4003): Gestion des annonces
- **Booking Service** (4004): Réservations, calendrier
- **Payment Service** (4005): Paiements Stripe, webhooks

### Support Services
- **Message Service** (4006): Messagerie temps réel
- **Review Service** (4007): Avis et notations
- **Analytics Service** (4008): Métriques, rapports
- **Notification Service** (4009): Emails, SMS, push
- **Search Service** (4010): Recherche Elasticsearch

---

## 🗄️ Infrastructure

### Bases de Données
- **PostgreSQL** (5432): Auth, User, Booking, Payment
- **MongoDB** (27017): Listing, Message, Review, Analytics
- **Redis** (6379): Cache, Sessions, Queues
- **Elasticsearch** (9200): Search, Logs

### Message Queue
- **RabbitMQ** (5672, 15672): Event-driven communication

### Monitoring
- **Prometheus** (9090): Metrics collection
- **Grafana** (3000): Dashboards & visualization
- **Jaeger** (16686): Distributed tracing

### Service Discovery
- **Consul** (8500): Service registry & health checks

---

## 🔄 Communication

### Synchronous (REST API)
```javascript
// Service-to-service HTTP calls
const user = await userClient.get(`/users/${userId}`)
```

### Asynchronous (Events)
```javascript
// Publish event
eventBus.publish('booking.created', booking)

// Subscribe to event
eventBus.subscribe('booking.created', handleBookingCreated)
```

### Real-time (WebSocket)
```javascript
// Emit to specific user
io.to(userId).emit('notification', data)
```

---

## ⚖️ Load Balancing

### Nginx Strategies
- **Round Robin**: Distribution équitable
- **Least Connections**: Vers le serveur le moins chargé
- **IP Hash**: Sticky sessions (WebSocket)
- **Weighted**: Selon capacité serveur

### Service Scaling
```bash
# Scaler un service
docker-compose up -d --scale booking-service=3

# Kubernetes auto-scaling
kubectl autoscale deployment booking-service \
  --min=2 --max=10 --cpu-percent=70
```

---

## 📊 Monitoring Dashboard

### Metrics (Prometheus)
- Request rate & latency
- Error rates
- CPU & Memory usage
- Database connections
- Queue depth

### Logs (ELK Stack)
- Centralized logging
- Log aggregation
- Real-time analysis
- Alerts & notifications

### Tracing (Jaeger)
- Request flow visualization
- Performance bottlenecks
- Service dependencies
- Error tracking

---

## 🔐 Sécurité

### API Gateway
- ✅ JWT validation
- ✅ Rate limiting
- ✅ CORS configuration
- ✅ Request validation
- ✅ API key management

### Inter-Service
- ✅ mTLS encryption
- ✅ Service mesh (Istio/Linkerd)
- ✅ Network policies
- ✅ Secret management

### Data
- ✅ Encryption at rest
- ✅ Encryption in transit
- ✅ Database access control
- ✅ Audit logging

---

## 🧪 Tests

### Unit Tests
```bash
cd services/auth-service
npm test
```

### Integration Tests
```bash
docker-compose -f docker-compose.test.yml up
```

### Load Tests
```bash
k6 run scripts/load-tests/booking-test.js
```

### E2E Tests
```bash
npm run test:e2e
```

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

### CI/CD
- GitHub Actions
- Automated testing
- Docker build & push
- Rolling updates
- Health checks

---

## 📚 Documentation

- [Architecture détaillée](./ARCHITECTURE.md)
- [Guide de démarrage](./QUICK_START.md)
- [Documentation API](./docs/API.md)
- [Guide de développement](./docs/DEVELOPMENT.md)
- [Migration depuis monolithe](./docs/MIGRATION.md)

---

## 🎯 Roadmap

### Phase 1: Infrastructure (Complété ✅)
- [x] Docker Compose configuration
- [x] Nginx load balancer
- [x] Service discovery (Consul)
- [x] Monitoring stack (Prometheus + Grafana)

### Phase 2: Core Services (En cours 🚧)
- [x] API Gateway
- [x] Auth Service
- [ ] User Service
- [ ] Listing Service
- [ ] Booking Service

### Phase 3: Support Services (À venir 📋)
- [ ] Payment Service
- [ ] Message Service
- [ ] Review Service
- [ ] Analytics Service
- [ ] Notification Service
- [ ] Search Service

### Phase 4: Production (À venir 📋)
- [ ] Kubernetes migration
- [ ] Auto-scaling
- [ ] Disaster recovery
- [ ] Multi-region deployment

---

## 🤝 Contribution

Voir [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 📄 License

MIT License - voir [LICENSE](./LICENSE)

---

## 📞 Contact

- **Email**: dev@hometrip.com
- **Slack**: #hometrip-dev
- **Issues**: GitHub Issues

---

**Version**: 1.0.0
**Dernière mise à jour**: 2025-11-16
**Auteur**: HomeTrip Team
# hometrip-microservices
