const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');

/**
 * POST /logs - Ingest single log
 */
router.post('/', logController.ingestLog);

/**
 * POST /logs/batch - Ingest multiple logs
 */
router.post('/batch', logController.ingestBatch);

/**
 * GET /logs - Query logs with filters
 * Query Parameters:
 * - service: Filter by service name
 * - level: Filter by log level (error, warn, info, debug, verbose)
 * - startDate: Filter by start date (ISO 8601)
 * - endDate: Filter by end date (ISO 8601)
 * - userId: Filter by user ID
 * - requestId: Filter by request ID
 * - tags: Comma-separated list of tags
 * - search: Full-text search in message
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 100, max: 1000)
 * - sort: Field to sort by (default: timestamp)
 * - order: Sort order - 'asc' or 'desc' (default: desc)
 */
router.get('/', logController.queryLogs);

/**
 * GET /logs/stats - Get statistics
 * Query Parameters:
 * - service: Filter by service
 * - startDate: Filter by start date
 * - endDate: Filter by end date
 */
router.get('/stats', logController.getStats);

/**
 * GET /logs/request/:requestId - Get logs for specific request
 */
router.get('/request/:requestId', logController.getRequestLogs);

/**
 * GET /logs/errors - Get error logs
 * Query Parameters:
 * - service: Filter by service
 * - startDate: Filter by start date
 * - endDate: Filter by end date
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 50)
 */
router.get('/errors', logController.getErrors);

/**
 * GET /logs/search - Search with Elasticsearch
 * Query Parameters:
 * - query: Search query (required)
 * - service: Filter by service
 * - level: Filter by log level
 * - startDate: Filter by start date
 * - endDate: Filter by end date
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 100)
 */
router.get('/search', logController.searchLogs);

/**
 * DELETE /logs/cleanup - Cleanup old logs
 * Query Parameters:
 * - days: Delete logs older than N days (default: 90)
 */
router.delete('/cleanup', logController.cleanupLogs);

/**
 * GET /logs/export - Export logs
 * Query Parameters:
 * - service: Filter by service
 * - level: Filter by log level
 * - startDate: Filter by start date
 * - endDate: Filter by end date
 * - format: Export format - 'csv' or 'json' (default: json)
 */
router.get('/export', logController.exportLogs);

module.exports = router;
