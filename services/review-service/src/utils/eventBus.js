const amqp = require('amqplib');
const logger = require('./logger');

class EventBus {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.exchange = 'hometrip_events';
    this.connected = false;
  }

  /**
   * Connect to RabbitMQ
   */
  async connect() {
    try {
      const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://hometrip:hometrip_rabbitmq_pass@rabbitmq:5672';

      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      // Assert exchange
      await this.channel.assertExchange(this.exchange, 'topic', {
        durable: true
      });

      this.connected = true;
      logger.info('Connected to RabbitMQ');

      // Handle connection errors
      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error:', err);
        this.connected = false;
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.connected = false;
        // Attempt to reconnect after 5 seconds
        setTimeout(() => this.connect(), 5000);
      });

    } catch (error) {
      logger.error('Failed to connect to RabbitMQ:', error);
      this.connected = false;
      // Retry connection after 5 seconds
      setTimeout(() => this.connect(), 5000);
    }
  }

  /**
   * Publish an event
   * @param {string} eventName - Name of the event (e.g., 'review.created')
   * @param {Object} data - Event data
   */
  async publish(eventName, data) {
    if (!this.connected || !this.channel) {
      logger.warn(`Cannot publish event ${eventName}: Not connected to RabbitMQ`);
      return;
    }

    try {
      const message = JSON.stringify({
        eventName,
        data,
        timestamp: new Date(),
        service: 'review-service'
      });

      this.channel.publish(
        this.exchange,
        eventName,
        Buffer.from(message),
        { persistent: true }
      );

      logger.debug(`Published event: ${eventName}`);
    } catch (error) {
      logger.error(`Failed to publish event ${eventName}:`, error);
    }
  }

  /**
   * Subscribe to an event
   * @param {string} eventName - Name of the event to subscribe to
   * @param {Function} handler - Handler function for the event
   */
  async subscribe(eventName, handler) {
    if (!this.connected || !this.channel) {
      logger.warn(`Cannot subscribe to event ${eventName}: Not connected to RabbitMQ`);
      return;
    }

    try {
      // Create a queue for this service
      const queueName = `review-service.${eventName}`;
      await this.channel.assertQueue(queueName, { durable: true });

      // Bind queue to exchange with routing key
      await this.channel.bindQueue(queueName, this.exchange, eventName);

      // Consume messages
      this.channel.consume(queueName, async (msg) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            logger.debug(`Received event: ${eventName}`);
            await handler(content.data);
            this.channel.ack(msg);
          } catch (error) {
            logger.error(`Error handling event ${eventName}:`, error);
            // Reject and requeue the message
            this.channel.nack(msg, false, true);
          }
        }
      });

      logger.info(`Subscribed to event: ${eventName}`);
    } catch (error) {
      logger.error(`Failed to subscribe to event ${eventName}:`, error);
    }
  }

  /**
   * Close connection
   */
  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.connected = false;
      logger.info('Disconnected from RabbitMQ');
    } catch (error) {
      logger.error('Error closing RabbitMQ connection:', error);
    }
  }
}

// Export singleton instance
const eventBus = new EventBus();
module.exports = eventBus;
