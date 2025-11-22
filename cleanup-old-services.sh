#!/bin/bash

# Script pour nettoyer les anciens services après la migration

set -e

SERVICES_DIR="/home/arwa/hopTrip/hometrip-microservices/services"
BACKUP_DIR="/home/arwa/hopTrip/hometrip-microservices/backup-old-services-$(date +%Y%m%d-%H%M%S)"

echo "🧹 Nettoyage des anciens services..."
echo ""

# Services à GARDER
KEEP_SERVICES=(
  "api-gateway"
  "auth-security-service"
  "listing-search-service"
  "booking-reservation-service"
  "payment-financial-service"
  "communication-service"
  "review-experience-service"
  "analytics-logger-service"
  "two-factor-service"
  "identity-verification-service"
)

# Services à SUPPRIMER (anciens services fusionnés)
OLD_SERVICES=(
  "analytics-service"
  "auth-service"
  "booking-service"
  "cancellation-policy-service"
  "coupon-service"
  "dispute-service"
  "email-service"
  "experience-service"
  "gift-card-service"
  "listing-service"
  "logger-service"
  "message-service"
  "notification-service"
  "payment-history-service"
  "payment-service"
  "payout-service"
  "review-service"
  "search-service"
  "user-service"
  "websocket-gateway"
  "wishlist-service"
)

echo "📦 Services à conserver: ${#KEEP_SERVICES[@]}"
echo "🗑️  Services à supprimer: ${#OLD_SERVICES[@]}"
echo ""

# Créer le dossier de backup
echo "📁 Création du backup dans: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

cd "$SERVICES_DIR"

# Calculer la taille totale à supprimer
echo "📊 Calcul de l'espace à libérer..."
TOTAL_SIZE=0
for service in "${OLD_SERVICES[@]}"; do
  if [ -d "$service" ]; then
    SIZE=$(du -sm "$service" | cut -f1)
    TOTAL_SIZE=$((TOTAL_SIZE + SIZE))
  fi
done
echo "💾 Espace à libérer: ${TOTAL_SIZE}MB"
echo ""

# Demander confirmation
echo "⚠️  ATTENTION: Cette opération va:"
echo "   1. Créer un backup de tous les anciens services"
echo "   2. Supprimer 21 anciens services"
echo "   3. Libérer environ ${TOTAL_SIZE}MB d'espace disque"
echo ""
read -p "Voulez-vous continuer? (oui/non): " CONFIRM

if [ "$CONFIRM" != "oui" ]; then
  echo "❌ Opération annulée"
  exit 0
fi

echo ""
echo "🚀 Début du processus..."
echo ""

# Backup et suppression
DELETED_COUNT=0
for service in "${OLD_SERVICES[@]}"; do
  if [ -d "$service" ]; then
    echo "📦 Backup de $service..."
    cp -r "$service" "$BACKUP_DIR/"

    echo "🗑️  Suppression de $service..."
    rm -rf "$service"

    DELETED_COUNT=$((DELETED_COUNT + 1))
    echo "   ✅ $service supprimé"
    echo ""
  else
    echo "⚠️  $service n'existe pas, ignoré"
    echo ""
  fi
done

# Résumé
echo "============================================"
echo "✅ NETTOYAGE TERMINÉ!"
echo "============================================"
echo ""
echo "📊 Résumé:"
echo "   • Services supprimés: $DELETED_COUNT"
echo "   • Espace libéré: ${TOTAL_SIZE}MB"
echo "   • Backup créé dans: $BACKUP_DIR"
echo ""
echo "📦 Services conservés:"
for service in "${KEEP_SERVICES[@]}"; do
  if [ -d "$SERVICES_DIR/$service" ]; then
    echo "   ✅ $service"
  fi
done
echo ""
echo "⚠️  Note: Le backup peut être supprimé après avoir vérifié"
echo "   que les nouveaux services fonctionnent correctement."
echo ""
echo "Pour supprimer le backup:"
echo "   rm -rf $BACKUP_DIR"
