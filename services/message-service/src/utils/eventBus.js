const amqp = require("amqplib");
const EventEmitter = require("events");
const logger = require("./logger");

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.connection = null;
    this.channel = null;
    this.exchange = "hometrip-events";
  }

  async connect() {
    try {
      const url = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();

      await this.channel.assertExchange(this.exchange, "topic", { durable: true });

      logger.info("EventBus connected to RabbitMQ");
    } catch (error) {
      logger.error(`Failed to connect to RabbitMQ: ${error.message}`);
      setTimeout(() => this.connect(), 5000);
    }
  }

  async subscribe(pattern, callback) {
    try {
      if (!this.channel) {
        await this.connect();
      }

      const queue = await this.channel.assertQueue("", { exclusive: true });
      await this.channel.bindQueue(queue.queue, this.exchange, pattern);

      this.channel.consume(queue.queue, (msg) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            callback(content);
            this.channel.ack(msg);
          } catch (error) {
            logger.error(`Error processing message: ${error.message}`);
            this.channel.nack(msg);
          }
        }
      });

      logger.info(`Subscribed to event pattern: ${pattern}`);
    } catch (error) {
      logger.error(`Failed to subscribe to events: ${error.message}`);
    }
  }

  async publish(eventName, data) {
    try {
      if (!this.channel) {
        await this.connect();
      }

      const message = JSON.stringify({
        eventName,
        data,
        timestamp: new Date()
      });

      this.channel.publish(
        this.exchange,
        eventName,
        Buffer.from(message),
        { persistent: true }
      );

      logger.info(`Event published: ${eventName}`);
    } catch (error) {
      logger.error(`Failed to publish event: ${error.message}`);
    }
  }

  emit(eventName, data) {
    super.emit(eventName, data);
    this.publish(eventName, data);
  }

  async disconnect() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      logger.info("EventBus disconnected");
    } catch (error) {
      logger.error(`Error disconnecting EventBus: ${error.message}`);
    }
  }
}

const eventBus = new EventBus();

module.exports = { eventBus };
