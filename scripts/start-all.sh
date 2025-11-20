#!/bin/bash

# Script pour démarrer le frontend et tous les microservices
# Vérifie MongoDB et démarre tout automatiquement

set -e

echo "═══════════════════════════════════════════════════════════"
echo "  🚀 HomeTrip - Starting Full Stack"
echo "═══════════════════════════════════════════════════════════"
echo

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier MongoDB
echo "📊 Checking MongoDB..."

# Vérifier si MongoDB Cloud est configuré (check dans un service)
if grep -q "mongodb+srv://" ~/hometrip-microservices/services/auth-service/.env 2>/dev/null; then
    echo -e "${GREEN}✅ MongoDB Cloud configured (Atlas)${NC}"
elif systemctl is-active --quiet mongod 2>/dev/null; then
    echo -e "${GREEN}✅ MongoDB is running locally${NC}"
elif command -v mongod >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  MongoDB installed but not running${NC}"
    echo "   Starting MongoDB..."
    sudo systemctl start mongod 2>/dev/null && echo -e "${GREEN}✅ MongoDB started${NC}" || {
        echo -e "${YELLOW}⚠️  Could not start local MongoDB${NC}"
        echo -e "${YELLOW}   Assuming MongoDB Cloud is configured...${NC}"
    }
else
    echo -e "${YELLOW}⚠️  Local MongoDB not installed${NC}"
    echo -e "${YELLOW}   Assuming MongoDB Cloud is configured...${NC}"
    echo
    echo "   If services fail, configure MongoDB Cloud:"
    echo "   bash scripts/setup-cloud-mongodb.sh"
    echo
fi

echo
echo "🔧 Starting Microservices..."
cd ~/hometrip-microservices

# Arrêter les services existants
npx tsx scripts/dev.ts stop 2>/dev/null || true

# Démarrer les microservices
npx tsx scripts/dev.ts start

echo
echo "⏳ Waiting for services to initialize (5 seconds)..."
sleep 5

echo
echo "📊 Checking services status..."
npx tsx scripts/dev.ts status

echo
echo "🌐 Starting Frontend..."
cd ~/hometrip

# Vérifier si le port 3100 est libre
if lsof -Pi :3100 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 3100 already in use${NC}"
    echo "   Killing process on port 3100..."
    lsof -ti:3100 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Démarrer le frontend en arrière-plan
echo "   Starting Next.js on port 3100..."
PORT=3100 npm run dev > ~/hometrip-frontend.log 2>&1 &
FRONTEND_PID=$!

# Sauvegarder le PID
echo $FRONTEND_PID > ~/hometrip-frontend.pid

echo
echo "⏳ Waiting for frontend to start (10 seconds)..."
sleep 10

echo
echo "═══════════════════════════════════════════════════════════"
echo "  ✅ FULL STACK STARTED"
echo "═══════════════════════════════════════════════════════════"
echo
echo "🌐 URLs:"
echo "   Frontend:        http://localhost:3100"
echo "   API Gateway:     http://localhost:3100"
echo "   Swagger Docs:    http://localhost:3001/api-docs (auth)"
echo
echo "📊 Services Status:"
cd ~/hometrip-microservices
npx tsx scripts/dev.ts status | grep "✅"
echo
echo "📝 Logs:"
echo "   Backend:  tail -f ~/hometrip-microservices/logs/*_error.log"
echo "   Frontend: tail -f ~/hometrip-frontend.log"
echo
echo "🛑 To stop:"
echo "   ~/hometrip-microservices/scripts/stop-all.sh"
echo
echo "═══════════════════════════════════════════════════════════"
