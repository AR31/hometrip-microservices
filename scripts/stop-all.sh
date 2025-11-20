#!/bin/bash

# Script pour arrêter le frontend et tous les microservices

echo "═══════════════════════════════════════════════════════════"
echo "  🛑 HomeTrip - Stopping Full Stack"
echo "═══════════════════════════════════════════════════════════"
echo

echo "🛑 Stopping Frontend..."
if [ -f ~/hometrip-frontend.pid ]; then
    FRONTEND_PID=$(cat ~/hometrip-frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        kill $FRONTEND_PID 2>/dev/null && echo "   ✅ Frontend stopped (PID: $FRONTEND_PID)"
    else
        echo "   ⚠️  Frontend not running"
    fi
    rm ~/hometrip-frontend.pid
else
    echo "   ⚠️  No frontend PID file found"
fi

# Tuer tout processus sur le port 3100
if lsof -Pi :3100 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "   Killing process on port 3100..."
    lsof -ti:3100 | xargs kill -9 2>/dev/null || true
fi

echo
echo "🛑 Stopping Microservices..."
cd ~/hometrip-microservices
npx tsx scripts/dev.ts stop

echo
echo "═══════════════════════════════════════════════════════════"
echo "  ✅ FULL STACK STOPPED"
echo "═══════════════════════════════════════════════════════════"
