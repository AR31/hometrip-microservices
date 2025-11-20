# 🌱 Guide des Données de Test - Auth Service

## 📋 Vue d'ensemble

Ce guide explique comment utiliser les scripts de données de test pour le service d'authentification.

## 🚀 Scripts Disponibles

### 1. `seed-data.js` - Insertion de données de test

Ce script insère des utilisateurs de test dans la base de données avec différents rôles et statuts.

**Exécution:**
```bash
cd /home/arwa/hopTrip/hometrip-microservices/services/auth-service
node seed-data.js
```

### 2. `check-data.js` - Vérification des données

Ce script affiche un résumé de tous les utilisateurs dans la base de données avec leurs statuts.

**Exécution:**
```bash
node check-data.js
```

## 👥 Utilisateurs de Test Créés

### 🔑 Mot de passe universel
**Tous les comptes utilisent le même mot de passe:** `Password123!`

### 👑 Administrateurs (2)
| Nom | Email | Statut |
|-----|-------|--------|
| Admin Principal | `admin@hometrip.com` | ✅ Vérifié |
| Support Technique | `support@hometrip.com` | ✅ Vérifié |

### 🏠 Hôtes (3)
| Nom | Email | Ville | Statut |
|-----|-------|-------|--------|
| Sophie Bernard | `sophie.bernard@example.com` | Marseille | ✅ Vérifié |
| Thomas Leroy | `thomas.leroy@example.com` | Nice | ✅ Vérifié |
| Isabelle Moreau | `isabelle.moreau@example.com` | Bordeaux | ✅ Vérifié |

*Tous les hôtes ont un `stripeAccountId` configuré et `isHost: true`*

### 👤 Utilisateurs Réguliers (2)
| Nom | Email | Ville | Statut |
|-----|-------|-------|--------|
| Jean Dupont | `jean.dupont@example.com` | Paris | ⚪ Non vérifié |
| Marie Martin | `marie.martin@example.com` | Lyon | ✅ Vérifié |

### 🎫 Invités (1)
| Nom | Email | Statut |
|-----|-------|--------|
| Pierre Dubois | `pierre.dubois@example.com` | ⚪ Non vérifié |

### 🔐 Comptes Spéciaux

#### Compte avec 2FA
- **Email:** `secure.user@example.com`
- **2FA:** Email activé
- **Statut:** ✅ Vérifié

#### Compte Suspendu
- **Email:** `suspended@example.com`
- **Statut:** ⏸️ Suspendu pour 30 jours
- **Raison:** Non-respect des conditions d'utilisation

#### Compte Banni
- **Email:** `banned@example.com`
- **Statut:** 🚫 Banni
- **Raison:** Fraude détectée

## 📊 Structure des Données

### Champs Principaux
- **fullName**: Nom complet
- **email**: Adresse email (unique)
- **password**: Mot de passe hashé avec bcrypt
- **role**: `user`, `host`, `guest`, ou `admin`
- **isHost**: Boolean indiquant si l'utilisateur est un hôte
- **phoneNumber**: Numéro de téléphone (format international)
- **dateOfBirth**: Date de naissance

### Vérifications
- **verificationStatus.email**: Email vérifié
- **verificationStatus.phone**: Téléphone vérifié
- **verificationStatus.identity**: Identité vérifiée
- **verificationStatus.selfie**: Selfie vérifié
- **isVerified**: Badge de vérification global

### Adresse (pour certains utilisateurs)
- **street**: Rue
- **city**: Ville
- **state**: Région
- **zipCode**: Code postal
- **country**: Pays

### Statut du Compte
- **accountStatus.isActive**: Compte actif
- **accountStatus.isBanned**: Compte banni
- **accountStatus.isSuspended**: Compte suspendu
- **accountStatus.suspendedUntil**: Date de fin de suspension
- **accountStatus.banReason**: Raison du bannissement
- **accountStatus.suspensionReason**: Raison de la suspension

### Authentification à Deux Facteurs
- **twoFactorAuth.enabled**: 2FA activé
- **twoFactorAuth.method**: Méthode (`email`, `sms`, `authenticator`)
- **twoFactorAuth.phoneNumber**: Téléphone pour 2FA

## 🧪 Scénarios de Test

### Test d'authentification normale
```bash
# Utilisateur vérifié
Email: marie.martin@example.com
Password: Password123!
```

### Test avec rôle hôte
```bash
# Hôte avec Stripe configuré
Email: sophie.bernard@example.com
Password: Password123!
```

### Test avec rôle admin
```bash
# Administrateur
Email: admin@hometrip.com
Password: Password123!
```

### Test de compte suspendu
```bash
# Devrait échouer à la connexion
Email: suspended@example.com
Password: Password123!
```

### Test de compte banni
```bash
# Devrait échouer à la connexion
Email: banned@example.com
Password: Password123!
```

### Test avec 2FA
```bash
# Nécessitera une étape supplémentaire
Email: secure.user@example.com
Password: Password123!
```

## 🔄 Réinitialiser les Données

Pour supprimer et recréer toutes les données :

1. Ouvrir `seed-data.js`
2. Décommenter ces lignes (vers la ligne 17-18) :
   ```javascript
   await User.deleteMany({});
   console.log('🗑️  Anciennes données supprimées');
   ```
3. Exécuter à nouveau :
   ```bash
   node seed-data.js
   ```

## 🛠️ Configuration

Le script utilise la variable d'environnement `MONGO_URI` du fichier `.env`.

**Valeur par défaut si non définie:**
```
mongodb://localhost:27017/hometrip-auth
```

## 📝 Notes Importantes

1. **Sécurité**: Ces données sont uniquement pour le développement. Ne jamais utiliser en production.
2. **Mot de passe**: Le mot de passe `Password123!` est hashé avec bcrypt (10 rounds).
3. **Emails**: Tous les emails sont fictifs et ne peuvent pas recevoir de vrais emails.
4. **Avatars**: Les avatars utilisent le service `pravatar.cc` pour générer des images de profil aléatoires.
5. **Stripe**: Les `stripeAccountId` sont des IDs de test et ne sont pas liés à de vrais comptes Stripe.

## 🐛 Dépannage

### Erreur de connexion MongoDB
```
❌ MongoNetworkError: connect ECONNREFUSED
```
**Solution:** Assurez-vous que MongoDB est démarré et que l'URL dans `.env` est correcte.

### Erreur de duplicate key
```
❌ E11000 duplicate key error
```
**Solution:** Les emails sont uniques. Décommenter les lignes de suppression dans `seed-data.js`.

### Module not found
```
❌ Cannot find module 'bcryptjs'
```
**Solution:** Installer les dépendances :
```bash
npm install
```

## 📚 Exemples d'Utilisation

### Via curl
```bash
# Connexion utilisateur
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "marie.martin@example.com",
    "password": "Password123!"
  }'

# Obtenir le profil (avec token)
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Via Postman/Insomnia
Importez la collection d'exemples dans votre client API préféré en utilisant les credentials ci-dessus.

## 🎯 Prochaines Étapes

Après avoir inséré les données de test, vous pouvez :

1. Tester les endpoints d'authentification
2. Vérifier les rôles et permissions
3. Tester les flux de vérification
4. Tester les statuts de compte (suspension, ban)
5. Tester l'authentification à deux facteurs

---

**Créé le:** 2025-11-20
**Version:** 1.0.0
