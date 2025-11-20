const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const logger = require("../utils/logger");
const { eventBus } = require("../utils/eventBus");

class ConversationController {
  /**
   * Get all conversations for user
   */
  static async listConversations(req, res) {
    try {
      const userId = req.user.id;
      const { status, archived, labels, page = 1, limit = 20 } = req.query;

      const filter = { participants: userId };

      if (status) {
        filter.status = status;
      }

      if (labels) {
        filter.labels = { $in: labels.split(",") };
      }

      const skip = (page - 1) * limit;

      const conversations = await Conversation.find(filter)
        .populate("participants", "fullName email avatar")
        .populate("guest", "fullName email avatar")
        .populate("host", "fullName email avatar")
        .populate("listing", "title images price")
        .populate("reservation", "checkIn checkOut status totalPrice")
        .populate("lastMessage.sender", "fullName avatar")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      let filteredConversations = conversations;
      if (archived === "true") {
        filteredConversations = conversations.filter(
          c => c.archived?.get(userId) === true
        );
      } else if (archived === "false") {
        filteredConversations = conversations.filter(
          c => c.archived?.get(userId) !== true
        );
      }

      const total = await Conversation.countDocuments(filter);

      res.json({
        success: true,
        conversations: filteredConversations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error(`Error listing conversations: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get conversation details
   */
  static async getConversation(req, res) {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;

      const conversation = await Conversation.findById(conversationId)
        .populate("participants", "fullName email avatar")
        .populate("guest", "fullName email avatar")
        .populate("host", "fullName email avatar")
        .populate("listing", "title images price address")
        .populate("reservation");

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: "Conversation not found"
        });
      }

      if (!conversation.participants.some(p => p._id.toString() === userId)) {
        return res.status(403).json({
          success: false,
          error: "Unauthorized"
        });
      }

      res.json({
        success: true,
        conversation
      });
    } catch (error) {
      logger.error(`Error getting conversation: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Create a new conversation
   */
  static async createConversation(req, res) {
    try {
      const userId = req.user.id;
      const { participantId, listingId, reservationId } = req.body;

      if (!participantId || !listingId) {
        return res.status(400).json({
          success: false,
          error: "participantId and listingId are required"
        });
      }

      let conversation = await Conversation.findOne({
        participants: { $all: [userId, participantId] },
        listing: listingId
      });

      if (!conversation) {
        conversation = new Conversation({
          participants: [userId, participantId],
          listing: listingId,
          reservation: reservationId || null,
          unreadCount: new Map(),
          archived: new Map()
        });

        await conversation.save();
        await conversation.populate("participants", "fullName email avatar");
        await conversation.populate("listing", "title images price");

        logger.info(
          `Conversation created: ${conversation._id} between users ${userId} and ${participantId}`
        );

        eventBus.emit("conversation.created", {
          conversationId: conversation._id,
          participants: [userId, participantId],
          listingId: listingId,
          timestamp: conversation.createdAt
        });
      }

      res.status(201).json({
        success: true,
        conversation
      });
    } catch (error) {
      logger.error(`Error creating conversation: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Archive/Unarchive conversation
   */
  static async archiveConversation(req, res) {
    try {
      const { conversationId } = req.params;
      const { archive = true } = req.body;
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

      conversation.archived.set(userId, archive);
      await conversation.save();

      logger.info(
        `Conversation ${conversationId} ${archive ? "archived" : "unarchived"} by user ${userId}`
      );

      res.json({
        success: true,
        message: archive ? "Conversation archived" : "Conversation unarchived",
        archived: archive
      });
    } catch (error) {
      logger.error(`Error archiving conversation: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Mark conversation as read
   */
  static async markAsRead(req, res) {
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

      conversation.unreadCount.set(userId, 0);
      await conversation.save();

      await Message.updateMany(
        {
          conversation: conversationId,
          sender: { $ne: userId },
          isRead: false,
          deleted: false
        },
        {
          $set: { isRead: true, readAt: new Date() }
        }
      );

      logger.info(`Conversation ${conversationId} marked as read by user ${userId}`);

      res.json({
        success: true,
        message: "Conversation marked as read"
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
   * Add label to conversation
   */
  static async addLabel(req, res) {
    try {
      const { conversationId } = req.params;
      const { label, action = "add" } = req.body;
      const userId = req.user.id;

      if (!label) {
        return res.status(400).json({
          success: false,
          error: "Label is required"
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

      if (action === "add") {
        if (!conversation.labels) conversation.labels = [];
        if (!conversation.labels.includes(label)) {
          conversation.labels.push(label);
        }
      } else if (action === "remove") {
        conversation.labels = conversation.labels?.filter(l => l !== label) || [];
      }

      await conversation.save();

      logger.info(
        `Label ${label} ${action === "add" ? "added to" : "removed from"} conversation ${conversationId}`
      );

      res.json({
        success: true,
        message: `Label ${label} ${action === "add" ? "added" : "removed"}`,
        labels: conversation.labels
      });
    } catch (error) {
      logger.error(`Error managing labels: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete conversation
   */
  static async deleteConversation(req, res) {
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

      await Message.deleteMany({ conversation: conversationId });
      await Conversation.findByIdAndDelete(conversationId);

      logger.info(`Conversation ${conversationId} deleted by user ${userId}`);

      res.json({
        success: true,
        message: "Conversation and messages deleted"
      });
    } catch (error) {
      logger.error(`Error deleting conversation: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Set typing indicator
   */
  static async setTyping(req, res) {
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

      conversation.typingUsers = (conversation.typingUsers || []).filter(
        t => t.user.toString() !== userId
      );

      conversation.typingUsers.push({
        user: userId,
        startedAt: new Date()
      });

      await conversation.save();

      setTimeout(async () => {
        const conv = await Conversation.findById(conversationId);
        if (conv) {
          conv.typingUsers = (conv.typingUsers || []).filter(
            t => t.user.toString() !== userId
          );
          await conv.save();
        }
      }, 5000);

      res.json({
        success: true,
        message: "Typing indicator set"
      });
    } catch (error) {
      logger.error(`Error setting typing indicator: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get unread count
   */
  static async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;

      const conversations = await Conversation.find({
        participants: userId
      });

      let totalUnread = 0;
      conversations.forEach(conv => {
        totalUnread += conv.getUnreadCount(userId);
      });

      res.json({
        success: true,
        totalUnread,
        conversationsWithUnread: conversations
          .filter(c => c.getUnreadCount(userId) > 0)
          .length
      });
    } catch (error) {
      logger.error(`Error getting unread count: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = ConversationController;
