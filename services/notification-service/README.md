# Notification Service - HomeTrip Microservices

Service complet de notifications pour la plateforme HomeTrip, gérant les notifications email, SMS et in-app.

## Caractéristiques

- **Email Notifications** - Templates HTML personnalisés avec Nodemailer
- **SMS Notifications** - Intégration Twilio pour notifications par SMS
- **Push Notifications** - Support optionnel avec Firebase
- **In-App Notifications** - Notifications stockées dans MongoDB
- **Event-Driven Architecture** - S'abonne aux événements RabbitMQ
- **Notification History** - Historique complet avec statut d'envoi
- **Multi-Channel** - Supporté email, SMS, push, et in-app

## Stack Technologique

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB
- **Message Queue**: RabbitMQ
- **Email**: Nodemailer
- **SMS**: Twilio API
- **Container**: Docker

## Installation

### Prérequis

- Node.js 14+
- MongoDB
- RabbitMQ
- Compte Twilio (optionnel)
- Compte Gmail/SMTP (optionnel)

### Configuration Locale

```bash
# Cloner le repository
cd /home/arwa/hometrip-microservices/services/notification-service

# Installer les dépendances
npm install

# Créer le fichier .env
cp .env.example .env

# Remplir les variables d'environnement
# Voir la section Configuration ci-dessous
```

## Configuration

### Variables d'Environnement

#### Serveur
- `PORT` - Port du serveur (défaut: 4009)
- `NODE_ENV` - Environnement (development/production)
- `HOST` - Host du serveur

#### Base de Données
- `MONGODB_URI` - URL de connexion MongoDB

#### Email (SMTP)
- `EMAIL_HOST` - Serveur SMTP (ex: smtp.gmail.com)
- `EMAIL_PORT` - Port SMTP (ex: 587)
- `EMAIL_USER` - Utilisateur email
- `EMAIL_PASSWORD` - Mot de passe email
- `EMAIL_FROM` - Adresse de départ

#### SMS (Twilio)
- `TWILIO_ACCOUNT_SID` - Account SID Twilio
- `TWILIO_AUTH_TOKEN` - Auth Token Twilio
- `TWILIO_PHONE_NUMBER` - Numéro Twilio

#### RabbitMQ
- `RABBITMQ_URL` - URL de connexion RabbitMQ

#### Frontend
- `FRONTEND_URL` - URL du frontend pour les liens

### Exemple .env

```env
PORT=4009
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/hometrip-notifications
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=app-password
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=xxx...
TWILIO_PHONE_NUMBER=+1234567890
RABBITMQ_URL=amqp://localhost:5672
FRONTEND_URL=http://localhost:3000
```

## Démarrage

### Mode Développement

```bash
npm install
npm run dev
```

### Mode Production

```bash
npm install --production
npm start
```

### Docker

```bash
# Build l'image
docker build -t hometrip-notification-service:1.0.0 .

# Lancer le conteneur
docker run -d \
  --name notification-service \
  -p 4009:4009 \
  --env-file .env \
  hometrip-notification-service:1.0.0
```

## API Endpoints

### Notifications

#### GET /api/notifications
Récupérer toutes les notifications de l'utilisateur

**Paramètres Query:**
- `page` - Numéro de page (défaut: 1)
- `limit` - Nombre par page (défaut: 20)
- `isRead` - Filtrer par statut de lecture (true/false)
- `category` - Filtrer par catégorie

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [...],
    "pagination": {...},
    "unreadCount": 5
  }
}
```

#### GET /api/notifications/:id
Récupérer une notification spécifique

#### PUT /api/notifications/:id/read
Marquer une notification comme lue

#### PUT /api/notifications/:id/unread
Marquer une notification comme non lue

#### PUT /api/notifications/mark-all-read
Marquer toutes les notifications comme lues

#### PUT /api/notifications/:id/archive
Archiver une notification

#### DELETE /api/notifications/:id
Supprimer une notification

#### DELETE /api/notifications/bulk-delete
Supprimer plusieurs notifications

**Body:**
```json
{
  "ids": ["id1", "id2", ...]
}
```

#### GET /api/notifications/unread-count
Obtenir le nombre de notifications non lues

## Types de Notifications

### Réservations
- `booking_request` - Nouvelle demande de réservation
- `booking_confirmed` - Réservation confirmée
- `booking_cancelled` - Réservation annulée
- `booking_modified` - Réservation modifiée
- `check_in_reminder` - Rappel check-in
- `check_out_reminder` - Rappel check-out

### Paiements
- `payment_received` - Paiement reçu
- `payment_failed` - Paiement échoué
- `refund_processed` - Remboursement traité
- `payout_sent` - Versement effectué

### Messages
- `new_message` - Nouveau message
- `message_reply` - Réponse au message

### Avis
- `review_received` - Nouvel avis reçu
- `review_reminder` - Rappel de laisser un avis

### Compte
- `user_created` - Nouvel utilisateur
- `account_verified` - Compte vérifié
- `identity_verification_required` - Vérification requise

## Événements RabbitMQ

Le service s'abonne aux événements suivants:

### user.created
Nouvel utilisateur créé
```json
{
  "userId": "user-id",
  "email": "user@example.com",
  "fullName": "John Doe",
  "verificationToken": "token"
}
```

### booking.created
Nouvelle réservation demandée
```json
{
  "bookingId": "booking-id",
  "guestId": "guest-id",
  "hostId": "host-id",
  "guestName": "John",
  "hostName": "Jane",
  "listingTitle": "Beautiful Apartment",
  "checkIn": "2024-01-15",
  "checkOut": "2024-01-20"
}
```

### booking.confirmed
Réservation confirmée
```json
{
  "bookingId": "booking-id",
  "guestId": "guest-id",
  "guestEmail": "guest@example.com",
  "guestName": "John"
}
```

### booking.cancelled
Réservation annulée
```json
{
  "bookingId": "booking-id",
  "guestId": "guest-id",
  "cancellationReason": "Host cancelled"
}
```

### payment.failed
Paiement échoué
```json
{
  "userId": "user-id",
  "bookingId": "booking-id",
  "errorMessage": "Card declined"
}
```

### payment.refunded
Remboursement effectué
```json
{
  "userId": "user-id",
  "amount": 500,
  "bookingId": "booking-id"
}
```

### message.sent
Nouveau message
```json
{
  "messageId": "msg-id",
  "senderId": "sender-id",
  "recipientId": "recipient-id",
  "preview": "Message content"
}
```

### review.created
Nouvel avis
```json
{
  "reviewId": "review-id",
  "listingOwnerId": "owner-id",
  "reviewerName": "John",
  "rating": 5,
  "comment": "Great place!"
}
```

## Templates Email

### Emails Implémentés
- User Confirmation - Confirmation d'inscription
- New Reservation Request - Nouvelle demande de réservation
- Reservation Confirmed - Réservation confirmée
- Reservation Cancelled - Réservation annulée
- Payment Failed - Paiement échoué
- Refund Confirmation - Remboursement effectué
- New Message - Nouveau message
- Review Received - Nouvel avis reçu

## Health Checks

### GET /health
```json
{
  "status": "healthy",
  "database": {
    "connected": true,
    "readyState": 1
  }
}
```

### GET /ready
Pour les vérifications Kubernetes readiness

### GET /metrics
Métriques de performance

## Logging

Les logs sont écrits dans `/app/logs/`:
- `error.log` - Erreurs
- `warn.log` - Avertissements
- `info.log` - Informations
- `all.log` - Tous les logs

Niveau de log configurable via `LOG_LEVEL`

## Authentification

Les endpoints API nécessitent une authentification:

```bash
# Bearer Token
curl -H "Authorization: Bearer eyJ..." http://localhost:4009/api/notifications

# ou X-Auth-Token
curl -H "X-Auth-Token: eyJ..." http://localhost:4009/api/notifications

# ou en développement avec X-User-ID
curl -H "X-User-Id: user-123" http://localhost:4009/api/notifications
```

## Tests

```bash
# Lancer les tests
npm test

# Tests avec watch
npm run test:watch
```

## Performance

### Optimisations
- Index MongoDB composés
- Pagination par défaut
- Rate limiting sur les endpoints
- Compression des réponses
- Connection pooling

### Limites
- Défaut: 100 requêtes par 15 minutes par IP
- Taille max du body: 10MB

## Déploiement

### Docker Compose
```yaml
version: '3.9'
services:
  notification-service:
    build: .
    ports:
      - "4009:4009"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/hometrip-notifications
      - RABBITMQ_URL=amqp://rabbitmq:5672
    depends_on:
      - mongo
      - rabbitmq
```

### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notification-service
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
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: notification-secrets
              key: mongodb-uri
        livenessProbe:
          httpGet:
            path: /health
            port: 4009
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 4009
          initialDelaySeconds: 10
          periodSeconds: 5
```

## Troubleshooting

### Emails non envoyés
1. Vérifier les credentials Gmail/SMTP
2. Activer "Less secure app access" pour Gmail
3. Vérifier les logs: `logs/error.log`

### SMS non envoyés
1. Vérifier les credentials Twilio
2. Vérifier le numéro Twilio
3. Vérifier le solde Twilio

### Events non reçus
1. Vérifier la connexion RabbitMQ
2. Vérifier que les événements sont publiés
3. Vérifier le binding des queues

## License

ISC

## Support

Pour support: support@hometrip.com
