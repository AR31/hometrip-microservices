#!/bin/bash

echo "🧪 Test Rapide de Tous les Microservices HomeTrip"
echo "=================================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Compteurs
TOTAL=0
SUCCESS=0
FAILED=0

# Fonction de test
test_service() {
    local name=$1
    local port=$2
    TOTAL=$((TOTAL + 1))
    
    echo -n "Testing $name (port $port)... "
    
    response=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:$port/health --connect-timeout 2)
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✅ OK${NC}"
        SUCCESS=$((SUCCESS + 1))
    else
        echo -e "${RED}❌ FAIL (HTTP $response)${NC}"
        FAILED=$((FAILED + 1))
    fi
}

echo "📊 Services de Base (Ports 3001-3012)"
echo "--------------------------------------"
test_service "API Gateway" 3100
test_service "Auth Service" 3001
test_service "User Service" 3002
test_service "Listing Service" 3003
test_service "Booking Service" 3004
test_service "Payment Service" 3005
test_service "Message Service" 3006
test_service "Notification Service" 3007
test_service "Review Service" 3008
test_service "Search Service" 3009
test_service "Analytics Service" 3010
test_service "WebSocket Gateway" 3011
test_service "Logger Service" 3012

echo ""
echo "🎯 Services Phase 1 (Ports 4011-4014)"
echo "--------------------------------------"
test_service "Experience Service" 4011
test_service "Wishlist Service" 4012
test_service "Gift Card Service" 4013
test_service "Dispute Service" 4014

echo ""
echo "⭐ Services Phase 2 - NOUVEAUX (Ports 4015-4021)"
echo "------------------------------------------------"
test_service "Identity Verification" 4015
test_service "Cancellation Policy" 4016
test_service "Coupon Service" 4017
test_service "Two-Factor Auth" 4018
test_service "Payout Service" 4019
test_service "Email Service" 4020
test_service "Payment History" 4021

echo ""
echo "=================================================="
echo "📊 RÉSULTATS"
echo "=================================================="
echo "Total Services: $TOTAL"
echo -e "Succès: ${GREEN}$SUCCESS${NC}"
echo -e "Échecs: ${RED}$FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 Tous les services fonctionnent correctement!${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  $FAILED service(s) ne répondent pas${NC}"
    exit 1
fi
