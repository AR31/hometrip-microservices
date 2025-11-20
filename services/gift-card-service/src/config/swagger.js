const swaggerJsdoc = require('swagger-jsdoc');
const config = require('./index');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GiftCard Service API',
      version: '1.0.0',
      description: 'GiftCard management microservice for HomeTrip platform',
    },
    servers: [
      { url: `http://localhost:${config.port}`, description: 'Development server' },
      { url: config.services.apiGateway, description: 'API Gateway' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js', './src/models/*.js'],
};

module.exports = swaggerJsdoc(options);
