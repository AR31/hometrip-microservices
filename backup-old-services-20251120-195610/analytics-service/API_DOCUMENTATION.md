# Analytics Service API Documentation

## Base URL

```
http://localhost:4008/analytics
```

## Authentication

All endpoints (except health checks) require JWT authentication in the Authorization header:

```
Authorization: Bearer <JWT_TOKEN>
```

## Endpoints

### Health & Status Checks

#### GET /health
Check service health status.

**No authentication required**

**Response:**
```json
{
  "status": "healthy",
  "service": "analytics-service",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### GET /ready
Check service readiness (dependencies).

**No authentication required**

**Response (Ready):**
```json
{
  "status": "ready",
  "service": "analytics-service"
}
```

**Response (Not Ready):**
```json
{
  "status": "not ready",
  "service": "analytics-service"
}
```

**Status Code:** 503 if not ready

#### GET /metrics
Get service metrics.

**No authentication required**

**Response:**
```json
{
  "service": "analytics-service",
  "uptime": 3600.5,
  "memory": {
    "rss": 53477376,
    "heapTotal": 24641536,
    "heapUsed": 12345678,
    "external": 123456
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Host Endpoints

### GET /analytics/host/stats

Get host dashboard statistics.

**Authentication Required:** Yes (Host role)

**Query Parameters:**
| Parameter | Type | Values | Default | Description |
|-----------|------|--------|---------|-------------|
| period | string | 7d, 30d, 90d, 1y | 7d | Time period for statistics |

**Example:**
```bash
GET /analytics/host/stats?period=30d
```

**Response:**
```json
{
  "success": true,
  "period": "30d",
  "summary": {
    "totalRevenue": 5000,
    "totalBookings": 25,
    "confirmedBookings": 24,
    "completedBookings": 20,
    "cancelledBookings": 1,
    "totalListings": 3,
    "activeListings": 3,
    "averageRating": 4.8,
    "totalReviews": 20,
    "occupancyRate": 75.5,
    "listingViews": 1200,
    "uniqueGuests": 18
  },
  "timeSeries": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "date": "2024-01-01T00:00:00.000Z",
      "metrics": {
        "totalRevenue": 150,
        "totalBookings": 1
      }
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "date": "2024-01-02T00:00:00.000Z",
      "metrics": {
        "totalRevenue": 200,
        "totalBookings": 2
      }
    }
  ],
  "upcomingCheckIns": {
    "totalBookings": 2,
    "bookedNights": 5
  }
}
```

**Status Codes:**
- 200: Success
- 401: Unauthorized
- 500: Server error

---

## Admin Endpoints

### GET /analytics/admin/stats

Get admin KPI dashboard with platform-wide metrics.

**Authentication Required:** Yes (Admin role)

**Query Parameters:**
| Parameter | Type | Values | Default | Description |
|-----------|------|--------|---------|-------------|
| period | string | 7d, 30d, 90d, 1y | 7d | Time period for statistics |

**Example:**
```bash
GET /analytics/admin/stats?period=30d
```

**Response:**
```json
{
  "success": true,
  "period": "30d",
  "summary": {
    "totalRevenue": 50000,
    "totalCommission": 5000,
    "totalPlatformFee": 2500,
    "totalBookings": 250,
    "confirmedBookings": 240,
    "completedBookings": 200,
    "cancelledBookings": 10,
    "totalUsers": 1000,
    "newUsers": 100,
    "hostCount": 150,
    "guestCount": 850,
    "totalListings": 500,
    "newListings": 25,
    "activeListings": 480,
    "totalReviews": 200,
    "averageRating": 4.7,
    "listingViews": 15000
  },
  "timeSeries": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "date": "2024-01-01T00:00:00.000Z",
      "metrics": {
        "totalRevenue": 1500,
        "totalBookings": 10,
        "newUsers": 5
      }
    }
  ],
  "topHosts": [
    {
      "hostId": "507f1f77bcf86cd799439013",
      "hostName": "John Doe",
      "totalRevenue": 5000,
      "totalBookings": 25
    },
    {
      "hostId": "507f1f77bcf86cd799439014",
      "hostName": "Jane Smith",
      "totalRevenue": 4500,
      "totalBookings": 22
    }
  ]
}
```

**Status Codes:**
- 200: Success
- 401: Unauthorized
- 403: Forbidden (not admin)
- 500: Server error

---

## Report Generation

### POST /analytics/report

Generate custom analytics reports in JSON or CSV format.

**Authentication Required:** Yes (Host or Admin)

**Request Body:**
```json
{
  "reportType": "host|admin",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "format": "json|csv"
}
```

**Parameters:**
| Field | Type | Required | Values | Description |
|-------|------|----------|--------|-------------|
| reportType | string | Yes | host, admin | Type of report to generate |
| startDate | string | Yes | ISO 8601 date | Start date (YYYY-MM-DD) |
| endDate | string | Yes | ISO 8601 date | End date (YYYY-MM-DD) |
| format | string | No | json, csv | Output format (default: json) |
| hostId | string | No | - | Host ID (required for admin generating host report) |

**Example - JSON Report:**
```bash
curl -X POST http://localhost:4008/analytics/report \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "host",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "format": "json"
  }'
```

**Response (JSON):**
```json
{
  "success": true,
  "report": {
    "type": "host",
    "period": {
      "from": "2024-01-01",
      "to": "2024-01-31"
    },
    "generatedAt": "2024-01-15T10:30:00.000Z",
    "summary": {
      "totalRevenue": 5000,
      "totalBookings": 25,
      "confirmedBookings": 24,
      "completedBookings": 20,
      "cancelledBookings": 1,
      "totalUsers": 18,
      "totalListings": 3,
      "activeListings": 3,
      "listingViews": 1200
    },
    "data": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "type": "revenue",
        "hostId": "507f1f77bcf86cd799439012",
        "date": "2024-01-01T00:00:00.000Z",
        "metrics": {
          "totalRevenue": 150,
          "totalBookings": 1,
          "confirmedBookings": 1,
          "completedBookings": 0
        }
      }
    ]
  }
}
```

**Example - CSV Report:**
```bash
curl -X POST http://localhost:4008/analytics/report \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "host",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "format": "csv"
  }' > report.csv
```

**Response (CSV):**
```
Date,Total Revenue,Total Bookings,Confirmed,Completed,Cancelled
2024-01-01,150,1,1,0,0
2024-01-02,200,2,2,0,0
2024-01-03,175,1,1,1,0
```

**Status Codes:**
- 200: Success
- 400: Bad request (invalid dates, missing fields)
- 401: Unauthorized
- 403: Forbidden
- 500: Server error

---

## Summary

### GET /analytics/summary

Get quick analytics summary.

**Authentication Required:** Yes

**Query Parameters:**
| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| days | integer | 30 | 1-365 | Number of days to summarize |

**Example:**
```bash
GET /analytics/summary?days=30
```

**Response:**
```json
{
  "success": true,
  "summary": [
    {
      "_id": "host_dashboard",
      "count": 30,
      "totalRevenue": 5000,
      "totalBookings": 25,
      "totalUsers": 18
    },
    {
      "_id": "revenue",
      "count": 30,
      "totalRevenue": 5000,
      "totalBookings": 25,
      "totalUsers": 0
    }
  ],
  "period": "Last 30 days"
}
```

**Status Codes:**
- 200: Success
- 400: Bad request
- 401: Unauthorized
- 500: Server error

---

## Internal Endpoints

### POST /analytics/track

Track analytics event (internal use).

**Authentication Required:** No (Internal service only)

**Request Body:**
```json
{
  "eventType": "string",
  "hostId": "string (optional)",
  "data": {
    "metric1": "value1",
    "metric2": 123
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:4008/analytics/track \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "custom_metric",
    "hostId": "507f1f77bcf86cd799439012",
    "data": {
      "views": 100,
      "clicks": 15
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Event tracked"
}
```

**Status Codes:**
- 200: Success
- 400: Bad request
- 500: Server error

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Error message for this field"
    }
  ]
}
```

### Common Error Codes

| Code | Message |
|------|---------|
| 400 | Bad request - validation error |
| 401 | Authentication required |
| 403 | Access denied - insufficient privileges |
| 404 | Route not found |
| 500 | Internal server error |

---

## Rate Limiting

Default rate limits:
- **Window:** 15 minutes
- **Max requests:** 100 per window
- **Headers:** Includes X-RateLimit-* headers in response

---

## Data Retention

- Analytics data is retained for 2 years by default
- Old data is archived/deleted automatically
- Configure with `RETENTION_DAYS` environment variable

---

## Response Headers

All successful responses include:
```
Content-Type: application/json
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1705316400
```

---

## Pagination

Report data supports pagination through limiting. For large datasets:
1. Use narrower date ranges
2. Request CSV format for bulk export
3. Implement client-side pagination

---

## Best Practices

1. **Caching**: Cache responses client-side when possible
2. **Date Ranges**: Use appropriate periods (7d, 30d, etc.)
3. **Error Handling**: Implement retry logic with exponential backoff
4. **Monitoring**: Monitor rate limits and implement alerts
5. **Testing**: Test with sample JWT tokens in staging environment

---

## Example Workflows

### Get Host Dashboard

```bash
# Get recent stats
curl -X GET "http://localhost:4008/analytics/host/stats?period=30d" \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Get time-series data for charts
# Response includes timeSeries array for graphing
```

### Generate Monthly Report

```bash
# Generate report for previous month
curl -X POST http://localhost:4008/analytics/report \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "host",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "format": "csv"
  }' > January_2024_Report.csv
```

### Admin Platform Overview

```bash
# Get admin dashboard with top hosts
curl -X GET "http://localhost:4008/analytics/admin/stats?period=90d" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"

# Response includes topHosts array showing best performers
```

---

## Support

For API issues or questions, please refer to the Integration Guide or contact support.
