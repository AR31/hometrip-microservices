# Multi-stage build for WebSocket Gateway

# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Runtime
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Copy application source
COPY src ./src

# Create logs directory
RUN mkdir -p logs && chmod 755 logs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use dumb-init as PID 1
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["npm", "start"]

# Expose port
EXPOSE 3002

# Labels
LABEL maintainer="HomeTrip Team"
LABEL description="WebSocket Gateway for HomeTrip microservices"
LABEL version="1.0.0"
