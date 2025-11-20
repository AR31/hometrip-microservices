#!/bin/bash

# Script de fusion automatique des microservices
# Usage: ./merge-services.sh

set -e  # Exit on error

SERVICES_DIR="/home/arwa/hopTrip/hometrip-microservices/services"
cd "$SERVICES_DIR"

echo "🚀 Début de la fusion des microservices..."
echo ""

# ====================================================================
# 1. FUSION: Auth & Security Service (Port 5001)
# ====================================================================
echo "📦 1. Création de auth-security-service..."

TARGET="auth-security-service"
mkdir -p "$TARGET/src"

# Copier auth-service comme base
echo "   └─ Copie de auth-service (base)..."
cp -r auth-service/* "$TARGET/"

# Créer la structure modulaire
echo "   └─ Création structure modulaire..."
mkdir -p "$TARGET/src/modules"/{auth,users,twoFactor,identity}

# Déplacer les fichiers auth existants dans le module auth
echo "   └─ Réorganisation module auth..."
mkdir -p "$TARGET/src/modules/auth"
if [ -f "$TARGET/src/controllers/authController.js" ]; then
    mv "$TARGET/src/controllers/authController.js" "$TARGET/src/modules/auth/auth.controller.js"
fi
if [ -f "$TARGET/src/routes/auth.js" ]; then
    mv "$TARGET/src/routes/auth.js" "$TARGET/src/modules/auth/auth.routes.js"
fi

# Copier le code user-service dans le module users
echo "   └─ Intégration de user-service..."
mkdir -p "$TARGET/src/modules/users"
if [ -f "user-service/src/controllers/userController.js" ]; then
    cp "user-service/src/controllers/userController.js" "$TARGET/src/modules/users/users.controller.js"
fi
if [ -f "user-service/src/routes/users.js" ]; then
    cp "user-service/src/routes/users.js" "$TARGET/src/modules/users/users.routes.js"
fi

# Copier two-factor-service
echo "   └─ Intégration de two-factor-service..."
mkdir -p "$TARGET/src/modules/twoFactor"
if [ -d "two-factor-service/src/controllers" ]; then
    cp two-factor-service/src/controllers/*.js "$TARGET/src/modules/twoFactor/" 2>/dev/null || true
fi
if [ -d "two-factor-service/src/routes" ]; then
    cp two-factor-service/src/routes/*.js "$TARGET/src/modules/twoFactor/" 2>/dev/null || true
fi

# Copier identity-verification-service
echo "   └─ Intégration de identity-verification-service..."
mkdir -p "$TARGET/src/modules/identity"
if [ -d "identity-verification-service/src/controllers" ]; then
    cp identity-verification-service/src/controllers/*.js "$TARGET/src/modules/identity/" 2>/dev/null || true
fi
if [ -d "identity-verification-service/src/routes" ]; then
    cp identity-verification-service/src/routes/*.js "$TARGET/src/modules/identity/" 2>/dev/null || true
fi

# Mettre à jour le .env avec le nouveau port
echo "   └─ Configuration .env..."
sed -i 's/^PORT=3001$/PORT=5001/' "$TARGET/.env" 2>/dev/null || true
sed -i 's/^SERVICE_NAME=auth-service$/SERVICE_NAME=auth-security-service/' "$TARGET/.env" 2>/dev/null || true

echo "   ✅ auth-security-service créé!"
echo ""

# ====================================================================
# 2. FUSION: Listing & Search Service (Port 3002)
# ====================================================================
echo "📦 2. Création de listing-search-service..."

TARGET="listing-search-service"
mkdir -p "$TARGET/src"

# Copier listing-service comme base
echo "   └─ Copie de listing-service (base)..."
cp -r listing-service/* "$TARGET/"

# Créer structure modulaire
mkdir -p "$TARGET/src/modules"/{listings,search,cancellation}

# Déplacer listings
echo "   └─ Réorganisation module listings..."
mkdir -p "$TARGET/src/modules/listings"
if [ -f "$TARGET/src/controllers/listingController.js" ]; then
    mv "$TARGET/src/controllers/listingController.js" "$TARGET/src/modules/listings/listings.controller.js" 2>/dev/null || true
fi
if [ -f "$TARGET/src/routes/listings.js" ]; then
    mv "$TARGET/src/routes/listings.js" "$TARGET/src/modules/listings/listings.routes.js" 2>/dev/null || true
fi

# Intégrer search-service
echo "   └─ Intégration de search-service..."
mkdir -p "$TARGET/src/modules/search"
if [ -d "search-service/src/controllers" ]; then
    cp search-service/src/controllers/*.js "$TARGET/src/modules/search/" 2>/dev/null || true
fi
if [ -d "search-service/src/routes" ]; then
    cp search-service/src/routes/*.js "$TARGET/src/modules/search/" 2>/dev/null || true
fi

# Intégrer cancellation-policy-service
echo "   └─ Intégration de cancellation-policy-service..."
mkdir -p "$TARGET/src/modules/cancellation"
if [ -d "cancellation-policy-service/src/controllers" ]; then
    cp cancellation-policy-service/src/controllers/*.js "$TARGET/src/modules/cancellation/" 2>/dev/null || true
fi
if [ -d "cancellation-policy-service/src/routes" ]; then
    cp cancellation-policy-service/src/routes/*.js "$TARGET/src/modules/cancellation/" 2>/dev/null || true
fi

# Configuration
sed -i 's/^PORT=.*/PORT=3002/' "$TARGET/.env" 2>/dev/null || true
sed -i 's/^SERVICE_NAME=.*/SERVICE_NAME=listing-search-service/' "$TARGET/.env" 2>/dev/null || true

echo "   ✅ listing-search-service créé!"
echo ""

# ====================================================================
# 3. FUSION: Booking & Reservation Service (Port 3003)
# ====================================================================
echo "📦 3. Création de booking-reservation-service..."

TARGET="booking-reservation-service"
mkdir -p "$TARGET/src"

# Copier booking-service comme base
echo "   └─ Copie de booking-service (base)..."
cp -r booking-service/* "$TARGET/"

# Structure modulaire
mkdir -p "$TARGET/src/modules"/{bookings,disputes}

# Réorganiser bookings
echo "   └─ Réorganisation module bookings..."
mkdir -p "$TARGET/src/modules/bookings"
if [ -f "$TARGET/src/controllers/bookingController.js" ]; then
    mv "$TARGET/src/controllers/bookingController.js" "$TARGET/src/modules/bookings/bookings.controller.js" 2>/dev/null || true
fi
if [ -f "$TARGET/src/routes/bookings.js" ]; then
    mv "$TARGET/src/routes/bookings.js" "$TARGET/src/modules/bookings/bookings.routes.js" 2>/dev/null || true
fi

# Intégrer dispute-service
echo "   └─ Intégration de dispute-service..."
mkdir -p "$TARGET/src/modules/disputes"
if [ -d "dispute-service/src/controllers" ]; then
    cp dispute-service/src/controllers/*.js "$TARGET/src/modules/disputes/" 2>/dev/null || true
fi
if [ -d "dispute-service/src/routes" ]; then
    cp dispute-service/src/routes/*.js "$TARGET/src/modules/disputes/" 2>/dev/null || true
fi

# Configuration
sed -i 's/^PORT=.*/PORT=3003/' "$TARGET/.env" 2>/dev/null || true
sed -i 's/^SERVICE_NAME=.*/SERVICE_NAME=booking-reservation-service/' "$TARGET/.env" 2>/dev/null || true

echo "   ✅ booking-reservation-service créé!"
echo ""

# ====================================================================
# 4. FUSION: Payment & Financial Service (Port 3004)
# ====================================================================
echo "📦 4. Création de payment-financial-service..."

TARGET="payment-financial-service"
mkdir -p "$TARGET/src"

# Copier payment-service comme base
echo "   └─ Copie de payment-service (base)..."
cp -r payment-service/* "$TARGET/"

# Structure modulaire
mkdir -p "$TARGET/src/modules"/{payments,payouts,giftCards,coupons}

# Réorganiser payments
echo "   └─ Réorganisation module payments..."
mkdir -p "$TARGET/src/modules/payments"
if [ -f "$TARGET/src/controllers/paymentController.js" ]; then
    mv "$TARGET/src/controllers/paymentController.js" "$TARGET/src/modules/payments/payments.controller.js" 2>/dev/null || true
fi

# Intégrer payout-service
echo "   └─ Intégration de payout-service..."
mkdir -p "$TARGET/src/modules/payouts"
if [ -d "payout-service/src/controllers" ]; then
    cp payout-service/src/controllers/*.js "$TARGET/src/modules/payouts/" 2>/dev/null || true
fi
if [ -d "payout-service/src/routes" ]; then
    cp payout-service/src/routes/*.js "$TARGET/src/modules/payouts/" 2>/dev/null || true
fi

# Intégrer gift-card-service
echo "   └─ Intégration de gift-card-service..."
mkdir -p "$TARGET/src/modules/giftCards"
if [ -d "gift-card-service/src/controllers" ]; then
    cp gift-card-service/src/controllers/*.js "$TARGET/src/modules/giftCards/" 2>/dev/null || true
fi
if [ -d "gift-card-service/src/routes" ]; then
    cp gift-card-service/src/routes/*.js "$TARGET/src/modules/giftCards/" 2>/dev/null || true
fi

# Intégrer coupon-service
echo "   └─ Intégration de coupon-service..."
mkdir -p "$TARGET/src/modules/coupons"
if [ -d "coupon-service/src/controllers" ]; then
    cp coupon-service/src/controllers/*.js "$TARGET/src/modules/coupons/" 2>/dev/null || true
fi
if [ -d "coupon-service/src/routes" ]; then
    cp coupon-service/src/routes/*.js "$TARGET/src/modules/coupons/" 2>/dev/null || true
fi

# Configuration
sed -i 's/^PORT=.*/PORT=3004/' "$TARGET/.env" 2>/dev/null || true
sed -i 's/^SERVICE_NAME=.*/SERVICE_NAME=payment-financial-service/' "$TARGET/.env" 2>/dev/null || true

echo "   ✅ payment-financial-service créé!"
echo ""

# ====================================================================
# 5. FUSION: Communication Service (Port 3005)
# ====================================================================
echo "📦 5. Création de communication-service..."

TARGET="communication-service"
mkdir -p "$TARGET/src"

# Copier message-service comme base
echo "   └─ Copie de message-service (base)..."
cp -r message-service/* "$TARGET/"

# Structure modulaire
mkdir -p "$TARGET/src/modules"/{messages,notifications,emails,websocket}

# Réorganiser messages
echo "   └─ Réorganisation module messages..."
mkdir -p "$TARGET/src/modules/messages"
if [ -f "$TARGET/src/controllers/messageController.js" ]; then
    mv "$TARGET/src/controllers/messageController.js" "$TARGET/src/modules/messages/messages.controller.js" 2>/dev/null || true
fi

# Intégrer notification-service
echo "   └─ Intégration de notification-service..."
mkdir -p "$TARGET/src/modules/notifications"
if [ -d "notification-service/src/controllers" ]; then
    cp notification-service/src/controllers/*.js "$TARGET/src/modules/notifications/" 2>/dev/null || true
fi
if [ -d "notification-service/src/routes" ]; then
    cp notification-service/src/routes/*.js "$TARGET/src/modules/notifications/" 2>/dev/null || true
fi

# Intégrer email-service
echo "   └─ Intégration de email-service..."
mkdir -p "$TARGET/src/modules/emails"
if [ -d "email-service/src/controllers" ]; then
    cp email-service/src/controllers/*.js "$TARGET/src/modules/emails/" 2>/dev/null || true
fi
if [ -d "email-service/src/routes" ]; then
    cp email-service/src/routes/*.js "$TARGET/src/modules/emails/" 2>/dev/null || true
fi

# Intégrer websocket-gateway
echo "   └─ Intégration de websocket-gateway..."
mkdir -p "$TARGET/src/modules/websocket"
if [ -d "websocket-gateway/src" ]; then
    cp -r websocket-gateway/src/* "$TARGET/src/modules/websocket/" 2>/dev/null || true
fi

# Configuration
sed -i 's/^PORT=.*/PORT=3005/' "$TARGET/.env" 2>/dev/null || true
sed -i 's/^SERVICE_NAME=.*/SERVICE_NAME=communication-service/' "$TARGET/.env" 2>/dev/null || true

echo "   ✅ communication-service créé!"
echo ""

# ====================================================================
# 6. FUSION: Review & Experience Service (Port 3006)
# ====================================================================
echo "📦 6. Création de review-experience-service..."

TARGET="review-experience-service"
mkdir -p "$TARGET/src"

# Copier review-service comme base
echo "   └─ Copie de review-service (base)..."
cp -r review-service/* "$TARGET/"

# Structure modulaire
mkdir -p "$TARGET/src/modules"/{reviews,experiences,wishlists}

# Réorganiser reviews
echo "   └─ Réorganisation module reviews..."
mkdir -p "$TARGET/src/modules/reviews"
if [ -f "$TARGET/src/controllers/reviewController.js" ]; then
    mv "$TARGET/src/controllers/reviewController.js" "$TARGET/src/modules/reviews/reviews.controller.js" 2>/dev/null || true
fi

# Intégrer experience-service
echo "   └─ Intégration de experience-service..."
mkdir -p "$TARGET/src/modules/experiences"
if [ -d "experience-service/src/controllers" ]; then
    cp experience-service/src/controllers/*.js "$TARGET/src/modules/experiences/" 2>/dev/null || true
fi
if [ -d "experience-service/src/routes" ]; then
    cp experience-service/src/routes/*.js "$TARGET/src/modules/experiences/" 2>/dev/null || true
fi

# Intégrer wishlist-service
echo "   └─ Intégration de wishlist-service..."
mkdir -p "$TARGET/src/modules/wishlists"
if [ -d "wishlist-service/src/controllers" ]; then
    cp wishlist-service/src/controllers/*.js "$TARGET/src/modules/wishlists/" 2>/dev/null || true
fi
if [ -d "wishlist-service/src/routes" ]; then
    cp wishlist-service/src/routes/*.js "$TARGET/src/modules/wishlists/" 2>/dev/null || true
fi

# Configuration
sed -i 's/^PORT=.*/PORT=3006/' "$TARGET/.env" 2>/dev/null || true
sed -i 's/^SERVICE_NAME=.*/SERVICE_NAME=review-experience-service/' "$TARGET/.env" 2>/dev/null || true

echo "   ✅ review-experience-service créé!"
echo ""

# ====================================================================
# 7. FUSION: Analytics & Logger Service (Port 3007)
# ====================================================================
echo "📦 7. Création de analytics-logger-service..."

TARGET="analytics-logger-service"
mkdir -p "$TARGET/src"

# Copier analytics-service comme base
echo "   └─ Copie de analytics-service (base)..."
cp -r analytics-service/* "$TARGET/"

# Structure modulaire
mkdir -p "$TARGET/src/modules"/{analytics,logger}

# Réorganiser analytics
echo "   └─ Réorganisation module analytics..."
mkdir -p "$TARGET/src/modules/analytics"
if [ -f "$TARGET/src/controllers/analyticsController.js" ]; then
    mv "$TARGET/src/controllers/analyticsController.js" "$TARGET/src/modules/analytics/analytics.controller.js" 2>/dev/null || true
fi

# Intégrer logger-service
echo "   └─ Intégration de logger-service..."
mkdir -p "$TARGET/src/modules/logger"
if [ -d "logger-service/src/controllers" ]; then
    cp logger-service/src/controllers/*.js "$TARGET/src/modules/logger/" 2>/dev/null || true
fi
if [ -d "logger-service/src/routes" ]; then
    cp logger-service/src/routes/*.js "$TARGET/src/modules/logger/" 2>/dev/null || true
fi

# Configuration
sed -i 's/^PORT=.*/PORT=3007/' "$TARGET/.env" 2>/dev/null || true
sed -i 's/^SERVICE_NAME=.*/SERVICE_NAME=analytics-logger-service/' "$TARGET/.env" 2>/dev/null || true

echo "   ✅ analytics-logger-service créé!"
echo ""

# ====================================================================
# Résumé
# ====================================================================
echo "✅ FUSION TERMINÉE!"
echo ""
echo "📊 Résumé:"
echo "   • 24 services → 8 services fusionnés"
echo "   • Gain: -67% de services"
echo ""
echo "📦 Services créés:"
echo "   1. auth-security-service (Port 5001)"
echo "   2. listing-search-service (Port 3002)"
echo "   3. booking-reservation-service (Port 3003)"
echo "   4. payment-financial-service (Port 3004)"
echo "   5. communication-service (Port 3005)"
echo "   6. review-experience-service (Port 3006)"
echo "   7. analytics-logger-service (Port 3007)"
echo "   8. api-gateway (Port 3100) - Inchangé"
echo ""
echo "⚠️  PROCHAINES ÉTAPES:"
echo "   1. Installer les dépendances: cd [service] && npm install"
echo "   2. Ajuster les imports dans index.js de chaque service"
echo "   3. Tester chaque service: npm run dev"
echo "   4. Mettre à jour l'API Gateway pour router vers les nouveaux services"
echo ""
echo "📚 Documentation complète dans:"
echo "   - AUTH_SECURITY_SERVICE_MIGRATION_GUIDE.md"
echo "   - COMPLETE_ARCHITECTURE_OPTIMIZATION.md"
