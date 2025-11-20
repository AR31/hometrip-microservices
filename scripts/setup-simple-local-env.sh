#!/bin/bash

# Script to create .env files for local development WITHOUT MongoDB authentication
# This is for development environments where MongoDB runs without auth

SERVICES_DIR="services"

# MongoDB URI without authentication for local development
SIMPLE_MONGO_URI="mongodb://localhost:27017"

# Array of all services and their database names
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

echo "🔧 Configuration simplifiée pour développement local (sans auth MongoDB)..."
echo

for service in "${!SERVICE_DBS[@]}"; do
  SERVICE_PATH="$SERVICES_DIR/$service"
  DB_NAME="${SERVICE_DBS[$service]}"

  if [ -d "$SERVICE_PATH" ]; then
    echo "📝 Configuration de $service..."

    # Copier .env.example vers .env
    cp "$SERVICE_PATH/.env.example" "$SERVICE_PATH/.env"

    # Remplacer le MongoDB URI par une version simple sans auth
    sed -i "s|MONGODB_URI=.*|MONGODB_URI=${SIMPLE_MONGO_URI}/${DB_NAME}|g" "$SERVICE_PATH/.env"

    # Remplacer les autres hostnames Docker par localhost
    sed -i 's/REDIS_HOST=redis/REDIS_HOST=localhost/g' "$SERVICE_PATH/.env"
    sed -i 's/@rabbitmq:/@localhost:/g' "$SERVICE_PATH/.env"
    sed -i 's/CONSUL_HOST=consul/CONSUL_HOST=localhost/g' "$SERVICE_PATH/.env"

    # Désactiver Consul pour développement local
    sed -i 's/CONSUL_ENABLED=true/CONSUL_ENABLED=false/g' "$SERVICE_PATH/.env"

    echo "   ✅ $service → ${SIMPLE_MONGO_URI}/${DB_NAME}"
  else
    echo "   ⚠️  Service $service non trouvé"
  fi
done

echo
echo "✅ Configuration terminée!"
echo
echo "📌 MongoDB URI simplifié: mongodb://localhost:27017/{db_name}"
echo "   (pas d'authentification requise)"
echo
echo "🚀 Pour démarrer MongoDB:"
echo "   sudo systemctl start mongod"
echo
echo "🔍 Vérifier que MongoDB tourne:"
echo "   sudo systemctl status mongod"
echo
echo "💡 Tester la connexion:"
echo "   mongosh --eval \"db.adminCommand('ping')\""
