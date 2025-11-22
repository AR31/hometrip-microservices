# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Production stage
FROM node:18-alpine

WORKDIR /app

# Installer dumb-init pour gérer les signaux
RUN apk add --no-cache dumb-init

# Copier les node_modules depuis le stage builder
COPY --from=builder /app/node_modules ./node_modules

# Copier le code source
COPY . .

# Créer le répertoire pour les logs
RUN mkdir -p /app/logs

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Changer la propriété
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 4009

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4009/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Utiliser dumb-init pour démarrer l'app
ENTRYPOINT ["dumb-init", "--"]

# Commande de démarrage
CMD ["node", "src/index.js"]
