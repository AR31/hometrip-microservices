# 🚀 HomeTrip Microservices - Quick Start Guide

## 📁 Structure du Projet

```
hometrip-microservices/
├── services/
│   ├── api-gateway/
│   ├── websocket-gateway/
│   ├── auth-service/
│   ├── user-service/
│   ├── listing-service/
│   ├── booking-service/
│   ├── payment-service/
│   ├── message-service/
│   ├── review-service/
│   ├── analytics-service/
│   ├── notification-service/
│   └── search-service/
├── nginx/
│   ├── nginx.conf
│   └── proxy_params.conf
├── prometheus/
│   └── prometheus.yml
├── grafana/
│   └── provisioning/
├── scripts/
│   ├── init-postgres.sh
│   └── generate-services.sh
├── docker-compose.yml
├── docker-compose.dev.yml
├── docker-compose.prod.yml
├── .env.example
├── .env
├── ARCHITECTURE.md
├── QUICK_START.md
└── README.md
```

---

## ⚡ Démarrage Rapide

### 1. Prérequis

```bash
# Vérifier les installations
docker --version          # >= 20.10
docker-compose --version  # >= 2.0
node --version           # >= 18.x
```

### 2. Configuration Initiale

```bash
# Cloner/naviguer vers le projet
cd /home/arwa/hometrip-microservices

# Copier le fichier d'environnement
cp .env.example .env

# Éditer le fichier .env avec vos valeurs
nano .env
```

### 3. Générer la Structure des Services

```bash
# Rendre le script exécutable
chmod +x scripts/generate-services.sh

# Générer tous les services
./scripts/generate-services.sh
```

### 4. Lancer l'Infrastructure

```bash
# Démarrer toutes les bases de données et services
docker-compose up -d

# Vérifier les logs
docker-compose logs -f

# Vérifier le statut
docker-compose ps
```

### 5. Accéder aux Services

| Service | URL | Description |
|---------|-----|-------------|
| API Gateway | http://localhost:3001 | Point d'entrée API |
| WebSocket | http://localhost:3002 | Temps réel |
| Nginx | http://localhost:80 | Load Balancer |
| RabbitMQ UI | http://localhost:15672 | Queue Manager |
| Grafana | http://localhost:3000 | Monitoring |
| Prometheus | http://localhost:9090 | Metrics |
| Jaeger | http://localhost:16686 | Tracing |
| Consul | http://localhost:8500 | Service Discovery |

---

## 🛠️ Commandes Utiles

### Docker Compose

```bash
# Démarrer tous les services
docker-compose up -d

# Démarrer un service spécifique
docker-compose up -d auth-service

# Stopper tous les services
docker-compose down

# Stopper et supprimer les volumes
docker-compose down -v

# Voir les logs en temps réel
docker-compose logs -f [service-name]

# Reconstruire un service
docker-compose build [service-name]

# Scaler un service
docker-compose up -d --scale booking-service=3

# Redémarrer un service
docker-compose restart [service-name]

# Voir l'utilisation des ressources
docker stats

# Nettoyer les ressources inutilisées
docker system prune -a
```

### Development

```bash
# Mode développement (avec hot reload)
docker-compose -f docker-compose.dev.yml up -d

# Entrer dans un container
docker-compose exec auth-service sh

# Exécuter une commande dans un container
docker-compose exec auth-service npm test

# Voir les variables d'environnement
docker-compose exec auth-service env
```

### Base de Données

```bash
# Accéder à PostgreSQL
docker-compose exec postgres psql -U hometrip -d auth_db

# Accéder à MongoDB
docker-compose exec mongodb mongosh -u hometrip -p

# Accéder à Redis
docker-compose exec redis redis-cli -a your_password
```

---

## 📊 Monitoring

### Prometheus Metrics

```bash
# Accéder à Prometheus
open http://localhost:9090

# Exemples de requêtes PromQL
- http_requests_total
- http_request_duration_seconds
- nodejs_heap_size_used_bytes
```

### Grafana Dashboards

```bash
# Accéder à Grafana
open http://localhost:3000

# Credentials par défaut
Username: admin
Password: (voir GRAFANA_PASSWORD dans .env)
```

### Distributed Tracing

```bash
# Accéder à Jaeger UI
open http://localhost:16686

# Rechercher les traces par service
- Service: booking-service
- Operation: create_booking
```

---

## 🧪 Tests

### Tests Unitaires

```bash
# Tester un service spécifique
cd services/auth-service
npm test

# Avec coverage
npm run test:coverage
```

### Tests d'Intégration

```bash
# Lancer les tests d'intégration
docker-compose -f docker-compose.test.yml up --abort-on-container-exit

# Tester la communication entre services
npm run test:integration
```

### Tests de Charge

```bash
# Installer k6
brew install k6

# Lancer un test de charge
k6 run scripts/load-tests/booking-test.js

# Avec Grafana dashboard
k6 run --out influxdb=http://localhost:8086/k6 scripts/load-tests/booking-test.js
```

---

## 🔧 Troubleshooting

### Les services ne démarrent pas

```bash
# Vérifier les logs
docker-compose logs [service-name]

# Vérifier la santé des containers
docker-compose ps

# Vérifier les ports utilisés
lsof -i :3001
lsof -i :4001

# Nettoyer et redémarrer
docker-compose down -v
docker-compose up -d --build
```

### Problèmes de connexion base de données

```bash
# Vérifier que PostgreSQL est prêt
docker-compose exec postgres pg_isready

# Vérifier MongoDB
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Vérifier Redis
docker-compose exec redis redis-cli ping
```

### Problèmes de performances

```bash
# Voir l'utilisation CPU/Mémoire
docker stats

# Augmenter les ressources Docker
# Docker Desktop > Preferences > Resources

# Scaler les services lents
docker-compose up -d --scale booking-service=3
```

### Problèmes de réseau

```bash
# Inspecter le réseau Docker
docker network inspect hometrip-microservices_hometrip-network

# Tester la connectivité entre services
docker-compose exec auth-service ping booking-service

# Vérifier DNS resolution
docker-compose exec auth-service nslookup booking-service
```

---

## 📦 Déploiement Production

### 1. Préparer l'environnement

```bash
# Copier le fichier de production
cp .env.example .env.prod

# Éditer avec les vraies valeurs
nano .env.prod
```

### 2. Build les images

```bash
# Build toutes les images
docker-compose -f docker-compose.prod.yml build

# Tag et push vers registry
docker tag hometrip/auth-service:latest registry.example.com/hometrip/auth-service:v1.0.0
docker push registry.example.com/hometrip/auth-service:v1.0.0
```

### 3. Déployer

```bash
# Docker Swarm
docker stack deploy -c docker-compose.prod.yml hometrip

# Kubernetes
kubectl apply -f k8s/

# Vérifier le déploiement
kubectl get pods -n hometrip
```

---

## 🔐 Sécurité

### SSL/TLS Configuration

```bash
# Générer certificats Let's Encrypt
certbot certonly --standalone -d api.hometrip.com

# Ou utiliser Certbot avec Nginx
certbot --nginx -d api.hometrip.com
```

### Secrets Management

```bash
# Utiliser Docker Secrets (Swarm)
echo "my-secret-value" | docker secret create db_password -

# Utiliser Kubernetes Secrets
kubectl create secret generic db-credentials \
  --from-literal=username=hometrip \
  --from-literal=password=secure-password
```

---

## 📚 Ressources

- [Architecture complète](./ARCHITECTURE.md)
- [Documentation API](./docs/API.md)
- [Guide de contribution](./CONTRIBUTING.md)
- [Changelog](./CHANGELOG.md)

---

## 🆘 Support

- **Issues**: GitHub Issues
- **Email**: support@hometrip.com
- **Slack**: #hometrip-dev

---

**Dernière mise à jour**: 2025-11-16
**Version**: 1.0.0
