const Log = require('../models/Log');
const elasticsearchService = require('../services/elasticsearchService');
const logger = require('../utils/logger');

/**
 * Ingest a log entry
 * POST /logs
 */
exports.ingestLog = async (req, res) => {
  try {
    const logData = {
      ...req.body,
      timestamp: req.body.timestamp ? new Date(req.body.timestamp) : new Date()
    };

    // Validate required fields
    if (!logData.service || !logData.level || !logData.message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: service, level, message'
      });
    }

    // Save to MongoDB
    const log = await Log.createLog(logData);

    // Index in Elasticsearch (async, don't wait)
    elasticsearchService.indexLog(log).catch(err => {
      logger.error('Failed to index log in Elasticsearch:', err);
    });

    res.status(201).json({
      success: true,
      message: 'Log ingested successfully',
      logId: log._id
    });
  } catch (error) {
    logger.error('Error ingesting log:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to ingest log',
      error: error.message
    });
  }
};

/**
 * Ingest multiple logs in batch
 * POST /logs/batch
 */
exports.ingestBatch = async (req, res) => {
  try {
    const { logs } = req.body;

    if (!Array.isArray(logs) || logs.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid batch: logs must be a non-empty array'
      });
    }

    // Prepare logs
    const preparedLogs = logs.map(log => ({
      ...log,
      timestamp: log.timestamp ? new Date(log.timestamp) : new Date()
    }));

    // Bulk insert to MongoDB
    const insertedLogs = await Log.insertMany(preparedLogs, { ordered: false });

    // Bulk index in Elasticsearch (async)
    elasticsearchService.bulkIndexLogs(insertedLogs).catch(err => {
      logger.error('Failed to bulk index logs in Elasticsearch:', err);
    });

    res.status(201).json({
      success: true,
      message: 'Batch ingested successfully',
      count: insertedLogs.length
    });
  } catch (error) {
    logger.error('Error ingesting batch:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to ingest batch',
      error: error.message
    });
  }
};

/**
 * Query logs
 * GET /logs
 */
exports.queryLogs = async (req, res) => {
  try {
    const {
      service,
      level,
      startDate,
      endDate,
      userId,
      requestId,
      search,
      tags,
      page = 1,
      limit = 100,
      sort = 'timestamp',
      order = 'desc'
    } = req.query;

    const filters = {
      service,
      level,
      startDate,
      endDate,
      userId,
      requestId,
      search,
      tags: tags ? tags.split(',') : undefined
    };

    const options = {
      limit: Math.min(parseInt(limit), 1000),
      skip: (parseInt(page) - 1) * Math.min(parseInt(limit), 1000),
      sort: { [sort]: order === 'desc' ? -1 : 1 }
    };

    const result = await Log.queryLogs(filters, options);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error querying logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to query logs',
      error: error.message
    });
  }
};

/**
 * Get log statistics
 * GET /logs/stats
 */
exports.getStats = async (req, res) => {
  try {
    const { service, startDate, endDate } = req.query;

    const stats = await Log.getStats({
      service,
      startDate,
      endDate
    });

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
      error: error.message
    });
  }
};

/**
 * Get logs for specific request
 * GET /logs/request/:requestId
 */
exports.getRequestLogs = async (req, res) => {
  try {
    const { requestId } = req.params;

    const logs = await Log.find({ requestId })
      .sort({ timestamp: 1 })
      .lean();

    res.json({
      success: true,
      requestId,
      count: logs.length,
      logs
    });
  } catch (error) {
    logger.error('Error getting request logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get request logs',
      error: error.message
    });
  }
};

/**
 * Get error logs with details
 * GET /logs/errors
 */
exports.getErrors = async (req, res) => {
  try {
    const {
      service,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    const filters = {
      level: 'error',
      service,
      startDate,
      endDate
    };

    const options = {
      limit: Math.min(parseInt(limit), 500),
      skip: (parseInt(page) - 1) * Math.min(parseInt(limit), 500),
      sort: { timestamp: -1 }
    };

    const result = await Log.queryLogs(filters, options);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error getting errors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get errors',
      error: error.message
    });
  }
};

/**
 * Search logs using Elasticsearch
 * GET /logs/search
 */
exports.searchLogs = async (req, res) => {
  try {
    const {
      query,
      service,
      level,
      startDate,
      endDate,
      page = 1,
      limit = 100
    } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const result = await elasticsearchService.searchLogs({
      query,
      service,
      level,
      startDate,
      endDate,
      from: (parseInt(page) - 1) * parseInt(limit),
      size: Math.min(parseInt(limit), 1000)
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error searching logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search logs',
      error: error.message
    });
  }
};

/**
 * Delete old logs
 * DELETE /logs/cleanup
 */
exports.cleanupLogs = async (req, res) => {
  try {
    const { days = 90 } = req.query;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const result = await Log.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    logger.info(`Cleaned up ${result.deletedCount} old logs`);

    res.json({
      success: true,
      message: 'Logs cleaned up successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    logger.error('Error cleaning up logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup logs',
      error: error.message
    });
  }
};

/**
 * Export logs to file
 * GET /logs/export
 */
exports.exportLogs = async (req, res) => {
  try {
    const {
      service,
      level,
      startDate,
      endDate,
      format = 'json'
    } = req.query;

    const filters = {
      service,
      level,
      startDate,
      endDate
    };

    const result = await Log.queryLogs(filters, { limit: 10000 });

    if (format === 'csv') {
      // Convert to CSV
      const csv = [
        'Timestamp,Level,Service,Message,RequestID,UserID,StatusCode',
        ...result.logs.map(log =>
          `"${log.timestamp}","${log.level}","${log.service}","${log.message}","${log.requestId || ''}","${log.userId || ''}","${log.statusCode || ''}"`
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=logs-${Date.now()}.csv`);
      res.send(csv);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=logs-${Date.now()}.json`);
      res.json(result.logs);
    }
  } catch (error) {
    logger.error('Error exporting logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export logs',
      error: error.message
    });
  }
};
