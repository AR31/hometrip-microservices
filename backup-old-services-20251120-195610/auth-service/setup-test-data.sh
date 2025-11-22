#!/bin/bash

echo "🚀 Configuration des données de test pour Auth Service"
echo "─────────────────────────────────────────────────────"

# Couleurs pour les messages
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier si MongoDB est installé
if ! command -v mongod &> /dev/null; then
    echo -e "${RED}❌ MongoDB n'est pas installé${NC}"
    echo "Installation de MongoDB..."

    # Détecter le système d'exploitation
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v apt-get &> /dev/null; then
            echo "Installation via apt..."
            sudo apt-get update
            sudo apt-get install -y mongodb
        elif command -v yum &> /dev/null; then
            echo "Installation via yum..."
            sudo yum install -y mongodb mongodb-server
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            echo "Installation via Homebrew..."
            brew tap mongodb/brew
            brew install mongodb-community
        fi
    fi
fi

# Vérifier si MongoDB est en cours d'exécution
if pgrep -x "mongod" > /dev/null; then
    echo -e "${GREEN}✅ MongoDB est déjà en cours d'exécution${NC}"
else
    echo -e "${YELLOW}⚠️  MongoDB n'est pas en cours d'exécution${NC}"
    echo "Démarrage de MongoDB..."

    # Essayer de démarrer MongoDB via systemctl
    if systemctl start mongod 2>/dev/null || systemctl start mongodb 2>/dev/null; then
        echo -e "${GREEN}✅ MongoDB démarré via systemctl${NC}"
    else
        # Démarrer MongoDB manuellement
        echo "Démarrage manuel de MongoDB..."
        mkdir -p /tmp/mongodb/data
        mongod --dbpath /tmp/mongodb/data --fork --logpath /tmp/mongodb/mongod.log 2>/dev/null

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ MongoDB démarré manuellement${NC}"
        else
            echo -e "${RED}❌ Impossible de démarrer MongoDB${NC}"
            echo "Essayez de démarrer MongoDB manuellement avec:"
            echo "  sudo systemctl start mongod"
            echo "ou"
            echo "  mongod --dbpath /path/to/data"
            exit 1
        fi
    fi

    # Attendre que MongoDB soit prêt
    echo "Attente du démarrage de MongoDB..."
    sleep 3
fi

# Vérifier si node_modules existe
cd /home/arwa/hopTrip/hometrip-microservices/services/auth-service

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules n'existe pas${NC}"
    echo "Installation des dépendances..."
    npm install

    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Erreur lors de l'installation des dépendances${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Dépendances installées${NC}"
fi

# Vérifier le fichier .env
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Fichier .env non trouvé${NC}"
    echo "Création d'un fichier .env par défaut..."
    cat > .env << EOF
# MongoDB
MONGO_URI=mongodb://localhost:27017/hometrip-auth

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Service
PORT=3001
NODE_ENV=development

# Redis (optionnel)
REDIS_HOST=localhost
REDIS_PORT=6379

# Email (optionnel)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# Twilio (optionnel)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
EOF
    echo -e "${GREEN}✅ Fichier .env créé${NC}"
fi

echo ""
echo "─────────────────────────────────────────────────────"
echo "📥 Insertion des données de test..."
echo "─────────────────────────────────────────────────────"

# Exécuter le script de seed
node seed-data.js

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Données de test insérées avec succès!${NC}"
    echo ""
    echo "─────────────────────────────────────────────────────"
    echo "📊 Vérification des données..."
    echo "─────────────────────────────────────────────────────"
    echo ""

    # Afficher les données
    node check-data.js

    echo ""
    echo -e "${GREEN}✅ Configuration terminée!${NC}"
    echo ""
    echo "📚 Pour plus d'informations, consultez:"
    echo "   - SEED_DATA_README.md"
    echo ""
    echo "🧪 Commandes utiles:"
    echo "   - Vérifier les données:  node check-data.js"
    echo "   - Réinsérer les données: node seed-data.js"
    echo "   - Démarrer le service:   npm run dev"
else
    echo -e "${RED}❌ Erreur lors de l'insertion des données${NC}"
    exit 1
fi
