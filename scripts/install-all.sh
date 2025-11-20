#!/bin/bash

# Script pour installer les dépendances de tous les microservices

echo "📦 Installation des dépendances pour tous les microservices..."
echo ""

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

SERVICES_DIR="/home/arwa/hometrip-microservices/services"

for service in "${SERVICES[@]}"; do
  SERVICE_PATH="$SERVICES_DIR/$service"

  if [ -d "$SERVICE_PATH" ]; then
    if [ -f "$SERVICE_PATH/package.json" ]; then
      echo "📦 Installation de $service..."
      cd "$SERVICE_PATH"
      npm install --silent

      if [ $? -eq 0 ]; then
        echo "✅ $service installé"
      else
        echo "❌ Erreur lors de l'installation de $service"
      fi
    else
      echo "⚠️  $service: package.json non trouvé"
    fi
  else
    echo "⚠️  $service: dossier non trouvé"
  fi

  echo ""
done

echo "✅ Installation terminée!"
