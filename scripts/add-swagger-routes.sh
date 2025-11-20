#!/bin/bash

# Script pour ajouter les routes Swagger dans tous les microservices

SERVICES_DIR="services"

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

echo "🔧 Ajout des routes Swagger dans tous les microservices..."
echo

for service in "${SERVICES[@]}"; do
  SERVICE_PATH="$SERVICES_DIR/$service"
  INDEX_FILE="$SERVICE_PATH/src/index.js"

  if [ -f "$INDEX_FILE" ]; then
    echo "📝 Ajout route Swagger pour $service..."

    # Vérifier si Swagger n'est pas déjà ajouté
    if grep -q "swagger" "$INDEX_FILE"; then
      echo "   ⚠️  $service - Swagger déjà configuré, skipping..."
      continue
    fi

    # Créer un backup
    cp "$INDEX_FILE" "$INDEX_FILE.backup"

    # Ajouter l'import de Swagger après les autres imports
    # Trouver la ligne "const app = express();" et ajouter avant
    sed -i '/const app = express();/i\
\
// Swagger Documentation\
const { swaggerSpec, swaggerUi, swaggerUiOptions } = require('"'"'./config/swagger'"'"');
' "$INDEX_FILE"

    # Ajouter la route Swagger après les routes existantes mais avant le 404 handler
    # Trouver "// 404 handler" et ajouter avant
    sed -i '/\/\/ 404 handler/i\
\
// Swagger API Documentation\
app.use('"'"'/api-docs'"'"', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));\
\
/**\
 * @swagger\
 * /api-docs:\
 *   get:\
 *     summary: API Documentation\
 *     description: Interactive API documentation using Swagger UI\
 *     tags: [Documentation]\
 */
' "$INDEX_FILE"

    echo "   ✅ $service - Route Swagger ajoutée"
  else
    echo "   ⚠️  $service/src/index.js non trouvé"
  fi
done

echo
echo "✅ Routes Swagger ajoutées!"
echo
echo "📌 Route disponible:"
echo "   /api-docs pour chaque service"
echo
echo "🚀 Exemples:"
echo "   http://localhost:3001/api-docs (auth-service)"
echo "   http://localhost:3002/api-docs (user-service)"
echo "   http://localhost:3003/api-docs (listing-service)"
echo "   etc..."
