#!/bin/bash

# Script pour installer Swagger dans tous les microservices

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

echo "📦 Installation de Swagger dans tous les microservices..."
echo

for service in "${SERVICES[@]}"; do
  SERVICE_PATH="$SERVICES_DIR/$service"

  if [ -d "$SERVICE_PATH" ]; then
    echo "📝 Installation Swagger pour $service..."

    cd "$SERVICE_PATH"

    # Installer swagger-ui-express et swagger-jsdoc
    npm install --save swagger-ui-express swagger-jsdoc --silent

    cd ../..

    echo "   ✅ $service - Swagger installé"
  else
    echo "   ⚠️  Service $service non trouvé"
  fi
done

echo
echo "✅ Installation de Swagger terminée!"
echo
echo "📌 Packages installés:"
echo "   - swagger-ui-express: Interface graphique Swagger"
echo "   - swagger-jsdoc: Génération de documentation depuis JSDoc"
