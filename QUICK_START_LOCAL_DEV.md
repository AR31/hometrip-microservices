# 🚀 Quick Start - Local Development

## ✅ What We've Done So Far

1. ✅ Installed all npm dependencies for 13 microservices
2. ✅ Created .env files configured for local development (without Docker)
3. ✅ Configured MongoDB URIs to use `localhost:27017` without authentication

## ⚠️ Current Blocker: MongoDB Not Installed

The microservices are **ready to run** but need MongoDB to function.

### Services Status:
- **Nodemon**: ✅ Installed and working
- **Dependencies**: ✅ All installed
- **Configuration**: ✅ Configured for localhost
- **MongoDB Server**: ❌ **Not installed**

## 🔧 Next Steps to Get Everything Running

### Step 1: Install MongoDB

MongoDB is not currently installed on this system. You need to install it:

```bash
# Install MongoDB Community Edition
sudo apt-get update
sudo apt-get install -y mongodb-org

# Or if using Ubuntu 22.04+:
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
```

### Step 2: Start MongoDB

```bash
# Start MongoDB service
sudo systemctl start mongod

# Enable MongoDB to start on boot
sudo systemctl enable mongod

# Verify MongoDB is running
sudo systemctl status mongod

# Test connection
mongosh --eval "db.adminCommand('ping')"
```

### Step 3: Start Microservices

Once MongoDB is running:

```bash
cd ~/hometrip-microservices

# Start all services
npx tsx scripts/dev.ts start

# Check status
npx tsx scripts/dev.ts status
```

## 📊 Expected Result

After MongoDB is installed and running, all 13 services should start successfully:

```
✅ api-gateway (Port 3000)
✅ auth-service (Port 3001)
✅ user-service (Port 3002)
✅ listing-service (Port 3003)
✅ booking-service (Port 3004)
✅ payment-service (Port 3005)
✅ message-service (Port 3006)
✅ notification-service (Port 3007)
✅ review-service (Port 3008)
✅ search-service (Port 3009)
✅ analytics-service (Port 3010)
✅ websocket-gateway (Port 3011)
✅ logger-service (Port 3012)
```

## 🛠️ Alternative: Use Docker for MongoDB Only

If you prefer not to install MongoDB system-wide, you can use Docker just for MongoDB:

```bash
# Install Docker if not already installed
sudo apt-get install docker.io

# Start MongoDB container
docker run -d \
  --name mongodb-hometrip \
  -p 27017:27017 \
  -v ~/mongodb-data:/data/db \
  mongo:7.0

# Verify it's running
docker ps | grep mongodb
```

Then start the microservices as usual.

## 🔍 Troubleshooting

### Check if MongoDB is running:
```bash
sudo systemctl status mongod
# or
docker ps | grep mongo
```

### Check MongoDB logs:
```bash
sudo tail -f /var/log/mongodb/mongod.log
# or
docker logs mongodb-hometrip
```

### Test MongoDB connection:
```bash
mongosh
# Should connect without errors
```

### If services still fail, check logs:
```bash
tail -f ~/hometrip-microservices/logs/*_error.log
```

## 📝 Summary

**Current State:**
- ✅ All microservices have dependencies installed
- ✅ All .env files configured for local development
- ✅ Process manager (dev.ts) working correctly
- ❌ **MongoDB needs to be installed**

**To Complete Setup:**
1. Install MongoDB (see Step 1 above)
2. Start MongoDB service
3. Run `npx tsx scripts/dev.ts start`
4. Verify all services are running

## 🎯 Scripts Available

```bash
# Setup environment (already done)
bash scripts/setup-simple-local-env.sh

# Install dependencies (already done)
bash scripts/install-all.sh

# Manage services
npx tsx scripts/dev.ts start [service]    # Start all or specific service
npx tsx scripts/dev.ts stop [service]     # Stop all or specific service
npx tsx scripts/dev.ts restart [service]  # Restart all or specific service
npx tsx scripts/dev.ts status             # Check status of all services
npx tsx scripts/dev.ts list               # List all available services
```

## 🔗 After Services Are Running

Once all microservices are running, you can:

1. **Start the frontend** (on port 3100):
   ```bash
   cd ~/hometrip
   PORT=3100 npm run dev
   ```

2. **Access the application**:
   - Frontend: http://localhost:3100
   - API Gateway: http://localhost:3000
   - Individual services: http://localhost:3001-3012

3. **Monitor logs**:
   ```bash
   tail -f ~/hometrip-microservices/logs/*.log
   ```

---

**Need Help?**
- Check [FINAL_SETUP_SUMMARY.md](FINAL_SETUP_SUMMARY.md) for complete documentation
- Check [INFRASTRUCTURE_SETUP.md](INFRASTRUCTURE_SETUP.md) for detailed MongoDB setup
