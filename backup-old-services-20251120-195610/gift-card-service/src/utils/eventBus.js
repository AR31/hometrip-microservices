const amqp = require('amqplib');
const config = require('../config');
const logger = require('./logger');

class EventBus {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.exchange = 'hometrip_events';
  }

  async connect() {
    try {
      this.connection = await amqp.connect(config.rabbitmq.url);
      this.channel = await this.connection.createChannel();

      await this.channel.assertExchange(this.exchange, 'topic', { durable: true });

      logger.info('✅ Connected to RabbitMQ');

      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error:', err);
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed. Reconnecting...');
        setTimeout(() => this.connect(), 5000);
      });

    } catch (error) {
      logger.error('Failed to connect to RabbitMQ:', error);
      setTimeout(() => this.connect(), 5000);
    }
  }

  async publish(eventType, data) {
    try {
      if (!this.channel) {
        logger.error('RabbitMQ channel not initialized');
        return false;
      }

      const message = JSON.stringify({
        eventType,
        data,
        timestamp: new Date().toISOString(),
        service: config.serviceName,
      });

      this.channel.publish(
        this.exchange,
        eventType,
        Buffer.from(message),
        { persistent: true }
      );

      logger.debug(`📤 Event published: ${eventType}`);
      return true;
    } catch (error) {
      logger.error('Error publishing event:', error);
      return false;
    }
  }

  async subscribe(pattern, callback) {
    try {
      if (!this.channel) {
        logger.error('RabbitMQ channel not initialized');
        return;
      }

      const queue = await this.channel.assertQueue('', { exclusive: true });

      await this.channel.bindQueue(queue.queue, this.exchange, pattern);

      this.channel.consume(queue.queue, async (msg) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            logger.debug(`📥 Event received: ${content.eventType}`);
            await callback(content);
            this.channel.ack(msg);
          } catch (error) {
            logger.error('Error processing event:', error);
            this.channel.nack(msg, false, false);
          }
        }
      });

      logger.info(`✅ Subscribed to pattern: ${pattern}`);
    } catch (error) {
      logger.error('Error subscribing to events:', error);
    }
  }

  async close() {
    try {
      await this.channel?.close();
      await this.connection?.close();
      logger.info('RabbitMQ connection closed');
    } catch (error) {
      logger.error('Error closing RabbitMQ connection:', error);
    }
  }
}

module.exports = new EventBus();
