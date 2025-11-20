# Auth Service

Microservice d'authentification et d'autorisation pour HomeTrip.

## Fonctionnalités

- ✅ Inscription et connexion utilisateur
- ✅ Authentification JWT
- ✅ Gestion des sessions
- ✅ Authentification à deux facteurs (2FA)
- ✅ Vérification d'identité
- ✅ Gestion des rôles et permissions
- ✅ Rate limiting
- ✅ Logging structuré
- ✅ Event-driven communication (RabbitMQ)
- ✅ Service discovery (Consul)
- ✅ Health checks

## API Endpoints

### Public

- `POST /auth/signup` - Créer un nouveau compte
- `POST /auth/login` - Se connecter
- `POST /auth/refresh` - Rafraîchir le token d'accès

### Protected

- `GET /auth/me` - Obtenir les informations de l'utilisateur connecté
- `POST /auth/logout` - Se déconnecter
- `POST /auth/change-password` - Changer le mot de passe

## Installation

```bash
# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Éditer .env avec vos valeurs
nano .env
```

## Développement

```bash
# Démarrer en mode développement
npm run dev

# Démarrer en mode production
npm start

# Lancer les tests
npm test

# Lancer les tests en watch mode
npm run test:watch
```

## Docker

```bash
# Build l'image
docker build -t hometrip/auth-service:latest .

# Lancer le container
docker run -p 4001:4001 --env-file .env hometrip/auth-service:latest
```

## Variables d'environnement

Voir `.env.example` pour la liste complète des variables d'environnement.

### Variables requises

- `JWT_SECRET` - Secret pour signer les tokens JWT
- `MONGODB_URI` - URI de connexion MongoDB

## Architecture

```
auth-service/
├── src/
│   ├── controllers/     # Logique métier
│   ├── models/          # Modèles de données
│   ├── routes/          # Définition des routes
│   ├── middleware/      # Middlewares Express
│   ├── utils/           # Utilitaires
│   ├── config/          # Configuration
│   └── index.js         # Point d'entrée
├── tests/               # Tests unitaires et d'intégration
├── logs/                # Fichiers de logs
├── Dockerfile           # Configuration Docker
└── package.json
```

## Events

### Published

- `user.created` - Quand un nouvel utilisateur s'inscrit
- `user.logged_in` - Quand un utilisateur se connecte
- `user.logged_out` - Quand un utilisateur se déconnecte
- `user.password_changed` - Quand un utilisateur change son mot de passe

### Subscribed

Aucun pour le moment.

## Sécurité

- Mots de passe hashés avec bcrypt (10 rounds)
- Tokens JWT avec expiration
- Rate limiting (100 requêtes / 15 minutes)
- Validation des entrées
- Protection CORS
- Headers de sécurité (Helmet)
- Vérification du statut du compte (banni/suspendu)

## Monitoring

- Health check: `GET /health`
- Readiness check: `GET /ready`
- Metrics: `GET /metrics`

## Logs

Les logs sont stockés dans le dossier `logs/`:
- `combined.log` - Tous les logs
- `error.log` - Logs d'erreurs uniquement

Format: JSON structuré avec Winston

## TODO

- [ ] Réinitialisation de mot de passe par email
- [ ] Vérification d'email
- [ ] OAuth2 (Google, Facebook)
- [ ] Rate limiting Redis-based
- [ ] Métriques Prometheus
- [ ] Tests unitaires complets

## License

MIT
