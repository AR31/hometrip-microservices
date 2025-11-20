#!/bin/bash

# Script de test d'intégration Frontend <-> Microservices
# Ce script teste la communication entre le frontend HomeTrip et les microservices

set -e

echo "======================================"
echo "  TEST D'INTÉGRATION FRONTEND <-> MICROSERVICES"
echo "======================================"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Compteurs
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Fichier de rapport
REPORT_FILE="integration-test-report-$(date +%Y%m%d-%H%M%S).md"

# Fonction pour logger
log_test() {
    local status=$1
    local test_name=$2
    local details=$3

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ "$status" == "PASS" ]; then
        echo -e "${GREEN}✓${NC} $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo "- ✅ **$test_name**: PASS" >> "$REPORT_FILE"
    else
        echo -e "${RED}✗${NC} $test_name"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo "- ❌ **$test_name**: FAIL - $details" >> "$REPORT_FILE"
    fi

    if [ -n "$details" ]; then
        echo "  Details: $details" >> "$REPORT_FILE"
    fi
}

# Initialiser le rapport
cat > "$REPORT_FILE" << 'EOF'
# 📊 RAPPORT DE TEST D'INTÉGRATION FRONTEND <-> MICROSERVICES

**Date:** $(date '+%Y-%m-%d %H:%M:%S')
**Environnement:** Development

---

## 🔍 RÉSULTATS DES TESTS

EOF

echo "Génération du rapport: $REPORT_FILE"
echo ""

# ==========================================
# 1. VÉRIFICATION DES PORTS
# ==========================================

echo -e "${BLUE}[1/7]${NC} Vérification des ports des services..."
echo "" >> "$REPORT_FILE"
echo "### 1. Vérification des Ports" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Ports à vérifier
declare -A PORTS=(
    ["API Gateway"]="3100"
    ["Auth Service"]="4001"
    ["User Service"]="4002"
    ["Listing Service"]="4003"
    ["Booking Service"]="4004"
    ["Experience Service"]="4011"
    ["Wishlist Service"]="4012"
    ["Gift Card Service"]="4013"
    ["Dispute Service"]="4014"
)

for service in "${!PORTS[@]}"; do
    port=${PORTS[$service]}
    if ss -tuln | grep -q ":$port "; then
        log_test "PASS" "$service (port $port)"
    else
        log_test "FAIL" "$service (port $port)" "Service non démarré"
    fi
done

echo ""

# ==========================================
# 2. HEALTH CHECKS
# ==========================================

echo -e "${BLUE}[2/7]${NC} Tests des endpoints /health..."
echo "" >> "$REPORT_FILE"
echo "### 2. Health Checks" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

declare -A HEALTH_URLS=(
    ["API Gateway"]="http://localhost:3100/health"
    ["Auth Service"]="http://localhost:4001/health"
    ["User Service"]="http://localhost:4002/health"
    ["Listing Service"]="http://localhost:4003/health"
    ["Booking Service"]="http://localhost:4004/health"
    ["Experience Service"]="http://localhost:4011/health"
    ["Wishlist Service"]="http://localhost:4012/health"
    ["Gift Card Service"]="http://localhost:4013/health"
    ["Dispute Service"]="http://localhost:4014/health"
)

for service in "${!HEALTH_URLS[@]}"; do
    url=${HEALTH_URLS[$service]}
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

    if [ "$response" == "200" ]; then
        log_test "PASS" "$service health check"
    else
        log_test "FAIL" "$service health check" "HTTP $response"
    fi
done

echo ""

# ==========================================
# 3. CONFIGURATION FRONTEND
# ==========================================

echo -e "${BLUE}[3/7]${NC} Vérification configuration frontend..."
echo "" >> "$REPORT_FILE"
echo "### 3. Configuration Frontend" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [ -f "/home/arwa/hopTrip/hometrip/.env" ]; then
    log_test "PASS" "Fichier .env présent"

    # Vérifier variables critiques
    if grep -q "NEXT_PUBLIC_API_URL" "/home/arwa/hopTrip/hometrip/.env"; then
        api_url=$(grep "NEXT_PUBLIC_API_URL" "/home/arwa/hopTrip/hometrip/.env" | cut -d'=' -f2)
        log_test "PASS" "NEXT_PUBLIC_API_URL configuré" "$api_url"
    else
        log_test "FAIL" "NEXT_PUBLIC_API_URL manquant"
    fi

    if grep -q "NEXT_PUBLIC_GATEWAY_URL" "/home/arwa/hopTrip/hometrip/.env"; then
        gateway_url=$(grep "NEXT_PUBLIC_GATEWAY_URL" "/home/arwa/hopTrip/hometrip/.env" | cut -d'=' -f2)
        log_test "PASS" "NEXT_PUBLIC_GATEWAY_URL configuré" "$gateway_url"
    else
        log_test "FAIL" "NEXT_PUBLIC_GATEWAY_URL manquant"
    fi
else
    log_test "FAIL" "Fichier .env manquant"
fi

echo ""

# ==========================================
# 4. TEST ENDPOINTS API CRITIQUES
# ==========================================

echo -e "${BLUE}[4/7]${NC} Tests des endpoints API critiques via Gateway..."
echo "" >> "$REPORT_FILE"
echo "### 4. Tests des Endpoints API" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Endpoints à tester (sans authentification)
declare -A ENDPOINTS=(
    ["GET /api/listings"]="http://localhost:3100/api/listings"
    ["GET /api/experiences"]="http://localhost:3100/api/experiences"
    ["GET /api/wishlists"]="http://localhost:3100/api/wishlists"
)

for endpoint in "${!ENDPOINTS[@]}"; do
    url=${ENDPOINTS[$endpoint]}
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

    # 200 OK ou 401 Unauthorized sont acceptables (dépend de l'auth)
    if [ "$response" == "200" ] || [ "$response" == "401" ] || [ "$response" == "404" ]; then
        log_test "PASS" "$endpoint" "HTTP $response"
    else
        log_test "FAIL" "$endpoint" "HTTP $response (attendu 200/401/404)"
    fi
done

echo ""

# ==========================================
# 5. TEST SWAGGER/API DOCS
# ==========================================

echo -e "${BLUE}[5/7]${NC} Tests de la documentation API..."
echo "" >> "$REPORT_FILE"
echo "### 5. Documentation API (Swagger)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

declare -A DOCS_URLS=(
    ["Experience Service"]="http://localhost:4011/api-docs"
    ["Wishlist Service"]="http://localhost:4012/api-docs"
    ["Gift Card Service"]="http://localhost:4013/api-docs"
    ["Dispute Service"]="http://localhost:4014/api-docs"
)

for service in "${!DOCS_URLS[@]}"; do
    url=${DOCS_URLS[$service]}
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

    if [ "$response" == "200" ] || [ "$response" == "301" ]; then
        log_test "PASS" "$service API Docs disponible"
    else
        log_test "FAIL" "$service API Docs" "HTTP $response"
    fi
done

echo ""

# ==========================================
# 6. TEST FICHIERS FRONTEND
# ==========================================

echo -e "${BLUE}[6/7]${NC} Vérification fichiers API frontend..."
echo "" >> "$REPORT_FILE"
echo "### 6. Fichiers API Frontend" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

declare -a REQUIRED_FILES=(
    "/home/arwa/hopTrip/hometrip/lib/api-microservices.ts"
    "/home/arwa/hopTrip/hometrip/lib/api-client.ts"
    "/home/arwa/hopTrip/hometrip/services/giftCardService.ts"
    "/home/arwa/hopTrip/hometrip/services/wishlistService.ts"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        log_test "PASS" "Fichier $(basename $file) présent"
    else
        log_test "FAIL" "Fichier $(basename $file) manquant" "$file"
    fi
done

echo ""

# ==========================================
# 7. TEST CORS
# ==========================================

echo -e "${BLUE}[7/7]${NC} Test CORS Gateway -> Frontend..."
echo "" >> "$REPORT_FILE"
echo "### 7. Tests CORS" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Test avec Origin header
response=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: Content-Type" \
    -X OPTIONS \
    "http://localhost:3100/api/listings" 2>/dev/null || echo "000")

if [ "$response" == "200" ] || [ "$response" == "204" ]; then
    log_test "PASS" "CORS preflight" "HTTP $response"
else
    log_test "FAIL" "CORS preflight" "HTTP $response"
fi

echo ""

# ==========================================
# GÉNÉRATION DU RAPPORT FINAL
# ==========================================

echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "## 📈 STATISTIQUES" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "- **Total Tests:** $TOTAL_TESTS" >> "$REPORT_FILE"
echo "- **✅ Réussis:** $PASSED_TESTS" >> "$REPORT_FILE"
echo "- **❌ Échoués:** $FAILED_TESTS" >> "$REPORT_FILE"
echo "- **Taux de réussite:** $(awk "BEGIN {printf \"%.1f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")%" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Ajouter recommandations
echo "## 💡 RECOMMANDATIONS" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [ $FAILED_TESTS -gt 0 ]; then
    echo "### Actions requises:" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"

    # Vérifier si les services ne sont pas démarrés
    if ! ss -tuln | grep -q ":3100 "; then
        echo "1. **Démarrer l'API Gateway:**" >> "$REPORT_FILE"
        echo "   \`\`\`bash" >> "$REPORT_FILE"
        echo "   cd /home/arwa/hopTrip/hometrip-microservices/services/api-gateway" >> "$REPORT_FILE"
        echo "   npm run dev" >> "$REPORT_FILE"
        echo "   \`\`\`" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
    fi

    if ! ss -tuln | grep -q ":4011 "; then
        echo "2. **Démarrer les nouveaux services:**" >> "$REPORT_FILE"
        echo "   \`\`\`bash" >> "$REPORT_FILE"
        echo "   cd /home/arwa/hopTrip/hometrip-microservices" >> "$REPORT_FILE"
        echo "   docker-compose up -d experience-service wishlist-service gift-card-service dispute-service" >> "$REPORT_FILE"
        echo "   \`\`\`" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
    fi

    echo "3. **Vérifier les logs des services:**" >> "$REPORT_FILE"
    echo "   \`\`\`bash" >> "$REPORT_FILE"
    echo "   docker-compose logs -f [service-name]" >> "$REPORT_FILE"
    echo "   \`\`\`" >> "$REPORT_FILE"
else
    echo "✅ **Tous les tests sont passés ! L'intégration est fonctionnelle.**" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "*Rapport généré le $(date '+%Y-%m-%d à %H:%M:%S')*" >> "$REPORT_FILE"

# ==========================================
# RÉSUMÉ CONSOLE
# ==========================================

echo "======================================"
echo "  RÉSUMÉ"
echo "======================================"
echo ""
echo -e "Total Tests:    $TOTAL_TESTS"
echo -e "${GREEN}Réussis:        $PASSED_TESTS${NC}"
echo -e "${RED}Échoués:        $FAILED_TESTS${NC}"
echo -e "Taux de réussite: $(awk "BEGIN {printf \"%.1f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")%"
echo ""
echo -e "${BLUE}Rapport complet:${NC} $REPORT_FILE"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✅ TOUS LES TESTS SONT PASSÉS !${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Certains tests ont échoué. Consultez le rapport pour plus de détails.${NC}"
    exit 1
fi
