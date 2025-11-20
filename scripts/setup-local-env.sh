#!/bin/bash

# Script to create .env files for local development (without Docker)
# This replaces Docker hostnames with localhost

SERVICES_DIR="services"

# Array of all services
SERVICES=(
  "api-gateway"
  "auth-service"
  "user-service"
  "listing-service"
  "booking-service"
  "payment-service"
  "message-service"
  "notification-service"
  "review-service"
  "search-service"
  "analytics-service"
  "websocket-gateway"
  "logger-service"
)

echo "🔧 Configuration des fichiers .env pour développement local..."
echo

for service in "${SERVICES[@]}"; do
  SERVICE_PATH="$SERVICES_DIR/$service"

  if [ -d "$SERVICE_PATH" ]; then
    echo "📝 Configuration de $service..."

    # Copier .env.example vers .env
    cp "$SERVICE_PATH/.env.example" "$SERVICE_PATH/.env"

    # Remplacer les hostnames Docker par localhost
    sed -i 's/@mongodb:/@localhost:/g' "$SERVICE_PATH/.env"
    sed -i 's/REDIS_HOST=redis/REDIS_HOST=localhost/g' "$SERVICE_PATH/.env"
    sed -i 's/@rabbitmq:/@localhost:/g' "$SERVICE_PATH/.env"
    sed -i 's/CONSUL_HOST=consul/CONSUL_HOST=localhost/g' "$SERVICE_PATH/.env"

    # Désactiver Consul pour développement local
    sed -i 's/CONSUL_ENABLED=true/CONSUL_ENABLED=false/g' "$SERVICE_PATH/.env"

    echo "   ✅ $service configuré"
  else
    echo "   ⚠️  Service $service non trouvé"
  fi
done

echo
echo "✅ Configuration terminée!"
echo
echo "📌 Notes importantes:"
echo "   - MongoDB URI: mongodb://localhost:27017"
echo "   - Redis: localhost:6379"
echo "   - RabbitMQ: localhost:5672"
echo "   - Consul: désactivé"
echo
echo "🚀 Pour démarrer MongoDB:"
echo "   sudo systemctl start mongod"
echo
echo "💡 Services optionnels (non requis pour démarrage basique):"
echo "   - Redis: sudo systemctl start redis-server"
echo "   - RabbitMQ: sudo systemctl start rabbitmq-server"
