const amqp = require("amqplib");
const logger = require("./logger");

class EventBus {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.exchangeName = "hometrip";
    this.exchangeType = "topic";
    this.connected = false;
  }

  /**
   * Connect to RabbitMQ
   */
  async connect() {
    try {
      const url = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";

      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();

      // Declare exchange
      await this.channel.assertExchange(this.exchangeName, this.exchangeType, {
        durable: true
      });

      this.connected = true;
      logger.info("Connected to RabbitMQ");

      // Handle connection close
      this.connection.on("close", () => {
        logger.warn("RabbitMQ connection closed");
        this.connected = false;
      });

      // Attempt reconnection on error
      this.connection.on("error", (err) => {
        logger.error("RabbitMQ connection error:", err);
        this.connected = false;
        setTimeout(() => this.connect(), 5000);
      });

      return true;
    } catch (error) {
      logger.error("Failed to connect to RabbitMQ:", error.message);
      // Retry connection
      setTimeout(() => this.connect(), 5000);
      return false;
    }
  }

  /**
   * Publish an event to the message queue
   */
  async publish(eventType, data) {
    try {
      if (!this.connected || !this.channel) {
        logger.warn(`Event bus not connected. Queueing event: ${eventType}`);
        return false;
      }

      const message = {
        eventType,
        data,
        timestamp: new Date().toISOString(),
        source: "booking-service"
      };

      await this.channel.publish(
        this.exchangeName,
        eventType,
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );

      logger.info(`Event published: ${eventType}`, { data });
      return true;
    } catch (error) {
      logger.error(`Failed to publish event ${eventType}:`, error.message);
      return false;
    }
  }

  /**
   * Subscribe to events
   */
  async subscribe(eventType, handler) {
    try {
      if (!this.connected || !this.channel) {
        logger.warn(`Event bus not connected. Retrying subscription: ${eventType}`);
        setTimeout(() => this.subscribe(eventType, handler), 5000);
        return;
      }

      // Create queue
      const queue = await this.channel.assertQueue(
        `booking-service-${eventType}`,
        { durable: true }
      );

      // Bind queue to exchange
      await this.channel.bindQueue(queue.queue, this.exchangeName, eventType);

      // Consume messages
      await this.channel.consume(queue.queue, async (msg) => {
        if (msg) {
          try {
            const event = JSON.parse(msg.content.toString());
            logger.info(`Event received: ${eventType}`, { data: event.data });

            // Call handler
            await handler(event.data);

            // Acknowledge message
            this.channel.ack(msg);
          } catch (error) {
            logger.error(`Error processing event ${eventType}:`, error.message);
            // Nack message and requeue
            this.channel.nack(msg, false, true);
          }
        }
      });

      logger.info(`Subscribed to event: ${eventType}`);
    } catch (error) {
      logger.error(`Failed to subscribe to ${eventType}:`, error.message);
      // Retry subscription
      setTimeout(() => this.subscribe(eventType, handler), 5000);
    }
  }

  /**
   * Close connection
   */
  async disconnect() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.connected = false;
      logger.info("Disconnected from RabbitMQ");
    } catch (error) {
      logger.error("Error closing RabbitMQ connection:", error.message);
    }
  }
}

// Create singleton instance
const eventBus = new EventBus();

module.exports = eventBus;
