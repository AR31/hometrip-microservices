#!/bin/bash

# Script pour corriger les imports dans les modules fusionnés

set -e

SERVICES_DIR="/home/arwa/hopTrip/hometrip-microservices/services"

echo "🔧 Correction des imports dans les modules..."

# ========================================
# 1. auth-security-service
# ========================================
echo "📦 1. Correction de auth-security-service..."

cd "$SERVICES_DIR/auth-security-service/src/modules/auth"

# Fix auth.routes.js imports
sed -i 's|require("../controllers/authController")|require("./auth.controller")|g' auth.routes.js 2>/dev/null || true
sed -i "s|require('../controllers/authController')|require('./auth.controller')|g" auth.routes.js 2>/dev/null || true
sed -i 's|require("../middleware/auth")|require("../../middleware/auth")|g' auth.routes.js 2>/dev/null || true
sed -i "s|require('../middleware/auth')|require('../../middleware/auth')|g" auth.routes.js 2>/dev/null || true
sed -i 's|require("../middleware/validate")|require("../../middleware/validate")|g' auth.routes.js 2>/dev/null || true
sed -i "s|require('../middleware/validate')|require('../../middleware/validate')|g" auth.routes.js 2>/dev/null || true

cd "$SERVICES_DIR/auth-security-service/src/modules/users"

# Fix users.routes.js imports
sed -i 's|require("../controllers/userController")|require("./users.controller")|g' users.routes.js 2>/dev/null || true
sed -i "s|require('../controllers/userController')|require('./users.controller')|g" users.routes.js 2>/dev/null || true
sed -i 's|require("../middleware/auth")|require("../../middleware/auth")|g' users.routes.js 2>/dev/null || true
sed -i "s|require('../middleware/auth')|require('../../middleware/auth')|g" users.routes.js 2>/dev/null || true

cd "$SERVICES_DIR/auth-security-service/src/modules/twoFactor"

# Fix twoFactor.js imports
sed -i 's|require("../middleware/auth")|require("../../middleware/auth")|g' twoFactor.js 2>/dev/null || true
sed -i "s|require('../middleware/auth')|require('../../middleware/auth')|g" twoFactor.js 2>/dev/null || true
sed -i 's|require("../models/User")|require("../../models/User")|g' twoFactor.js 2>/dev/null || true
sed -i "s|require('../models/User')|require('../../models/User')|g" twoFactor.js 2>/dev/null || true

cd "$SERVICES_DIR/auth-security-service/src/modules/identity"

# Fix identityVerification.js imports
sed -i 's|require("../middleware/auth")|require("../../middleware/auth")|g' identityVerification.js 2>/dev/null || true
sed -i "s|require('../middleware/auth')|require('../../middleware/auth')|g" identityVerification.js 2>/dev/null || true
sed -i 's|require("../middleware/isAdmin")|require("../../middleware/isAdmin")|g' identityVerification.js 2>/dev/null || true
sed -i "s|require('../middleware/isAdmin')|require('../../middleware/isAdmin')|g" identityVerification.js 2>/dev/null || true
sed -i 's|require("../models/IdentityVerification")|require("../../models/IdentityVerification")|g' identityVerification.js 2>/dev/null || true
sed -i "s|require('../models/IdentityVerification')|require('../../models/IdentityVerification')|g" identityVerification.js 2>/dev/null || true
sed -i 's|require("../models/Verification")|require("../../models/Verification")|g' identityVerification.js 2>/dev/null || true
sed -i "s|require('../models/Verification')|require('../../models/Verification')|g" identityVerification.js 2>/dev/null || true
sed -i 's|require("../models/User")|require("../../models/User")|g' identityVerification.js 2>/dev/null || true
sed -i "s|require('../models/User')|require('../../models/User')|g" identityVerification.js 2>/dev/null || true

echo "   ✅ auth-security-service corrigé!"

echo ""
echo "✅ Correction terminée!"
echo ""
echo "Prochaine étape: Tester le service"
echo "cd $SERVICES_DIR/auth-security-service && npm start"
