const axios = require('axios');
const logger = require('./logger');
const config = require('../config');
const { v4: uuidv4 } = require('uuid');

/**
 * Event Bus Service - Handles inter-service communication
 * Publishes and subscribes to domain events
 */
class EventBus {
  constructor() {
    this.eventBusUrl = config.EVENT_BUS_URL;
    this.serviceName = 'payment-service';
    this.subscribers = {};
  }

  /**
   * Publish an event to the event bus
   */
  async publishEvent(eventType, data, metadata = {}) {
    try {
      const event = {
        id: uuidv4(),
        type: eventType,
        service: this.serviceName,
        timestamp: new Date().toISOString(),
        data,
        metadata,
      };

      logger.logPaymentEvent(eventType, {
        eventId: event.id,
        data,
      });

      // Try to publish to event bus (non-blocking)
      try {
        await axios.post(`${this.eventBusUrl}/events`, event, {
          timeout: 5000,
        });
        logger.info(`Event published: ${eventType}`, { eventId: event.id });
      } catch (error) {
        logger.warn(`Failed to publish event to bus (retrying locally): ${eventType}`, {
          error: error.message,
        });
        // Event is still processed locally even if bus fails
      }

      return event;
    } catch (error) {
      logger.logError('Error publishing event', error, {
        eventType,
        data,
      });
      throw error;
    }
  }

  /**
   * Subscribe to events from other services
   */
  async subscribeToEvent(eventType, handler) {
    try {
      if (!this.subscribers[eventType]) {
        this.subscribers[eventType] = [];
      }

      this.subscribers[eventType].push(handler);
      logger.info(`Subscribed to event: ${eventType}`);

      // Register subscription with event bus
      try {
        await axios.post(`${this.eventBusUrl}/subscribe`, {
          service: this.serviceName,
          event: eventType,
          webhook: `${process.env.SERVICE_URL || 'http://payment-service:4005'}/api/events`,
        });
      } catch (error) {
        logger.warn(`Failed to register subscription with event bus: ${eventType}`, {
          error: error.message,
        });
      }
    } catch (error) {
      logger.logError('Error subscribing to event', error, {
        eventType,
      });
    }
  }

  /**
   * Handle incoming events
   */
  async handleEvent(event) {
    try {
      const handlers = this.subscribers[event.type] || [];

      if (handlers.length === 0) {
        logger.warn(`No handlers found for event: ${event.type}`);
        return;
      }

      logger.info(`Processing event: ${event.type}`, {
        eventId: event.id,
        source: event.service,
      });

      // Execute all handlers for this event
      const results = await Promise.all(
        handlers.map((handler) =>
          handler(event).catch((error) => {
            logger.logError(`Error in event handler for ${event.type}`, error, {
              eventId: event.id,
              handler: handler.name,
            });
            throw error;
          })
        )
      );

      return results;
    } catch (error) {
      logger.logError('Error handling event', error, {
        event: event.type,
      });
      throw error;
    }
  }

  /**
   * Publish multiple events in batch
   */
  async publishBatch(events) {
    try {
      const results = await Promise.all(
        events.map((event) =>
          this.publishEvent(event.type, event.data, event.metadata).catch((error) => {
            logger.logError(`Error publishing event ${event.type}`, error);
            return { error: error.message };
          })
        )
      );

      return results;
    } catch (error) {
      logger.logError('Error in batch publish', error);
      throw error;
    }
  }

  /**
   * Get list of available events
   */
  getAvailableEvents() {
    return {
      published: [
        'payment.created',
        'payment.succeeded',
        'payment.failed',
        'payment.refunded',
        'payment.intent.created',
        'refund.initiated',
        'refund.completed',
        'host.payout.initiated',
      ],
      subscribed: Object.keys(this.subscribers),
    };
  }
}

// Create singleton instance
const eventBus = new EventBus();

module.exports = eventBus;
