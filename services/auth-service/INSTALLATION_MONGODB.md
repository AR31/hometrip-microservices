# 🗄️ Guide d'Installation MongoDB et Insertion des Données de Test

## 📋 Situation Actuelle

MongoDB Compass (l'interface graphique) est installé, mais pas le serveur MongoDB.

## 🚀 Options d'Installation

### Option 1: Installation MongoDB via APT (Recommandé)

#### Étape 1: Installer MongoDB Community Edition

```bash
# Importer la clé publique MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Créer le fichier de liste pour MongoDB
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Mettre à jour les paquets
sudo apt-get update

# Installer MongoDB
sudo apt-get install -y mongodb-org

# Démarrer MongoDB
sudo systemctl start mongod

# Activer MongoDB au démarrage
sudo systemctl enable mongod

# Vérifier le statut
sudo systemctl status mongod
```

#### Étape 2: Insérer les données de test

```bash
cd /home/arwa/hopTrip/hometrip-microservices/services/auth-service
node seed-data.js
```

---

### Option 2: Installation MongoDB via Snap

```bash
# Installer MongoDB via snap
sudo snap install mongodb

# Vérifier l'installation
mongod --version

# MongoDB devrait démarrer automatiquement
# Sinon, vérifier avec:
sudo systemctl status snap.mongodb.mongod
```

---

### Option 3: Utiliser MongoDB Atlas (Cloud - Gratuit)

Si vous ne souhaitez pas installer MongoDB localement, vous pouvez utiliser MongoDB Atlas (gratuit jusqu'à 512 MB).

#### Étape 1: Créer un compte MongoDB Atlas

1. Aller sur https://www.mongodb.com/cloud/atlas/register
2. Créer un compte gratuit
3. Créer un cluster gratuit (M0)
4. Créer un utilisateur de base de données
5. Whitelist votre adresse IP (ou autoriser 0.0.0.0/0 pour le développement)
6. Obtenir la chaîne de connexion

#### Étape 2: Configurer la connexion

Modifier le fichier `.env` dans `/home/arwa/hopTrip/hometrip-microservices/services/auth-service/`:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/hometrip-auth?retryWrites=true&w=majority
```

#### Étape 3: Insérer les données

```bash
cd /home/arwa/hopTrip/hometrip-microservices/services/auth-service
node seed-data.js
```

---

### Option 4: Installation manuelle (pour développement local)

Si vous avez des problèmes avec les méthodes ci-dessus :

```bash
# Télécharger MongoDB
cd /tmp
wget https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-ubuntu2204-7.0.14.tgz

# Extraire
tar -zxvf mongodb-linux-x86_64-ubuntu2204-7.0.14.tgz

# Déplacer vers /usr/local
sudo mv mongodb-linux-x86_64-ubuntu2204-7.0.14 /usr/local/mongodb

# Créer les répertoires nécessaires
sudo mkdir -p /data/db
sudo mkdir -p /var/log/mongodb

# Donner les permissions
sudo chown -R $USER:$USER /data/db
sudo chown -R $USER:$USER /var/log/mongodb

# Ajouter au PATH
echo 'export PATH=/usr/local/mongodb/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Démarrer MongoDB
mongod --dbpath /data/db --logpath /var/log/mongodb/mongod.log --fork

# Vérifier
mongosh --eval "db.version()"
```

---

## 🔧 Après l'Installation

### 1. Vérifier que MongoDB fonctionne

```bash
# Vérifier le processus
ps aux | grep mongod

# Tester la connexion
mongosh --eval "db.version()"
```

### 2. Insérer les données de test

```bash
cd /home/arwa/hopTrip/hometrip-microservices/services/auth-service

# Installer les dépendances si nécessaire
npm install

# Créer le fichier .env si nécessaire
cat > .env << 'EOF'
MONGO_URI=mongodb://localhost:27017/hometrip-auth
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
PORT=3001
NODE_ENV=development
EOF

# Exécuter le script d'insertion
node seed-data.js
```

### 3. Vérifier les données

```bash
# Vérifier que les données sont bien insérées
node check-data.js

# Ou via MongoDB Compass (déjà installé)
# Connecter à: mongodb://localhost:27017
# Base de données: hometrip-auth
# Collection: users
```

---

## 📊 Données de Test Insérées

Le script `seed-data.js` va créer **11 utilisateurs** avec les rôles suivants :

- **2 Admins** (dont admin@hometrip.com)
- **3 Hôtes** avec Stripe configuré
- **2 Utilisateurs réguliers**
- **1 Invité**
- **1 Compte avec 2FA**
- **1 Compte suspendu**
- **1 Compte banni**

**Mot de passe pour tous:** `Password123!`

---

## 🧪 Tester les Fonctionnalités

### Via curl

```bash
# Test de connexion
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hometrip.com",
    "password": "Password123!"
  }'
```

### Via MongoDB Compass

1. Ouvrir MongoDB Compass (déjà installé)
2. Connecter à: `mongodb://localhost:27017`
3. Naviguer vers la base `hometrip-auth`
4. Explorer la collection `users`

---

## 🐛 Dépannage

### Erreur: "connect ECONNREFUSED"

**Problème:** MongoDB n'est pas démarré

**Solution:**
```bash
sudo systemctl start mongod
# ou
mongod --dbpath /data/db --fork --logpath /var/log/mongodb/mongod.log
```

### Erreur: "command not found: mongod"

**Problème:** MongoDB n'est pas dans le PATH

**Solution:**
```bash
# Trouver l'installation
sudo find / -name mongod 2>/dev/null

# Ajouter au PATH ou utiliser le chemin complet
```

### Erreur: "Permission denied"

**Problème:** Pas de permissions pour le répertoire de données

**Solution:**
```bash
sudo chown -R $USER:$USER /data/db
sudo chown -R $USER:$USER /var/log/mongodb
```

---

## 📝 Scripts Disponibles

Une fois MongoDB installé et fonctionnel :

```bash
# Insérer les données de test
node seed-data.js

# Vérifier les données
node check-data.js

# Utiliser le script tout-en-un (si MongoDB est déjà installé)
bash setup-test-data.sh
```

---

## ✅ Checklist

- [ ] MongoDB installé
- [ ] MongoDB démarré (systemctl status mongod)
- [ ] Connexion testée (mongosh)
- [ ] Fichier .env configuré
- [ ] Dépendances npm installées
- [ ] Script seed-data.js exécuté
- [ ] Données vérifiées (check-data.js ou Compass)

---

## 📚 Ressources

- [Documentation MongoDB](https://docs.mongodb.com/manual/installation/)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [MongoDB Compass](https://www.mongodb.com/products/compass)

---

**Besoin d'aide ?** Consultez le fichier `SEED_DATA_README.md` pour plus de détails sur les données de test.
