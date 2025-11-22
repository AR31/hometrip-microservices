# User Service - API Routes Reference

## Authentication
All protected endpoints require either:
1. Bearer token: `Authorization: Bearer {jwt_token}`
2. Custom headers:
   - `x-user-id: {user_id}`
   - `x-user-email: {email}`
   - `x-user-role: {role}`

## Public Endpoints

### Get User Profile
```
GET /users/:id
```
Returns public profile information for any user.

## Protected Endpoints (Require Authentication)

### User Profile

#### Get Current User Profile
```
GET /users/me
Authorization: Bearer {token}
```

#### Update User Profile
```
PUT /users/:id
Authorization: Bearer {token}

{
  "fullName": "string",
  "bio": "string (max 500 chars)",
  "phoneNumber": "string",
  "dateOfBirth": "ISO8601 date",
  "address": {
    "street": "string",
    "city": "string",
    "state": "string",
    "zipCode": "string",
    "country": "string"
  }
}
```

#### Delete User Account
```
DELETE /users/:id
Authorization: Bearer {token}
```

### Favorites Management

#### Get Favorites List
```
GET /users/:id/favorites
Authorization: Bearer {token}
```

#### Add to Favorites
```
POST /users/:id/favorites/:listingId
Authorization: Bearer {token}
```

#### Remove from Favorites
```
DELETE /users/:id/favorites/:listingId
Authorization: Bearer {token}
```

### Identity Verification

#### Verify Identity
```
POST /users/:id/verify-identity
Authorization: Bearer {token}

{
  "documentType": "string",
  "documentUrl": "valid URL",
  "verificationMethod": "identity" | "selfie" | "phone"
}
```

#### Get Verification Status
```
GET /users/:id/verification-status
Authorization: Bearer {token}
```

Response:
```json
{
  "success": true,
  "data": {
    "isVerified": true,
    "verificationStatus": {
      "email": true,
      "phone": false,
      "identity": true,
      "selfie": false
    }
  }
}
```

### Settings & Preferences

#### Update User Settings
```
PUT /users/:id/settings
Authorization: Bearer {token}

{
  "notifications": {
    "email": boolean,
    "push": boolean,
    "sms": boolean,
    "marketing": boolean
  },
  "preferences": {
    "language": "fr" | "en" | ...,
    "currency": "EUR" | "USD" | ...,
    "theme": "light" | "dark"
  }
}
```

### Device Management

#### Get User Devices
```
GET /users/:id/devices
Authorization: Bearer {token}
```

#### Register/Update Device
```
POST /users/:id/devices
Authorization: Bearer {token}

{
  "deviceId": "string (required)",
  "deviceName": "string",
  "deviceType": "mobile" | "tablet" | "desktop",
  "browser": "string",
  "os": "string",
  "ipAddress": "valid IP"
}
```

#### Remove Device
```
DELETE /users/:id/devices/:deviceId
Authorization: Bearer {token}
```

## Health & Metrics

### Liveness Check
```
GET /health
```

### Readiness Check
```
GET /ready
```

### Service Metrics
```
GET /metrics
```

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Server Error |

## Error Response Format

```json
{
  "success": false,
  "message": "Error description"
}
```

## Rate Limiting

- Window: 15 minutes
- Max requests: 100 per window
- Headers returned:
  - `RateLimit-Limit`: 100
  - `RateLimit-Remaining`: remaining requests
  - `RateLimit-Reset`: reset time (unix timestamp)

## Request/Response Content-Type

All endpoints use:
- **Request**: `application/json`
- **Response**: `application/json`

## Authorization Levels

| Operation | Required | Notes |
|-----------|----------|-------|
| GET /users/:id | None | Public profile |
| GET /users/me | Auth | Own profile |
| PUT /users/:id | Auth | Own data or admin |
| DELETE /users/:id | Auth | Own account or admin |
| Favorites | Auth | Own favorites or admin |
| Verification | Auth | Own verification or admin |
| Settings | Auth | Own settings or admin |
| Devices | Auth | Own devices or admin |

## Example Requests

### Get Current User
```bash
curl -H "Authorization: Bearer {token}" \
  http://localhost:4002/users/me
```

### Update Profile
```bash
curl -X PUT -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"John Doe","bio":"Traveler"}' \
  http://localhost:4002/users/{userId}
```

### Add Favorite
```bash
curl -X POST -H "Authorization: Bearer {token}" \
  http://localhost:4002/users/{userId}/favorites/{listingId}
```

### Get Verification Status
```bash
curl -H "Authorization: Bearer {token}" \
  http://localhost:4002/users/{userId}/verification-status
```

### Register Device
```bash
curl -X POST -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId":"device-uuid",
    "deviceName":"iPhone 14",
    "deviceType":"mobile",
    "browser":"Safari",
    "os":"iOS 16"
  }' \
  http://localhost:4002/users/{userId}/devices
```
