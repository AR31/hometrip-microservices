# 🚀 Gestionnaire de Microservices HomeTrip

## Installation

### Première Utilisation

**IMPORTANT**: Avant de démarrer les services, vous devez installer les dépendances de chaque microservice :

```bash
# Installation automatique de tous les services
./scripts/install-all.sh
```

Ou manuellement pour un service spécifique :

```bash
cd services/api-gateway
npm install
```

Le script de gestion utilise `npx tsx` qui télécharge automatiquement les dépendances nécessaires pour l'exécution.

## Utilisation

### Commandes de Base

```bash
# Depuis le dossier hometrip-microservices

# Démarrer tous les services
npx tsx scripts/dev.ts start

# Arrêter tous les services
npx tsx scripts/dev.ts stop

# Redémarrer tous les services
npx tsx scripts/dev.ts restart

# Voir le statut de tous les services
npx tsx scripts/dev.ts status

# Lister les services disponibles
npx tsx scripts/dev.ts list
```

### Gestion Individuelle des Services

```bash
# Démarrer un service spécifique
npx tsx scripts/dev.ts start api-gateway
npx tsx scripts/dev.ts start auth-service

# Arrêter un service spécifique
npx tsx scripts/dev.ts stop booking-service

# Redémarrer un service spécifique
npx tsx scripts/dev.ts restart payment-service
```

## Services Disponibles

| # | Service | Port | Description |
|---|---------|------|-------------|
| 1 | api-gateway | 3000 | Passerelle API principale |
| 2 | auth-service | 3001 | Authentification |
| 3 | user-service | 3002 | Gestion des utilisateurs |
| 4 | listing-service | 3003 | Gestion des annonces |
| 5 | booking-service | 3004 | Réservations |
| 6 | payment-service | 3005 | Paiements |
| 7 | message-service | 3006 | Messagerie |
| 8 | notification-service | 3007 | Notifications |
| 9 | review-service | 3008 | Avis et évaluations |
| 10 | search-service | 3009 | Recherche |
| 11 | analytics-service | 3010 | Analytiques |
| 12 | websocket-gateway | 3011 | WebSocket Gateway |
| 13 | logger-service | 3012 | Service de logs |

## Fichiers et Dossiers

### Logs
Les logs de chaque service sont stockés dans :
```
~/hometrip-microservices/logs/
├── api-gateway_2025-11-17.log
├── auth-service_2025-11-17.log
└── ...
```

### PIDs
Les fichiers PID sont stockés dans :
```
~/hometrip-microservices/pids/
├── api-gateway.pid
├── auth-service.pid
└── ...
```

## Exemples d'Usage

### Workflow Quotidien

```bash
# Matin : Démarrer les services essentiels
npx tsx scripts/dev.ts start api-gateway
npx tsx scripts/dev.ts start auth-service
npx tsx scripts/dev.ts start user-service

# Vérifier le statut
npx tsx scripts/dev.ts status

# Soir : Arrêter tous les services
npx tsx scripts/dev.ts stop
```

### Développement d'un Service Spécifique

```bash
# Si vous travaillez sur le booking-service
npx tsx scripts/dev.ts start api-gateway  # Gateway nécessaire
npx tsx scripts/dev.ts start auth-service # Auth nécessaire
npx tsx scripts/dev.ts start booking-service

# Après modification, redémarrer uniquement booking-service
npx tsx scripts/dev.ts restart booking-service
```

### Démarrage Complet

```bash
# Démarrer TOUS les services (peut prendre du temps)
npx tsx scripts/dev.ts start

# Vérifier que tout fonctionne
npx tsx scripts/dev.ts status
```

## Debugging

### Voir les Logs en Temps Réel

```bash
# Logs d'un service spécifique
tail -f ~/hometrip-microservices/logs/api-gateway_*.log

# Tous les logs
tail -f ~/hometrip-microservices/logs/*.log
```

### Vérifier les Ports

```bash
# Voir ce qui utilise un port spécifique
lsof -i:3000  # API Gateway
lsof -i:3001  # Auth Service
```

### Problèmes Courants

#### Port déjà utilisé

```bash
# Identifier le processus
lsof -i:3000

# Tuer le processus
kill $(lsof -ti:3000)

# Redémarrer le service
npx tsx scripts/dev.ts start api-gateway
```

#### Service ne démarre pas

```bash
# Vérifier les logs
tail -f ~/hometrip-microservices/logs/api-gateway_*_error.log

# Tester manuellement
cd services/api-gateway
npm run dev
```

#### Nettoyer les PIDs obsolètes

```bash
# Supprimer tous les fichiers PID
rm ~/hometrip-microservices/pids/*.pid

# Redémarrer les services
npx tsx scripts/dev.ts start
```

## Raccourcis (Optionnel)

Vous pouvez ajouter ces alias dans votre `~/.bashrc` ou `~/.zshrc` :

```bash
# Alias pour hometrip-microservices
alias hm='cd ~/hometrip-microservices'
alias hm-start='cd ~/hometrip-microservices && npx tsx scripts/dev.ts start'
alias hm-stop='cd ~/hometrip-microservices && npx tsx scripts/dev.ts stop'
alias hm-status='cd ~/hometrip-microservices && npx tsx scripts/dev.ts status'
alias hm-restart='cd ~/hometrip-microservices && npx tsx scripts/dev.ts restart'
```

Puis utilisez :
```bash
hm-start           # Démarrer tous les services
hm-status          # Voir le statut
hm-stop            # Arrêter tous les services
```

## Scripts NPM (Alternative)

Vous pouvez aussi ajouter dans le `package.json` racine :

```json
{
  "scripts": {
    "dev:start": "npx tsx scripts/dev.ts start",
    "dev:stop": "npx tsx scripts/dev.ts stop",
    "dev:restart": "npx tsx scripts/dev.ts restart",
    "dev:status": "npx tsx scripts/dev.ts status",
    "dev:list": "npx tsx scripts/dev.ts list"
  }
}
```

Puis utilisez :
```bash
npm run dev:start
npm run dev:status
npm run dev:stop
```

## Architecture

```
┌─────────────────┐
│   API Gateway   │ :3000
└────────┬────────┘
         │
    ┌────┴────┬──────────┬───────────┬──────────────┐
    │         │          │           │              │
┌───▼───┐ ┌──▼──┐  ┌────▼────┐ ┌───▼────┐  ┌─────▼─────┐
│ Auth  │ │User │  │Listing  │ │Booking │  │  Payment  │
│:3001  │ │:3002│  │  :3003  │ │ :3004  │  │   :3005   │
└───────┘ └─────┘  └─────────┘ └────────┘  └───────────┘

┌──────────┐ ┌────────────┐ ┌────────┐ ┌──────────┐
│ Message  │ │Notification│ │Review  │ │ Search   │
│  :3006   │ │   :3007    │ │ :3008  │ │  :3009   │
└──────────┘ └────────────┘ └────────┘ └──────────┘

┌───────────┐ ┌──────────┐ ┌──────────┐
│Analytics  │ │WebSocket │ │  Logger  │
│  :3010    │ │  :3011   │ │  :3012   │
└───────────┘ └──────────┘ └──────────┘
```

## Monitoring

### Vérification Rapide

```bash
# Statut de tous les services
npx tsx scripts/dev.ts status

# Compter les services actifs
ps aux | grep "npm run dev" | grep -v grep | wc -l
```

### Logs Centralisés

```bash
# Créer un terminal multi-panes avec tmux
tmux new-session \; \
  split-window -h \; \
  split-window -v \; \
  select-pane -t 0 \; \
  send-keys 'tail -f ~/hometrip-microservices/logs/api-gateway*.log' C-m \; \
  select-pane -t 1 \; \
  send-keys 'tail -f ~/hometrip-microservices/logs/auth-service*.log' C-m \; \
  select-pane -t 2 \; \
  send-keys 'tail -f ~/hometrip-microservices/logs/booking-service*.log' C-m
```

## Aide

```bash
# Afficher l'aide
npx tsx scripts/dev.ts help

# Lister tous les services
npx tsx scripts/dev.ts list
```

## Support

Pour toute question :
1. Vérifier les logs dans `~/hometrip-microservices/logs/`
2. Vérifier le statut : `npx tsx scripts/dev.ts status`
3. Consulter ce README

---

**Astuce**: Utilisez `npx tsx scripts/dev.ts status` régulièrement pour surveiller vos services !
