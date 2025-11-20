# ⚡ Commandes Rapides - HomeTrip

## 🚀 Démarrage Rapide

### Première fois - Installation MongoDB

```bash
# Option 1: Installation via APT (Ubuntu/Debian)
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Insérer les Données de Test

```bash
# Aller dans le service auth
cd /home/arwa/hopTrip/hometrip-microservices/services/auth-service

# Installer les dépendances (si nécessaire)
npm install

# Insérer les données
node seed-data.js

# Vérifier les données
node check-data.js

# Voir la liste des comptes de test
node list-test-accounts.js
```

## 📝 Comptes de Test

**Mot de passe pour TOUS les comptes:** `Password123!`

| Rôle | Email | Description |
|------|-------|-------------|
| 👑 Admin | `admin@hometrip.com` | Administrateur |
| 🏠 Hôte | `sophie.bernard@example.com` | Hôte avec Stripe |
| 👤 User | `marie.martin@example.com` | Utilisateur vérifié |
| 🎫 Guest | `pierre.dubois@example.com` | Invité |

## 🎯 Tests Rapides

### Test connexion via curl

```bash
# Admin
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hometrip.com","password":"Password123!"}'

# Hôte
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sophie.bernard@example.com","password":"Password123!"}'
```

### Test via MongoDB Compass

1. Ouvrir MongoDB Compass (déjà installé)
2. Connexion: `mongodb://localhost:27017`
3. Base: `hometrip-auth`
4. Collection: `users`

## 🛠️ Gestion MongoDB

```bash
# Démarrer MongoDB
sudo systemctl start mongod

# Arrêter MongoDB
sudo systemctl stop mongod

# Statut MongoDB
sudo systemctl status mongod

# Connexion shell
mongosh
```

## 📊 Scripts Disponibles

```bash
# Service Auth
cd /home/arwa/hopTrip/hometrip-microservices/services/auth-service

node seed-data.js              # Insérer données test
node check-data.js             # Vérifier données
node list-test-accounts.js     # Liste comptes test
npm run dev                    # Démarrer service
npm test                       # Lancer tests
```

## 📚 Documentation

- [TEST_DATA_QUICK_START.md](TEST_DATA_QUICK_START.md) - Guide complet des données de test
- [services/auth-service/INSTALLATION_MONGODB.md](services/auth-service/INSTALLATION_MONGODB.md) - Installation MongoDB
- [services/auth-service/SEED_DATA_README.md](services/auth-service/SEED_DATA_README.md) - Détails des données

## 🔗 Liens Utiles

- Frontend: http://localhost:3000
- Auth Service: http://localhost:3001
- API Docs: http://localhost:3001/api-docs
- MongoDB Compass: Application déjà installée

---

**Version:** 1.0.0 | **Créé le:** 2025-11-20
