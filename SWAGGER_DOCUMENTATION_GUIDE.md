# 📚 Swagger Documentation Guide - HomeTrip Microservices

## 🎯 Overview

All 13 HomeTrip microservices now have Swagger/OpenAPI documentation integrated.

### ✅ What's Been Done

1. ✅ **Swagger dependencies installed** in all 13 services
2. ✅ **Configuration files created** for each service
3. ✅ **Routes added** - `/api-docs` endpoint on each service
4. ✅ **Example documentation** - Auth service fully documented

---

## 🚀 Accessing Swagger UI

### When Services Are Running

Each microservice has its own Swagger UI at `/api-docs`:

| Service | Swagger URL | Port |
|---------|-------------|------|
| API Gateway | http://localhost:3000/api-docs | 3000 |
| Auth Service | http://localhost:3001/api-docs | 3001 |
| User Service | http://localhost:3002/api-docs | 3002 |
| Listing Service | http://localhost:3003/api-docs | 3003 |
| Booking Service | http://localhost:3004/api-docs | 3004 |
| Payment Service | http://localhost:3005/api-docs | 3005 |
| Message Service | http://localhost:3006/api-docs | 3006 |
| Notification Service | http://localhost:3007/api-docs | 3007 |
| Review Service | http://localhost:3008/api-docs | 3008 |
| Search Service | http://localhost:3009/api-docs | 3009 |
| Analytics Service | http://localhost:3010/api-docs | 3010 |
| WebSocket Gateway | http://localhost:3011/api-docs | 3011 |
| Logger Service | http://localhost:3012/api-docs | 3012 |

### Start Services to Access Swagger

```bash
cd ~/hometrip-microservices

# Make sure MongoDB is running
sudo systemctl start mongod

# Start all services
npx tsx scripts/dev.ts start

# Open Swagger UI in browser
# Example: http://localhost:3001/api-docs
```

---

## 📝 How to Document Your APIs

### Basic Route Documentation

```javascript
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login to user account
 *     description: Authenticate user with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecurePass123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", loginValidation, validate, authController.login);
```

### Protected Routes (with Authentication)

```javascript
/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user
 *     description: Get the authenticated user's profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []  # <-- Requires JWT token
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/me", authMiddleware, authController.getMe);
```

### Reusable Schemas

Define schemas once, reuse everywhere:

```javascript
/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - fullName
 *       properties:
 *         id:
 *           type: string
 *           example: 507f1f77bcf86cd799439011
 *         email:
 *           type: string
 *           format: email
 *           example: user@example.com
 *         fullName:
 *           type: string
 *           example: John Doe
 *         role:
 *           type: string
 *           enum: [user, host, guest, admin]
 *           example: user
 */

// Then reference it:
/**
 * @swagger
 * /users:
 *   get:
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
```

---

## 🔑 Authentication in Swagger UI

To test protected endpoints:

1. **Login** via `/auth/login` endpoint
2. **Copy** the JWT token from response
3. **Click** the "Authorize" button (🔓 icon) at top of Swagger UI
4. **Paste** token in format: `Bearer your-token-here`
5. **Click** "Authorize"
6. **Test** protected endpoints

---

## 📂 File Structure

Each service has the same structure:

```
services/{service-name}/
├── src/
│   ├── config/
│   │   └── swagger.js         # Swagger configuration
│   ├── routes/
│   │   └── *.js               # Routes with @swagger comments
│   └── index.js               # Main file with /api-docs route
└── package.json               # With swagger dependencies
```

---

## 🛠️ Configuration Files

### Swagger Config: `src/config/swagger.js`

Each service has this file with:
- OpenAPI 3.0 specification
- Service-specific info (title, description, version)
- Server URLs (direct + via API Gateway)
- Security schemes (JWT, API Keys)
- Common schemas and responses
- UI customization

### Main Routes: `src/index.js`

Swagger UI mounted at:
```javascript
const { swaggerSpec, swaggerUi, swaggerUiOptions } = require('./config/swagger');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
```

---

## 📋 Example: Auth Service

The **auth-service** is fully documented as a reference example.

**File:** `services/auth-service/src/routes/auth.js`

Documented endpoints:
- ✅ `POST /auth/signup` - Create account
- ✅ `POST /auth/login` - Login
- ✅ `POST /auth/refresh` - Refresh token
- ✅ `GET /auth/me` - Get current user (protected)
- ✅ `POST /auth/logout` - Logout (protected)
- ✅ `POST /auth/change-password` - Change password (protected)

**View it at:** http://localhost:3001/api-docs (when service is running)

---

## 🎨 Tags for Organization

Use tags to group related endpoints:

```javascript
/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]  # Groups under "Users" section
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Authentication]  # Groups under "Authentication" section
 */
```

---

## 📊 Common Response Schemas

Already configured in all services:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": {}
}
```

Reference them:
```javascript
/**
 * @swagger
 * responses:
 *   200:
 *     content:
 *       application/json:
 *         schema:
 *           $ref: '#/components/schemas/Success'
 *   400:
 *     content:
 *       application/json:
 *         schema:
 *           $ref: '#/components/schemas/Error'
 */
```

---

## 🧪 Testing APIs

### In Swagger UI

1. Click on any endpoint to expand
2. Click "Try it out"
3. Fill in parameters/body
4. Click "Execute"
5. View response

### Export to Postman/Insomnia

Swagger UI can export the OpenAPI spec:
- Click "View" → "OpenAPI JSON"
- Import into Postman or Insomnia

---

## 🚀 Next Steps

### To Document Your Service

1. **Open** the service's route file (e.g., `src/routes/users.js`)
2. **Add** JSDoc comments with `@swagger` tag above each route
3. **Use** the auth-service as a reference
4. **Test** by visiting `http://localhost:{port}/api-docs`

### Tips

- Start with simple documentation, add details later
- Copy examples from auth-service
- Use `$ref` to avoid repeating schemas
- Test in Swagger UI as you document
- Add examples for better developer experience

---

## 📚 Documentation Templates

### GET Endpoint (List)
```javascript
/**
 * @swagger
 * /items:
 *   get:
 *     summary: Get all items
 *     tags: [Items]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of items
 */
```

### GET Endpoint (Single)
```javascript
/**
 * @swagger
 * /items/{id}:
 *   get:
 *     summary: Get item by ID
 *     tags: [Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item found
 *       404:
 *         description: Item not found
 */
```

### POST Endpoint (Create)
```javascript
/**
 * @swagger
 * /items:
 *   post:
 *     summary: Create new item
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Item created
 */
```

### PUT Endpoint (Update)
```javascript
/**
 * @swagger
 * /items/{id}:
 *   put:
 *     summary: Update item
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Item updated
 */
```

### DELETE Endpoint
```javascript
/**
 * @swagger
 * /items/{id}:
 *   delete:
 *     summary: Delete item
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item deleted
 *       404:
 *         description: Item not found
 */
```

---

## 🔍 Troubleshooting

### Swagger UI not loading

```bash
# Check if service is running
npx tsx scripts/dev.ts status

# Check service logs
tail -f logs/{service-name}_*_error.log

# Restart service
npx tsx scripts/dev.ts restart {service-name}
```

### Documentation not showing up

1. Check JSDoc comments have `@swagger` tag
2. Verify route file is in `apis` array in `swagger.js`
3. Restart the service
4. Clear browser cache

### Syntax errors

- Use YAML syntax in JSDoc comments
- Indentation must be exactly 2 spaces
- Use `$ref` with exact path: `#/components/schemas/User`

---

## 📖 Resources

- **OpenAPI 3.0 Specification**: https://swagger.io/specification/
- **Swagger UI**: https://swagger.io/tools/swagger-ui/
- **Examples**: See `services/auth-service/src/routes/auth.js`

---

## ✅ Summary

**Status:** Swagger integrated in all 13 microservices

**Access:** `http://localhost:{port}/api-docs`

**Example:** Auth service at http://localhost:3001/api-docs

**Next:** Document your routes following the auth-service example

---

**Last Updated:** 2025-11-17
**Documentation Status:** 🟢 Ready to Use
