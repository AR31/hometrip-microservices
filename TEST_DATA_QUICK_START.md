# 🚀 Guide Rapide - Données de Test HomeTrip

## 📍 Vous êtes ici

Ce guide vous aide à insérer rapidement des données de test dans votre application HomeTrip pour tester toutes les fonctionnalités.

## ⚡ Démarrage Rapide (3 étapes)

### Étape 1: Installer MongoDB

MongoDB n'est pas encore installé sur votre système. Choisissez une option :

**Option A - Installation rapide (Recommandée):**
```bash
# Installer MongoDB Community Edition
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

**Option B - Utiliser MongoDB Atlas (Cloud gratuit):**
- Aller sur https://www.mongodb.com/cloud/atlas/register
- Créer un cluster gratuit
- Obtenir la chaîne de connexion
- La mettre dans le fichier `.env`

📖 **Guide détaillé:** Voir [INSTALLATION_MONGODB.md](services/auth-service/INSTALLATION_MONGODB.md)

---

### Étape 2: Insérer les Données de Test

```bash
cd /home/arwa/hopTrip/hometrip-microservices/services/auth-service

# S'assurer que les dépendances sont installées
npm install

# Exécuter le script d'insertion
node seed-data.js
```

**Résultat attendu:**
```
✅ Connecté à MongoDB
✅ 11 utilisateurs insérés avec succès!

📊 Résumé des utilisateurs créés:
─────────────────────────────────────────────────
👑 Admins: 2
🏠 Hôtes: 3
👤 Utilisateurs: 2
🎫 Invités: 1
─────────────────────────────────────────────────
```

---

### Étape 3: Vérifier les Données

```bash
# Via le script de vérification
node check-data.js

# OU via MongoDB Compass (déjà installé)
# Connexion: mongodb://localhost:27017
# Base de données: hometrip-auth
```

---

## 👥 Comptes de Test Disponibles

### 🔑 Mot de passe universel
**Tous les comptes:** `Password123!`

### Comptes Principaux

| Rôle | Email | Utilisation |
|------|-------|-------------|
| 👑 **Admin** | `admin@hometrip.com` | Accès admin complet |
| 🏠 **Hôte** | `sophie.bernard@example.com` | Tester les fonctionnalités hôte |
| 👤 **User** | `marie.martin@example.com` | Utilisateur vérifié normal |
| 🎫 **Guest** | `pierre.dubois@example.com` | Invité non vérifié |

### Comptes Spéciaux pour Tests

| Type | Email | Description |
|------|-------|-------------|
| 🔐 **2FA** | `secure.user@example.com` | Test authentification 2 facteurs |
| ⏸️ **Suspendu** | `suspended@example.com` | Test compte suspendu |
| 🚫 **Banni** | `banned@example.com` | Test compte banni |

---

## 🧪 Tester les Fonctionnalités

### Test 1: Connexion Admin

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hometrip.com",
    "password": "Password123!"
  }'
```

### Test 2: Connexion Hôte

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sophie.bernard@example.com",
    "password": "Password123!"
  }'
```

### Test 3: Via l'Interface Frontend

1. Démarrer le frontend:
   ```bash
   cd /home/arwa/hopTrip/hometrip
   npm run dev
   ```

2. Ouvrir http://localhost:3000

3. Se connecter avec:
   - Email: `marie.martin@example.com`
   - Password: `Password123!`

---

## 📊 Statistiques des Données

Le script crée automatiquement :

- ✅ **11 utilisateurs** au total
- 👑 **2 administrateurs** avec accès complet
- 🏠 **3 hôtes** avec Stripe configuré
- 👤 **2 utilisateurs réguliers** (1 vérifié, 1 non vérifié)
- 🎫 **1 invité** non vérifié
- 🔐 **1 compte avec 2FA** activé
- ⏸️ **1 compte suspendu** (30 jours)
- 🚫 **1 compte banni**

### Détails des Hôtes

Tous les hôtes ont :
- ✅ Email vérifié
- ✅ Téléphone vérifié
- ✅ Identité vérifiée
- ✅ Badge de vérification
- 💳 Compte Stripe configuré (`isHost: true`)

---

## 🛠️ Commandes Utiles

```bash
# Insérer les données
cd /home/arwa/hopTrip/hometrip-microservices/services/auth-service
node seed-data.js

# Vérifier les données
node check-data.js

# Réinitialiser les données (supprimer et réinsérer)
# Décommenter les lignes 17-18 dans seed-data.js puis:
node seed-data.js

# Démarrer le service d'authentification
npm run dev

# Démarrer MongoDB
sudo systemctl start mongod

# Vérifier le statut MongoDB
sudo systemctl status mongod
```

---

## 📁 Fichiers Créés

```
services/auth-service/
├── seed-data.js                    # Script d'insertion des données
├── check-data.js                   # Script de vérification
├── setup-test-data.sh              # Script tout-en-un
├── SEED_DATA_README.md             # Documentation détaillée
└── INSTALLATION_MONGODB.md         # Guide d'installation MongoDB

hometrip-microservices/
└── TEST_DATA_QUICK_START.md        # Ce fichier
```

---

## 🐛 Problèmes Courants

### ❌ "MongoNetworkError: connect ECONNREFUSED"

**Cause:** MongoDB n'est pas démarré

**Solution:**
```bash
sudo systemctl start mongod
```

---

### ❌ "E11000 duplicate key error"

**Cause:** Les utilisateurs existent déjà

**Solution:** Décommenter les lignes de suppression dans `seed-data.js`:
```javascript
await User.deleteMany({});
console.log('🗑️  Anciennes données supprimées');
```

---

### ❌ "Cannot find module 'bcryptjs'"

**Cause:** Dépendances non installées

**Solution:**
```bash
cd /home/arwa/hopTrip/hometrip-microservices/services/auth-service
npm install
```

---

## 📚 Documentation Complète

Pour plus de détails, consultez :

1. **[SEED_DATA_README.md](services/auth-service/SEED_DATA_README.md)**
   - Description complète de tous les utilisateurs
   - Scénarios de test détaillés
   - Structure des données

2. **[INSTALLATION_MONGODB.md](services/auth-service/INSTALLATION_MONGODB.md)**
   - Guide complet d'installation MongoDB
   - Plusieurs options d'installation
   - Dépannage détaillé

---

## 🎯 Prochaines Étapes

Après avoir inséré les données :

1. ✅ Tester la connexion avec différents rôles
2. ✅ Tester les permissions (admin, host, user, guest)
3. ✅ Tester les comptes suspendus/bannis
4. ✅ Tester l'authentification 2FA
5. ✅ Tester les vérifications d'identité
6. ✅ Ajouter des listings pour les hôtes
7. ✅ Créer des réservations de test

---

## 💡 Astuces

- **MongoDB Compass** est déjà installé sur votre système
  - Connexion: `mongodb://localhost:27017`
  - Base: `hometrip-auth`
  - Collection: `users`

- **Tous les mots de passe** sont `Password123!` pour faciliter les tests

- **Les avatars** utilisent pravatar.cc (service gratuit d'avatars aléatoires)

- **Les hôtes** ont tous un `stripeAccountId` pour tester les paiements

---

## ✅ Checklist de Configuration

- [ ] MongoDB installé et démarré
- [ ] Script `seed-data.js` exécuté avec succès
- [ ] Données vérifiées (11 utilisateurs créés)
- [ ] Test de connexion réussi
- [ ] Frontend testé avec un compte

---

**Créé le:** 2025-11-20
**Version:** 1.0.0
**Services:** Auth Service, User Management
