#!/bin/bash

# Script pour corriger TOUS les imports dans les modules

set -e

SERVICES_DIR="/home/arwa/hopTrip/hometrip-microservices/services"

echo "🔧 Correction complète des imports dans tous les modules..."

# Function to fix imports in a directory
fix_imports() {
  local dir=$1
  echo "   Fixing imports in $dir..."
  
  # Find all .js files in the directory
  find "$dir" -name "*.js" -type f | while read file; do
    # Fix ../models/ -> ../../models/
    sed -i 's|require("../models/|require("../../models/|g' "$file" 2>/dev/null || true
    sed -i "s|require('../models/|require('../../models/|g" "$file" 2>/dev/null || true
    
    # Fix ../middleware/ -> ../../middleware/
    sed -i 's|require("../middleware/|require("../../middleware/|g' "$file" 2>/dev/null || true
    sed -i "s|require('../middleware/|require('../../middleware/|g" "$file" 2>/dev/null || true
    
    # Fix ../utils/ -> ../../utils/
    sed -i 's|require("../utils/|require("../../utils/|g' "$file" 2>/dev/null || true
    sed -i "s|require('../utils/|require('../../utils/|g" "$file" 2>/dev/null || true
    
    # Fix ../config/ -> ../../config/
    sed -i 's|require("../config/|require("../../config/|g' "$file" 2>/dev/null || true
    sed -i "s|require('../config/|require('../../config/|g" "$file" 2>/dev/null || true
    
    # Fix ../controllers/ -> ./  (for same module)
    sed -i 's|require("../controllers/\([^"]*\)")|require("./\1")|g' "$file" 2>/dev/null || true
    sed -i "s|require('../controllers/\([^']*\)')|require('./\1')|g" "$file" 2>/dev/null || true
  done
}

# ========================================
# 1. auth-security-service
# ========================================
echo "📦 1. Correction de auth-security-service..."

fix_imports "$SERVICES_DIR/auth-security-service/src/modules/auth"
fix_imports "$SERVICES_DIR/auth-security-service/src/modules/users"
fix_imports "$SERVICES_DIR/auth-security-service/src/modules/twoFactor"
fix_imports "$SERVICES_DIR/auth-security-service/src/modules/identity"

echo "   ✅ auth-security-service corrigé!"

echo ""
echo "✅ Correction terminée!"
