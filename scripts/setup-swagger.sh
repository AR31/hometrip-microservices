#!/bin/bash

# Script pour configurer Swagger dans tous les microservices

SERVICES_DIR="services"

# Configuration des services
declare -A SERVICE_CONFIG=(
  ["api-gateway"]="3100:API Gateway:Main API Gateway for routing requests"
  ["auth-service"]="3001:Auth Service:Authentication and Authorization"
  ["user-service"]="3002:User Service:User management and profiles"
  ["listing-service"]="3003:Listing Service:Property listings management"
  ["booking-service"]="3004:Booking Service:Reservations and bookings"
  ["payment-service"]="3005:Payment Service:Payment processing with Stripe"
  ["message-service"]="3006:Message Service:Real-time messaging"
  ["notification-service"]="3007:Notification Service:Email, SMS, and push notifications"
  ["review-service"]="3008:Review Service:Reviews and ratings"
  ["search-service"]="3009:Search Service:Search and filtering"
  ["analytics-service"]="3010:Analytics Service:Analytics and metrics"
  ["websocket-gateway"]="3011:WebSocket Gateway:Real-time WebSocket connections"
  ["logger-service"]="3012:Logger Service:Centralized logging"
)

echo "🔧 Configuration de Swagger dans tous les microservices..."
echo

for service in "${!SERVICE_CONFIG[@]}"; do
  SERVICE_PATH="$SERVICES_DIR/$service"
  IFS=':' read -r PORT TITLE DESCRIPTION <<< "${SERVICE_CONFIG[$service]}"

  if [ -d "$SERVICE_PATH" ]; then
    echo "📝 Configuration de $service..."

    # Créer le fichier de configuration Swagger
    cat > "$SERVICE_PATH/src/config/swagger.js" << EOF
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

/**
 * Configuration Swagger pour ${TITLE}
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '${TITLE} API',
      description: '${DESCRIPTION}',
      version: '1.0.0',
      contact: {
        name: 'HomeTrip Team',
        email: 'dev@hometrip.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: \`http://localhost:${PORT}\`,
        description: 'Development server (direct)',
      },
      {
        url: 'http://localhost:3100',
        description: 'Via API Gateway',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Error message' },
            details: { type: 'object' },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation successful' },
            data: { type: 'object' },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: { \$ref: '#/components/schemas/Error' },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { \$ref: '#/components/schemas/Error' },
            },
          },
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { \$ref: '#/components/schemas/Error' },
            },
          },
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { \$ref: '#/components/schemas/Error' },
            },
          },
        },
      },
    },
  },
  apis: [
    './src/routes/*.js',
    './src/index.js',
    './src/controllers/*.js',
  ],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

const swaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: '${TITLE} - API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
  },
};

module.exports = {
  swaggerSpec,
  swaggerUi,
  swaggerUiOptions,
};
EOF

    echo "   ✅ $service - Configuration Swagger créée"
  else
    echo "   ⚠️  Service $service non trouvé"
  fi
done

echo
echo "✅ Configuration Swagger terminée!"
echo
echo "📌 Fichiers créés:"
echo "   - src/config/swagger.js pour chaque service"
echo
echo "🚀 Prochaine étape:"
echo "   Ajouter les routes Swagger dans chaque service"
echo "   Route: /api-docs"
