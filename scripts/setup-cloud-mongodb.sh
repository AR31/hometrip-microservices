#!/bin/bash

# Script pour configurer MongoDB Cloud (Atlas) dans tous les microservices

set -e

echo "═══════════════════════════════════════════════════════════"
echo "  🌐 Configuration MongoDB Cloud pour tous les services"
echo "═══════════════════════════════════════════════════════════"
echo

# Demander l'URI MongoDB
if [ -z "$1" ]; then
    echo "📝 Entrez votre URI MongoDB Cloud:"
    echo "   (Format: mongodb+srv://user:password@cluster.mongodb.net/)"
    echo
    read -p "URI MongoDB: " MONGODB_URI
else
    MONGODB_URI="$1"
fi

if [ -z "$MONGODB_URI" ]; then
    echo "❌ URI MongoDB requis"
    exit 1
fi

echo
echo "📋 Mise à jour des fichiers .env..."
echo

SERVICES_DIR="services"

# Array of services
declare -A SERVICE_DBS=(
  ["api-gateway"]="api_gateway_db"
  ["auth-service"]="auth_db"
  ["user-service"]="user_db"
  ["listing-service"]="listing_db"
  ["booking-service"]="booking_db"
  ["payment-service"]="payment_db"
  ["message-service"]="message_db"
  ["notification-service"]="notification_db"
  ["review-service"]="review_db"
  ["search-service"]="search_db"
  ["analytics-service"]="analytics_db"
  ["websocket-gateway"]="websocket_db"
  ["logger-service"]="logger_db"
)

for service in "${!SERVICE_DBS[@]}"; do
    SERVICE_PATH="$SERVICES_DIR/$service"
    DB_NAME="${SERVICE_DBS[$service]}"
    ENV_FILE="$SERVICE_PATH/.env"

    if [ -f "$ENV_FILE" ]; then
        # Construire l'URI avec le nom de la base de données
        # Si l'URI se termine par /, on ajoute juste le nom de la DB
        # Si l'URI contient déjà un nom de DB, on le remplace

        if [[ "$MONGODB_URI" == *"/"* ]]; then
            # Enlever tout ce qui suit le dernier / et ajouter le nom de la DB
            BASE_URI="${MONGODB_URI%/*}"
            FULL_URI="${BASE_URI}/${DB_NAME}"
        else
            # Ajouter / et le nom de la DB
            FULL_URI="${MONGODB_URI}/${DB_NAME}"
        fi

        # Remplacer la ligne MONGODB_URI dans le .env
        sed -i "s|MONGODB_URI=.*|MONGODB_URI=${FULL_URI}|g" "$ENV_FILE"

        echo "   ✅ $service → ${DB_NAME}"
    else
        echo "   ⚠️  $service - .env non trouvé"
    fi
done

echo
echo "✅ Configuration terminée!"
echo
echo "📌 URI de base: ${MONGODB_URI%/*}/"
echo "   Chaque service utilise sa propre base de données"
echo
echo "🚀 Vous pouvez maintenant démarrer les services:"
echo "   npx tsx scripts/dev.ts start"
echo
