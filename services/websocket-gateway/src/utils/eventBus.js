const amqp = require('amqplib');
const EventEmitter = require('events');
const logger = require('./logger');
const config = require('../config');

/**
 * Event Bus - Handles RabbitMQ connection and event subscription/publishing
 * Connects to RabbitMQ and manages event subscriptions for the WebSocket Gateway
 */
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 5000;
  }

  /**
   * Connect to RabbitMQ
   */
  async connect() {
    try {
      const url = `amqp://${config.rabbitmq.user}:${config.rabbitmq.password}@${config.rabbitmq.host}:${config.rabbitmq.port}/${config.rabbitmq.vhost}`;

      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();

      // Handle connection errors
      this.connection.on('error', (error) => {
        logger.error('RabbitMQ connection error', { error: error.message });
        this.isConnected = false;
        this.reconnect();
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.isConnected = false;
        this.reconnect();
      });

      // Assert exchange
      await this.channel.assertExchange(config.rabbitmq.exchange, 'topic', {
        durable: true
      });

      // Declare queues
      for (const [key, queueName] of Object.entries(config.rabbitmq.queues)) {
        await this.channel.assertQueue(queueName, { durable: true });
      }

      this.isConnected = true;
      this.reconnectAttempts = 0;

      logger.info('Connected to RabbitMQ', {
        host: config.rabbitmq.host,
        port: config.rabbitmq.port
      });

      this.emit('connected');
      return true;
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ', { error: error.message });
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
      logger.error('Max reconnection attempts reached');
      process.exit(1);
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    logger.warn(`Reconnecting to RabbitMQ in ${delay}ms`, {
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts
    });

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Subscribe to events
   */
  async subscribe(routingKey, queue, handler) {
    try {
      if (!this.isConnected) {
        throw new Error('EventBus not connected');
      }

      // Bind queue to exchange
      await this.channel.bindQueue(queue, config.rabbitmq.exchange, routingKey);

      // Setup consumer
      await this.channel.consume(queue, async (msg) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            logger.debug('Event received', {
              routingKey,
              queue,
              content
            });

            // Call handler
            await handler(content);

            // Acknowledge message
            this.channel.ack(msg);
          } catch (error) {
            logger.error('Event handler error', {
              routingKey,
              queue,
              error: error.message
            });
            // Nack message and requeue
            this.channel.nack(msg, false, true);
          }
        }
      }, { noAck: false });

      logger.info('Subscribed to event', { routingKey, queue });
    } catch (error) {
      logger.error('Failed to subscribe to event', {
        routingKey,
        queue,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Publish event
   */
  async publish(routingKey, data) {
    try {
      if (!this.isConnected) {
        throw new Error('EventBus not connected');
      }

      const message = JSON.stringify(data);
      await this.channel.publish(
        config.rabbitmq.exchange,
        routingKey,
        Buffer.from(message),
        { persistent: true }
      );

      logger.debug('Event published', {
        routingKey,
        data
      });

      return true;
    } catch (error) {
      logger.error('Failed to publish event', {
        routingKey,
        error: error.message
      });
      throw error;
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
      logger.info('Closed RabbitMQ connection');
    } catch (error) {
      logger.error('Error closing RabbitMQ connection', { error: error.message });
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      host: config.rabbitmq.host,
      port: config.rabbitmq.port
    };
  }
}

// Create singleton instance
const eventBus = new EventBus();

module.exports = eventBus;
