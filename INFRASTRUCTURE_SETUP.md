# 🔧 Infrastructure Setup - MongoDB, Redis, etc.

## Vue d'ensemble

Les microservices nécessitent certaines infrastructures pour fonctionner :
- **MongoDB** (port 27017) - Base de données principale
- **Redis** (port 6379) - Cache et sessions (optionnel)
- **RabbitMQ** (ports 5672, 15672) - Message queue (optionnel)

## MongoDB Setup

### Vérifier si MongoDB est installé

```bash
mongod --version
```

Si non installé, suivez les instructions d'installation ci-dessous.

### Installation MongoDB (Ubuntu/Debian)

```bash
# Import de la clé GPG
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Ajouter le repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Installer MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Démarrer MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Vérifier le statut
sudo systemctl status mongod
```

### Démarrer/Arrêter MongoDB

```bash
# Démarrer
sudo systemctl start mongod

# Arrêter
sudo systemctl stop mongod

# Redémarrer
sudo systemctl restart mongod

# Statut
sudo systemctl status mongod
```

### Vérifier la connexion

```bash
# Se connecter à MongoDB
mongosh

# Ou avec l'ancien client
mongo

# Lister les bases de données
show dbs

# Quitter
exit
```

## Alternative: MongoDB avec Docker

Si vous préférez utiliser Docker :

```bash
# Démarrer MongoDB dans un conteneur
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  -v mongodb_data:/data/db \
  mongo:7.0

# Vérifier que le conteneur tourne
docker ps | grep mongodb

# Arrêter
docker stop mongodb

# Démarrer (après premier lancement)
docker start mongodb

# Logs
docker logs mongodb
```

## Redis Setup (Optionnel)

### Installation Redis

```bash
# Installation
sudo apt-get update
sudo apt-get install redis-server

# Démarrer
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Vérifier
redis-cli ping
# Devrait retourner: PONG
```

### Redis avec Docker

```bash
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:7-alpine

# Vérifier
docker exec -it redis redis-cli ping
```

## Docker Compose (Recommandé)

Créez un fichier `docker-compose.yml` à la racine de `hometrip-microservices` :

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: hometrip-mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
      MONGO_INITDB_DATABASE: hometrip
    volumes:
      - mongodb_data:/data/db
    networks:
      - hometrip-network

  redis:
    image: redis:7-alpine
    container_name: hometrip-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    networks:
      - hometrip-network

  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: hometrip-rabbitmq
    restart: unless-stopped
    ports:
      - "5672:5672"   # AMQP port
      - "15672:15672" # Management UI
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: password
    networks:
      - hometrip-network

volumes:
  mongodb_data:

networks:
  hometrip-network:
    driver: bridge
```

### Utilisation Docker Compose

```bash
# Démarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter tous les services
docker-compose down

# Arrêter et supprimer les volumes
docker-compose down -v
```

## Configuration des Microservices

### MongoDB Connection String

Assurez-vous que vos microservices utilisent la bonne URL de connexion.

**Sans authentification** (développement local) :
```
mongodb://localhost:27017/hometrip
```

**Avec authentification** (Docker Compose) :
```
mongodb://admin:password@localhost:27017/hometrip?authSource=admin
```

### Vérifier les fichiers .env

Chaque microservice devrait avoir un fichier `.env` avec :

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/hometrip
# ou
MONGODB_URI=mongodb://admin:password@localhost:27017/hometrip?authSource=admin

# Redis (si utilisé)
REDIS_URL=redis://localhost:6379

# RabbitMQ (si utilisé)
RABBITMQ_URL=amqp://admin:password@localhost:5672
```

## Workflow de Développement Complet

### Option 1: Services Système

```bash
# 1. Démarrer MongoDB
sudo systemctl start mongod

# 2. Démarrer Redis (optionnel)
sudo systemctl start redis-server

# 3. Démarrer les microservices
cd ~/hometrip-microservices
npx tsx scripts/dev.ts start
```

### Option 2: Docker Compose

```bash
# 1. Démarrer l'infrastructure
cd ~/hometrip-microservices
docker-compose up -d

# 2. Attendre que MongoDB soit prêt (quelques secondes)
sleep 5

# 3. Démarrer les microservices
npx tsx scripts/dev.ts start
```

## Vérifications

### Vérifier MongoDB

```bash
# Test de connexion
mongosh --eval "db.adminCommand('ping')"

# Ou
mongo --eval "db.adminCommand('ping')"

# Devrait retourner: { ok: 1 }
```

### Vérifier Redis

```bash
redis-cli ping
# Devrait retourner: PONG
```

### Vérifier les ports

```bash
# MongoDB
lsof -i:27017

# Redis
lsof -i:6379

# RabbitMQ
lsof -i:5672
lsof -i:15672
```

## Troubleshooting

### MongoDB ne démarre pas

```bash
# Vérifier les logs
sudo journalctl -u mongod -f

# Vérifier l'espace disque
df -h

# Vérifier les permissions
sudo chown -R mongodb:mongodb /var/lib/mongodb
sudo chown mongodb:mongodb /tmp/mongodb-27017.sock
```

### Services ne peuvent pas se connecter

```bash
# Vérifier que MongoDB écoute sur toutes les interfaces
sudo netstat -tulpn | grep 27017

# Modifier /etc/mongod.conf si nécessaire
net:
  port: 27017
  bindIp: 0.0.0.0  # ou 127.0.0.1 pour local uniquement
```

### Erreur "Too many open files"

```bash
# Augmenter la limite
ulimit -n 65536

# Rendre permanent (ajouter dans /etc/security/limits.conf)
* soft nofile 65536
* hard nofile 65536
```

## Scripts Utiles

### Démarrage Complet

Créez `scripts/start-infrastructure.sh` :

```bash
#!/bin/bash

echo "🚀 Démarrage de l'infrastructure..."

# MongoDB
if systemctl is-active --quiet mongod; then
    echo "✅ MongoDB déjà démarré"
else
    echo "📦 Démarrage de MongoDB..."
    sudo systemctl start mongod
fi

# Redis (optionnel)
if systemctl is-active --quiet redis-server; then
    echo "✅ Redis déjà démarré"
else
    echo "📦 Démarrage de Redis..."
    sudo systemctl start redis-server
fi

echo "✅ Infrastructure prête!"
```

### Arrêt Complet

Créez `scripts/stop-infrastructure.sh` :

```bash
#!/bin/bash

echo "🛑 Arrêt de l'infrastructure..."

# Arrêter les microservices
npx tsx scripts/dev.ts stop

# MongoDB
sudo systemctl stop mongod

# Redis
sudo systemctl stop redis-server

echo "✅ Infrastructure arrêtée!"
```

## Recommandations

1. **Développement Local** : Utilisez MongoDB installé en système
2. **Docker** : Pratique si vous avez déjà Docker
3. **Production** : Utilisez des services managés (MongoDB Atlas, Redis Cloud, etc.)

## Commandes Récapitulatives

```bash
# Vérifier que tout est prêt
mongosh --eval "db.adminCommand('ping')"
redis-cli ping

# Démarrer les microservices
cd ~/hometrip-microservices
npx tsx scripts/dev.ts start

# Vérifier le statut
npx tsx scripts/dev.ts status
```

---

**Note**: La plupart des erreurs de démarrage viennent de MongoDB non démarré. Assurez-vous qu'il tourne avant de lancer les microservices.
