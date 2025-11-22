const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const logger = require("../utils/logger");
const { eventBus } = require("../utils/eventBus");

class MessageController {
  /**
   * Send a new message
   */
  static async sendMessage(req, res) {
    try {
      const { conversationId } = req.params;
      const { text, attachments = [], type = "user" } = req.body;
      const userId = req.user.id;

      if (!text || !text.trim()) {
        return res.status(400).json({
          success: false,
          error: "Message text is required"
        });
      }

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: "Conversation not found"
        });
      }

      if (!conversation.participants.some(p => p.toString() === userId)) {
        return res.status(403).json({
          success: false,
          error: "Unauthorized"
        });
      }

      const message = new Message({
        conversation: conversationId,
        sender: userId,
        text: text.trim(),
        type,
        attachments: attachments || [],
        metadata: {
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      await message.save();
      await message.populate("sender", "fullName email avatar");

      conversation.lastMessage = {
        text: message.text,
        sender: message.sender._id,
        createdAt: message.createdAt
      };

      const otherParticipant = conversation.participants.find(
        p => p.toString() !== userId
      );

      if (otherParticipant) {
        await conversation.incrementUnreadCount(otherParticipant);
      }

      await conversation.save();

      logger.info(`Message sent in conversation ${conversationId} by user ${userId}`);

      eventBus.emit("message.sent", {
        messageId: message._id,
        conversationId: conversationId,
        senderId: userId,
        text: message.text,
        timestamp: message.createdAt
      });

      res.status(201).json({
        success: true,
        message
      });
    } catch (error) {
      logger.error(`Error sending message: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get conversation messages with pagination
   */
  static async getMessages(req, res) {
    try {
      const { conversationId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const userId = req.user.id;

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: "Conversation not found"
        });
      }

      if (!conversation.participants.some(p => p.toString() === userId)) {
        return res.status(403).json({
          success: false,
          error: "Unauthorized"
        });
      }

      const skip = (page - 1) * limit;
      const messages = await Message.find({
        conversation: conversationId,
        deleted: false
      })
        .populate("sender", "fullName email avatar")
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Message.countDocuments({
        conversation: conversationId,
        deleted: false
      });

      res.json({
        success: true,
        messages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error(`Error fetching messages: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Mark message as read
   */
  static async markAsRead(req, res) {
    try {
      const { messageId } = req.params;
      const userId = req.user.id;

      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(404).json({
          success: false,
          error: "Message not found"
        });
      }

      const conversation = await Conversation.findById(message.conversation);
      if (!conversation.participants.some(p => p.toString() === userId)) {
        return res.status(403).json({
          success: false,
          error: "Unauthorized"
        });
      }

      message.isRead = true;
      message.readAt = new Date();
      await message.save();

      logger.info(`Message ${messageId} marked as read by user ${userId}`);

      eventBus.emit("message.read", {
        messageId: message._id,
        conversationId: message.conversation,
        readBy: userId,
        readAt: message.readAt
      });

      res.json({
        success: true,
        message
      });
    } catch (error) {
      logger.error(`Error marking message as read: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Mark all unread messages in conversation as read
   */
  static async markConversationAsRead(req, res) {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: "Conversation not found"
        });
      }

      if (!conversation.participants.some(p => p.toString() === userId)) {
        return res.status(403).json({
          success: false,
          error: "Unauthorized"
        });
      }

      const result = await Message.updateMany(
        {
          conversation: conversationId,
          sender: { $ne: userId },
          isRead: false,
          deleted: false
        },
        {
          $set: {
            isRead: true,
            readAt: new Date()
          }
        }
      );

      await conversation.resetUnreadCount(userId);

      logger.info(
        `${result.modifiedCount} messages marked as read in conversation ${conversationId}`
      );

      eventBus.emit("conversation.read", {
        conversationId: conversationId,
        readBy: userId
      });

      res.json({
        success: true,
        messagesMarked: result.modifiedCount
      });
    } catch (error) {
      logger.error(`Error marking conversation as read: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete message (soft delete)
   */
  static async deleteMessage(req, res) {
    try {
      const { messageId } = req.params;
      const userId = req.user.id;

      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(404).json({
          success: false,
          error: "Message not found"
        });
      }

      if (message.sender.toString() !== userId) {
        return res.status(403).json({
          success: false,
          error: "Unauthorized"
        });
      }

      await message.softDelete();

      logger.info(`Message ${messageId} soft deleted by user ${userId}`);

      res.json({
        success: true,
        message: "Message deleted"
      });
    } catch (error) {
      logger.error(`Error deleting message: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get unread message count
   */
  static async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;

      const conversations = await Conversation.find({
        participants: userId
      });

      let totalUnread = 0;
      conversations.forEach(conv => {
        const count = conv.getUnreadCount(userId);
        totalUnread += count;
      });

      res.json({
        success: true,
        totalUnread,
        conversationsWithUnread: conversations
          .filter(c => c.getUnreadCount(userId) > 0)
          .map(c => ({
            conversationId: c._id,
            unreadCount: c.getUnreadCount(userId)
          }))
      });
    } catch (error) {
      logger.error(`Error getting unread count: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Add translation to message
   */
  static async addTranslation(req, res) {
    try {
      const { messageId } = req.params;
      const { language, translatedText } = req.body;

      if (!language || !translatedText) {
        return res.status(400).json({
          success: false,
          error: "Language and translatedText are required"
        });
      }

      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(404).json({
          success: false,
          error: "Message not found"
        });
      }

      await message.addTranslation(language, translatedText);

      logger.info(`Translation added to message ${messageId} in language ${language}`);

      res.json({
        success: true,
        message
      });
    } catch (error) {
      logger.error(`Error adding translation: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Search messages in a conversation
   */
  static async searchMessages(req, res) {
    try {
      const { conversationId } = req.params;
      const { query, type } = req.query;
      const userId = req.user.id;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: "Search query is required"
        });
      }

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: "Conversation not found"
        });
      }

      if (!conversation.participants.some(p => p.toString() === userId)) {
        return res.status(403).json({
          success: false,
          error: "Unauthorized"
        });
      }

      const searchFilter = {
        conversation: conversationId,
        deleted: false,
        text: { $regex: query, $options: "i" }
      };

      if (type) {
        searchFilter.type = type;
      }

      const messages = await Message.find(searchFilter)
        .populate("sender", "fullName email avatar")
        .sort({ createdAt: -1 })
        .limit(100);

      res.json({
        success: true,
        messages,
        count: messages.length
      });
    } catch (error) {
      logger.error(`Error searching messages: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = MessageController;
