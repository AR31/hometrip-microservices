const express = require("express");
const cors = require("cors");
const connectDB = require("./config/database");
const config = require("./config");
const logger = require("./utils/logger");
const { eventBus } = require("./utils/eventBus");

const messageRoutes = require("./routes/messages");
const conversationRoutes = require("./routes/conversations");
const notificationRoutes = require("./modules/notifications/notifications");


// Swagger Documentation
const { swaggerSpec, swaggerUi, swaggerUiOptions } = require('./config/swagger');
const app = express();

app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    service: "message-service",
    status: "healthy",
    timestamp: new Date()
  });
});

app.use("/api/messages", messageRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/notifications", notificationRoutes);

app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  res.status(err.status || 500).json({
    success: false,
    error: err.message
  });
});

const start = async () => {
  try {
    await connectDB();
    await eventBus.connect();

    eventBus.subscribe("user.deleted", async (data) => {
      try {
        const Message = require("./models/Message");
        const Conversation = require("./models/Conversation");

        logger.info(`Handling user.deleted event for user: ${data.userId}`);

        await Conversation.deleteMany({
          participants: data.userId
        });

        await Message.deleteMany({
          sender: data.userId
        });

        logger.info(`Cleaned up data for deleted user: ${data.userId}`);
      } catch (error) {
        logger.error(`Error handling user.deleted event: ${error.message}`);
      }
    });

    const server = app.listen(config.port, () => {
      logger.info(`Message Service running on port ${config.port}`);
    });

    process.on("SIGTERM", async () => {
      logger.info("SIGTERM received, shutting down gracefully...");
      server.close(async () => {
        await eventBus.disconnect();
        process.exit(0);
      });
    });

    process.on("SIGINT", async () => {
      logger.info("SIGINT received, shutting down gracefully...");
      server.close(async () => {
        await eventBus.disconnect();
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error(`Failed to start service: ${error.message}`);
    process.exit(1);
  }
};

start();

module.exports = app;
