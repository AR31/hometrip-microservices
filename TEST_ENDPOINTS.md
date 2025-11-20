# Guide de Test des Endpoints - Microservices HomeTrip

## 🧪 Outils de Test

### 1. Via curl (ligne de commande)
### 2. Via le navigateur (GET uniquement)
### 3. Via Postman/Insomnia
### 4. Via les scripts de test

---

## 🔐 Authentification

Tous les endpoints protégés nécessitent un token JWT dans le header :
```bash
Authorization: Bearer YOUR_TOKEN_HERE
```

### Obtenir un token de test :
```bash
# Login
curl -X POST http://localhost:3100/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@hometrip.com",
    "password": "your_password"
  }'
```

---

## 📋 Tests des Nouveaux Services

### 1. ✅ Identity Verification Service (Port 4015)

**Health Check :**
```bash
curl http://localhost:4015/health
```

**Via API Gateway :**
```bash
# Soumettre une vérification d'identité
curl -X POST http://localhost:3100/api/identity-verification/submit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "idType": "passport",
    "idNumber": "AB123456",
    "fullName": "John Doe",
    "dateOfBirth": "1990-01-01",
    "country": "FR",
    "idFrontImage": "url_to_image",
    "selfieImage": "url_to_selfie"
  }'

# Vérifier le statut
curl http://localhost:3100/api/identity-verification/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 2. ✅ Cancellation Policy Service (Port 4016)

**Health Check :**
```bash
curl http://localhost:4016/health
```

**Via API Gateway :**
```bash
# Obtenir toutes les politiques
curl http://localhost:3100/api/cancellation-policy

# Obtenir une politique spécifique
curl http://localhost:3100/api/cancellation-policy/flexible
curl http://localhost:3100/api/cancellation-policy/moderate
curl http://localhost:3100/api/cancellation-policy/strict

# Calculer un remboursement
curl -X POST http://localhost:3100/api/cancellation-policy/calculate-refund \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "booking_id",
    "policyType": "flexible",
    "cancellationDate": "2025-11-25"
  }'
```

---

### 3. ✅ Coupon Service (Port 4017)

**Health Check :**
```bash
curl http://localhost:4017/health
```

**Via API Gateway :**
```bash
# Valider un coupon
curl -X POST http://localhost:3100/api/coupons/validate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SUMMER2025",
    "bookingAmount": 150.00
  }'

# Créer un coupon (admin)
curl -X POST http://localhost:3100/api/coupons \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "WELCOME10",
    "discountType": "percentage",
    "discountValue": 10,
    "minBookingAmount": 100,
    "validFrom": "2025-11-20",
    "validUntil": "2025-12-31",
    "maxUses": 1000
  }'

# Liste des coupons actifs
curl http://localhost:3100/api/coupons/active \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 4. ✅ Two-Factor Authentication Service (Port 4018)

**Health Check :**
```bash
curl http://localhost:4018/health
```

**Via API Gateway :**
```bash
# Activer 2FA (Email)
curl -X POST http://localhost:3100/api/2fa/setup \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "email"
  }'

# Activer 2FA (Authenticator)
curl -X POST http://localhost:3100/api/2fa/setup \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "authenticator"
  }'
# Réponse contient un QR code

# Vérifier le code 2FA
curl -X POST http://localhost:3100/api/2fa/verify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "123456"
  }'

# Désactiver 2FA
curl -X POST http://localhost:3100/api/2fa/disable \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "user_password"
  }'
```

---

### 5. ✅ Payout Service (Port 4019)

**Health Check :**
```bash
curl http://localhost:4019/health
```

**Via API Gateway :**
```bash
# Obtenir les paiements sortants d'un hôte
curl http://localhost:3100/api/payouts \
  -H "Authorization: Bearer HOST_TOKEN"

# Obtenir un payout spécifique
curl http://localhost:3100/api/payouts/payout_id \
  -H "Authorization: Bearer HOST_TOKEN"

# Filtrer par statut
curl "http://localhost:3100/api/payouts?status=pending" \
  -H "Authorization: Bearer HOST_TOKEN"

# Statistiques des payouts
curl http://localhost:3100/api/payouts/stats \
  -H "Authorization: Bearer HOST_TOKEN"

# Demander un payout (si balance disponible)
curl -X POST http://localhost:3100/api/payouts/request \
  -H "Authorization: Bearer HOST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500.00,
    "currency": "EUR"
  }'
```

---

### 6. ✅ Email Service (Port 4020)

**Health Check :**
```bash
curl http://localhost:4020/health
```

**Via API Gateway :**
```bash
# Envoyer un email de confirmation de réservation
curl -X POST http://localhost:3100/api/emails/send-confirmation \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reservationId": "reservation_id",
    "to": "guest@example.com",
    "type": "booking_confirmation"
  }'

# Envoyer un email personnalisé
curl -X POST http://localhost:3100/api/emails/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "subject": "Welcome to HomeTrip",
    "template": "welcome",
    "data": {
      "name": "John Doe"
    }
  }'

# Historique des emails envoyés
curl http://localhost:3100/api/emails/history \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 7. ✅ Payment History Service (Port 4021)

**Health Check :**
```bash
curl http://localhost:4021/health
```

**Via API Gateway :**
```bash
# Obtenir l'historique des paiements
curl http://localhost:3100/api/payment-history \
  -H "Authorization: Bearer HOST_TOKEN"

# Filtrer par dates
curl "http://localhost:3100/api/payment-history?startDate=2025-11-01&endDate=2025-11-30" \
  -H "Authorization: Bearer HOST_TOKEN"

# Filtrer par listing
curl "http://localhost:3100/api/payment-history?listingId=listing_id" \
  -H "Authorization: Bearer HOST_TOKEN"

# Statistiques des paiements
curl http://localhost:3100/api/payment-history/stats \
  -H "Authorization: Bearer HOST_TOKEN"

# Export CSV
curl http://localhost:3100/api/payment-history/export?format=csv \
  -H "Authorization: Bearer HOST_TOKEN" \
  -o payment_history.csv
```

---

## 🧪 Script de Test Automatique

Créez un fichier `test-services.sh` :

```bash
#!/bin/bash

API_GATEWAY="http://localhost:3100"
TOKEN="your_token_here"

echo "🧪 Test des Microservices HomeTrip"
echo "=================================="

# Test 1: Identity Verification
echo -e "\n1️⃣  Testing Identity Verification Service..."
curl -s "${API_GATEWAY}/api/identity-verification/status" \
  -H "Authorization: Bearer ${TOKEN}" | jq .

# Test 2: Cancellation Policy
echo -e "\n2️⃣  Testing Cancellation Policy Service..."
curl -s "${API_GATEWAY}/api/cancellation-policy" | jq .

# Test 3: Coupons
echo -e "\n3️⃣  Testing Coupon Service..."
curl -s -X POST "${API_GATEWAY}/api/coupons/validate" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"code":"TEST","bookingAmount":100}' | jq .

# Test 4: 2FA
echo -e "\n4️⃣  Testing Two-Factor Service..."
curl -s -X POST "${API_GATEWAY}/api/2fa/setup" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"method":"email"}' | jq .

# Test 5: Payouts
echo -e "\n5️⃣  Testing Payout Service..."
curl -s "${API_GATEWAY}/api/payouts" \
  -H "Authorization: Bearer ${TOKEN}" | jq .

# Test 6: Email
echo -e "\n6️⃣  Testing Email Service..."
curl -s "${API_GATEWAY}/api/emails/history" \
  -H "Authorization: Bearer ${TOKEN}" | jq .

# Test 7: Payment History
echo -e "\n7️⃣  Testing Payment History Service..."
curl -s "${API_GATEWAY}/api/payment-history" \
  -H "Authorization: Bearer ${TOKEN}" | jq .

echo -e "\n✅ Tests terminés"
```

---

## 📊 Vérification Rapide de Tous les Services

```bash
# Health check de tous les nouveaux services
for port in 4015 4016 4017 4018 4019 4020 4021; do
  echo -n "Port $port: "
  curl -s http://localhost:$port/health | jq -r '.success // .status' 2>/dev/null || echo "❌"
done
```

---

## 🔍 Debug et Monitoring

### Vérifier les logs des services :
```bash
# Via le process manager
cd /home/arwa/hopTrip/hometrip-microservices
npx tsx scripts/dev.ts logs identity-verification-service
```

### Vérifier les ports occupés :
```bash
lsof -i :4015  # Identity Verification
lsof -i :4016  # Cancellation Policy
lsof -i :4017  # Coupon
lsof -i :4018  # Two-Factor
lsof -i :4019  # Payout
lsof -i :4020  # Email
lsof -i :4021  # Payment History
```

### Vérifier le statut via l'API Gateway :
```bash
curl http://localhost:3100/health | jq
```

---

## 📝 Variables d'Environnement pour Tests

Créez un fichier `.env.test` :

```bash
# Test User Token
TEST_USER_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Test Host Token
TEST_HOST_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Test Admin Token
TEST_ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# API Gateway URL
API_GATEWAY_URL="http://localhost:3100"
```

Utilisez-le dans vos tests :
```bash
source .env.test
curl "${API_GATEWAY_URL}/api/coupons" -H "Authorization: Bearer ${TEST_USER_TOKEN}"
```

---

## ✅ Checklist de Test

- [ ] Health checks de tous les services (4015-4021)
- [ ] Health check de l'API Gateway
- [ ] Test d'authentification (obtenir un token)
- [ ] Test Identity Verification (submit + status)
- [ ] Test Cancellation Policy (get policies)
- [ ] Test Coupon (validate code)
- [ ] Test 2FA (setup + verify)
- [ ] Test Payouts (list + stats)
- [ ] Test Email (send confirmation)
- [ ] Test Payment History (list + export)
- [ ] Test des erreurs (401, 404, 400)
- [ ] Test avec token invalide
- [ ] Test sans token

---

## 🎯 Prochaines Étapes

1. Créer des tests unitaires avec Jest
2. Créer des tests d'intégration
3. Configurer CI/CD pour tests automatiques
4. Ajouter monitoring avec Prometheus/Grafana
5. Configurer alertes pour erreurs
