const eventBus = require('../utils/eventBus');
const Log = require('../models/Log');
const elasticsearchService = require('./elasticsearchService');
const logger = require('../utils/logger');

class EventBusListener {
  constructor() {
    this.isListening = false;
  }

  /**
   * Start listening to log events from RabbitMQ
   */
  async start() {
    try {
      // Wait for event bus to be connected
      if (!eventBus.isConnected) {
        logger.warn('Event bus not connected, waiting before subscribing...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Subscribe to all log events
      await eventBus.subscribe('log.*', async (message) => {
        await this.handleLogEvent(message);
      });

      this.isListening = true;
      logger.info('Event bus listener started, listening to log.* events');
    } catch (error) {
      logger.error('Failed to start event bus listener:', error);
      throw error;
    }
  }

  /**
   * Handle incoming log event from RabbitMQ
   */
  async handleLogEvent(message) {
    try {
      // Validate message structure
      if (!message.service || !message.level || !message.message) {
        logger.warn('Received invalid log event, missing required fields', message);
        return;
      }

      // Prepare log data
      const logData = {
        timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
        level: message.level,
        service: message.service,
        message: message.message,
        hostname: message.hostname,
        environment: message.environment || 'development',
        requestId: message.requestId,
        userId: message.userId,
        method: message.method,
        url: message.url,
        statusCode: message.statusCode,
        responseTime: message.responseTime,
        userAgent: message.userAgent,
        ip: message.ip,
        stack: message.stack,
        errorCode: message.errorCode,
        errorType: message.errorType,
        tags: message.tags || [],
        metadata: message.metadata || {}
      };

      // Save to MongoDB
      const log = await Log.createLog(logData);

      // Index in Elasticsearch (async, don't wait)
      elasticsearchService.indexLog(log).catch(err => {
        logger.error('Failed to index log from event bus in Elasticsearch:', err);
      });

      logger.debug(`Ingested log from ${message.service}`, {
        logId: log._id,
        level: message.level
      });
    } catch (error) {
      logger.error('Error handling log event:', error, {
        message: message.message,
        service: message.service
      });
    }
  }

  /**
   * Stop listening
   */
  async stop() {
    try {
      await eventBus.close();
      this.isListening = false;
      logger.info('Event bus listener stopped');
    } catch (error) {
      logger.error('Error stopping event bus listener:', error);
      throw error;
    }
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      isListening: this.isListening,
      eventBusStatus: eventBus.getStatus()
    };
  }
}

// Export singleton instance
module.exports = new EventBusListener();
