const amqp = require('amqplib');
const config = require('../config');
const logger = require('./logger');

class EventBus {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 3000; // 3 seconds
  }

  /**
   * Connect to RabbitMQ
   */
  async connect() {
    try {
      this.connection = await amqp.connect(config.RABBITMQ_URL);
      this.channel = await this.connection.createChannel();

      // Set up error handlers
      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error:', err);
        this.isConnected = false;
        this.reconnect();
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.isConnected = false;
        this.reconnect();
      });

      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Create exchange if it doesn't exist
      await this.channel.assertExchange(
        config.RABBITMQ_EXCHANGE,
        'topic',
        { durable: true }
      );

      logger.info(`Connected to RabbitMQ at ${config.RABBITMQ_URL}`);
      return true;
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ:', error);
      this.isConnected = false;
      this.reconnect();
      return false;
    }
  }

  /**
   * Reconnect to RabbitMQ with exponential backoff
   */
  async reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max RabbitMQ reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    logger.warn(`Attempting to reconnect to RabbitMQ in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Subscribe to a topic pattern
   */
  async subscribe(pattern, handler) {
    if (!this.isConnected || !this.channel) {
      throw new Error('RabbitMQ not connected');
    }

    try {
      // Create a queue for this subscriber
      const queue = await this.channel.assertQueue('', { exclusive: true });

      // Bind queue to exchange with pattern
      await this.channel.bindQueue(
        queue.queue,
        config.RABBITMQ_EXCHANGE,
        pattern
      );

      // Consume messages
      await this.channel.consume(queue.queue, async (msg) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            await handler(content);
            this.channel.ack(msg);
          } catch (error) {
            logger.error('Error processing message:', error);
            this.channel.nack(msg, false, true); // Requeue
          }
        }
      });

      logger.info(`Subscribed to pattern: ${pattern}`);
    } catch (error) {
      logger.error(`Failed to subscribe to ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * Publish an event
   */
  async publish(routingKey, message) {
    if (!this.isConnected || !this.channel) {
      logger.warn('RabbitMQ not connected, cannot publish event');
      return false;
    }

    try {
      const messageBuffer = Buffer.from(JSON.stringify(message));

      this.channel.publish(
        config.RABBITMQ_EXCHANGE,
        routingKey,
        messageBuffer,
        { persistent: true }
      );

      return true;
    } catch (error) {
      logger.error('Error publishing event:', error);
      return false;
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
      this.isConnected = false;
      logger.info('Disconnected from RabbitMQ');
    } catch (error) {
      logger.error('Error closing RabbitMQ connection:', error);
      throw error;
    }
  }

  /**
   * Check if connected
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Export singleton instance
module.exports = new EventBus();
