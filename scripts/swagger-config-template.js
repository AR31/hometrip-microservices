/**
 * Template de configuration Swagger pour les microservices HomeTrip
 *
 * Usage:
 * const swaggerConfig = require('./swagger-config-template')
 * const swaggerSpec = swaggerConfig.createSwaggerConfig({
 *   title: 'Auth Service API',
 *   description: 'Authentication and Authorization Service',
 *   version: '1.0.0',
 *   port: 3001,
 *   serviceName: 'auth-service'
 * })
 */

const swaggerJsdoc = require('swagger-jsdoc');

/**
 * Crée une configuration Swagger pour un microservice
 * @param {Object} options - Options de configuration
 * @param {string} options.title - Titre de l'API
 * @param {string} options.description - Description de l'API
 * @param {string} options.version - Version de l'API
 * @param {number} options.port - Port du service
 * @param {string} options.serviceName - Nom du service
 * @returns {Object} Configuration Swagger
 */
function createSwaggerConfig(options) {
  const {
    title = 'HomeTrip Microservice API',
    description = 'Microservice API Documentation',
    version = '1.0.0',
    port = 3000,
    serviceName = 'microservice',
  } = options;

  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title,
        description,
        version,
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
          url: `http://localhost:${port}`,
          description: 'Development server',
        },
        {
          url: `http://localhost:3100/api/${serviceName}`,
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
          apiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
            description: 'API Key for service-to-service communication',
          },
        },
        schemas: {
          Error: {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
                example: false,
              },
              error: {
                type: 'string',
                example: 'Error message',
              },
              details: {
                type: 'object',
              },
            },
          },
          Success: {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
                example: true,
              },
              message: {
                type: 'string',
                example: 'Operation successful',
              },
              data: {
                type: 'object',
              },
            },
          },
        },
        responses: {
          UnauthorizedError: {
            description: 'Access token is missing or invalid',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
                example: {
                  success: false,
                  error: 'Unauthorized',
                },
              },
            },
          },
          NotFoundError: {
            description: 'Resource not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
                example: {
                  success: false,
                  error: 'Resource not found',
                },
              },
            },
          },
          ValidationError: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
                example: {
                  success: false,
                  error: 'Validation failed',
                  details: {
                    field: 'Invalid value',
                  },
                },
              },
            },
          },
          ServerError: {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
                example: {
                  success: false,
                  error: 'Internal server error',
                },
              },
            },
          },
        },
      },
      tags: [],
    },
    apis: [
      './src/routes/*.js',
      './src/index.js',
      './src/controllers/*.js',
    ],
  };

  return swaggerJsdoc(swaggerOptions);
}

/**
 * Configuration Swagger UI
 */
const swaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'HomeTrip API Docs',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
  },
};

module.exports = {
  createSwaggerConfig,
  swaggerUiOptions,
};
