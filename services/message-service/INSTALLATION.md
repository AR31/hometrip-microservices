# Quick Start Guide - Message Service

## Installation & Setup (5 minutes)

### Step 1: Install Dependencies
```bash
cd /home/arwa/hometrip-microservices/services/message-service
npm install
```

### Step 2: Setup Environment
```bash
cp .env.example .env
```

Edit `.env` file with your settings.

### Step 3: Start Services (Docker)
```bash
docker-compose up -d
```

This starts:
- MongoDB (port 27017)
- RabbitMQ (port 5672, UI: 15672)
- Message Service (port 4006)

### Step 4: Run Service
```bash
npm run dev
```

### Step 5: Test Health Check
```bash
curl http://localhost:4006/health
```

---

## Quick API Examples

### Create a Conversation
```bash
curl -X POST http://localhost:4006/api/conversations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "participantId": "user123",
    "listingId": "listing456"
  }'
```

### Send a Message
```bash
curl -X POST http://localhost:4006/api/messages/conv789/send \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello!",
    "type": "user"
  }'
```

### Get Conversations
```bash
curl http://localhost:4006/api/conversations \
  -H "Authorization: Bearer <token>"
```

---

## Project Structure

```
message-service/
├── src/
│   ├── models/           # MongoDB schemas
│   │   ├── Message.js
│   │   └── Conversation.js
│   ├── controllers/      # Business logic
│   │   ├── messageController.js
│   │   └── conversationController.js
│   ├── routes/           # API endpoints
│   │   ├── messages.js
│   │   └── conversations.js
│   ├── middleware/       # Authentication, etc
│   │   └── auth.js
│   ├── utils/            # Helper utilities
│   │   ├── logger.js
│   │   └── eventBus.js
│   ├── config/           # Configuration
│   │   ├── database.js
│   │   └── index.js
│   └── index.js          # Main entry point
├── package.json          # Dependencies
├── Dockerfile            # Docker configuration
├── .env.example          # Environment template
├── README.md             # Full documentation
├── API_REFERENCE.md      # API endpoints
├── DEPLOYMENT.md         # Deployment guide
└── INSTALLATION.md       # This file
```

---

## Key Features

✓ Real-time messaging
✓ Conversation management
✓ Read/unread tracking
✓ Multi-language support
✓ Event-driven architecture
✓ GDPR compliance (soft delete)
✓ Docker ready
✓ Kubernetes compatible

---

## Common Commands

```bash
# Development
npm run dev

# Production
npm start

# Tests
npm test

# Linting
npm run lint

# View logs
tail -f logs/combined.log
```

---

## Ports & Services

| Service | Port | URL |
|---------|------|-----|
| Message Service | 4006 | http://localhost:4006 |
| MongoDB | 27017 | mongodb://localhost:27017 |
| RabbitMQ | 5672 | amqp://localhost:5672 |
| RabbitMQ UI | 15672 | http://localhost:15672 |

---

## Next Steps

1. Review `API_REFERENCE.md` for all endpoints
2. Read `README.md` for detailed documentation
3. Check `DEPLOYMENT.md` for production setup
4. Integrate with WebSocket Gateway
5. Add comprehensive tests

---

## Support & Debugging

### Logs
```bash
tail -f logs/error.log
tail -f logs/combined.log
```

### Health Check
```bash
curl http://localhost:4006/health
```

### Database Connection
```bash
mongosh --uri "mongodb://localhost:27017/hometrip-messages"
```

### RabbitMQ Status
```bash
curl -i -u guest:guest http://localhost:15672/api/overview
```

---

## Troubleshooting

**Service won't start?**
- Check MongoDB is running: `docker-compose ps`
- Check port 4006 is available: `lsof -i :4006`
- Check logs: `tail -f logs/combined.log`

**Database errors?**
- Restart MongoDB: `docker-compose restart mongodb`
- Check connection string in `.env`

**RabbitMQ issues?**
- Restart RabbitMQ: `docker-compose restart rabbitmq`
- Check RabbitMQ UI: http://localhost:15672

---

For more information, see the full documentation in README.md
