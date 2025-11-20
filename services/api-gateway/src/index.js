require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3100'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Request logging with headers
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('Authorization header:', req.headers.authorization ? 'Present ✅' : 'Missing ❌');
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      'auth-service': process.env.AUTH_SERVICE_URL,
      'user-service': process.env.USER_SERVICE_URL,
      'listing-service': process.env.LISTING_SERVICE_URL,
      'booking-service': process.env.BOOKING_SERVICE_URL,
      'payment-service': process.env.PAYMENT_SERVICE_URL,
      'message-service': process.env.MESSAGE_SERVICE_URL,
      'review-service': process.env.REVIEW_SERVICE_URL,
      'analytics-service': process.env.ANALYTICS_SERVICE_URL,
      'notification-service': process.env.NOTIFICATION_SERVICE_URL,
      'search-service': process.env.SEARCH_SERVICE_URL,
      'logger-service': process.env.LOGGER_SERVICE_URL,
      'websocket-gateway': process.env.WEBSOCKET_GATEWAY_URL
    }
  });
});

// Proxy configuration
const proxyOptions = {
  changeOrigin: true,
  logLevel: 'debug',
  timeout: 30000,
  proxyTimeout: 30000,
  onError: (err, req, res) => {
    console.error(`[Proxy Error] ${req.path}:`, err.message);
    if (!res.headersSent) {
      res.status(502).json({
        success: false,
        message: 'Service unavailable',
        error: err.message
      });
    }
  },
  onProxyReq: (proxyReq, req, res) => {
    // Forward original headers
    if (req.headers.authorization) {
      proxyReq.setHeader('authorization', req.headers.authorization);
    }
    // Fix content-length for buffered requests
    if (req.body) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  }
};

// Service routes
const services = [
  { path: '/api/auth', target: process.env.AUTH_SERVICE_URL, pathRewrite: { '^/api/auth': '/auth' } },
  { path: '/api/users', target: process.env.USER_SERVICE_URL, pathRewrite: { '^/api/users': '/users' } },
  { path: '/api/listings', target: process.env.LISTING_SERVICE_URL, pathRewrite: { '^/api/listings': '/listings' } },
  { path: '/api/bookings', target: process.env.BOOKING_SERVICE_URL, pathRewrite: { '^/api/bookings': '/api/bookings' } },
  { path: '/api/reservations', target: process.env.BOOKING_SERVICE_URL, pathRewrite: { '^/api/reservations': '/api/bookings' } }, // Alias pour bookings
  { path: '/api/payments', target: process.env.PAYMENT_SERVICE_URL, pathRewrite: { '^/api/payments': '/payments' } },
  { path: '/api/messages', target: process.env.MESSAGE_SERVICE_URL, pathRewrite: { '^/api/messages': '/messages' } },
  { path: '/api/reviews', target: process.env.REVIEW_SERVICE_URL, pathRewrite: { '^/api/reviews': '/reviews' } },
  { path: '/api/analytics', target: process.env.ANALYTICS_SERVICE_URL, pathRewrite: { '^/api/analytics': '/analytics' } },
  { path: '/api/notifications', target: process.env.NOTIFICATION_SERVICE_URL, pathRewrite: { '^/api/notifications': '/api/notifications' } }, // Le service utilise déjà /api/notifications
  { path: '/api/search', target: process.env.SEARCH_SERVICE_URL, pathRewrite: { '^/api/search': '/search' } },
  { path: '/api/logs', target: process.env.LOGGER_SERVICE_URL, pathRewrite: { '^/api/logs': '/logs' } }
];

// Register proxy routes
services.forEach(service => {
  if (service.target) {
    console.log(`Registering route: ${service.path} -> ${service.target}`);
    app.use(
      service.path,
      createProxyMiddleware({
        ...proxyOptions,
        target: service.target,
        pathRewrite: service.pathRewrite
      })
    );
  } else {
    console.warn(`Warning: No target URL configured for ${service.path}`);
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// Handle port already in use
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    console.error('Server error:', error);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
