const express = require("express");
const router = express.Router();
const MessageController = require("../controllers/messageController");
const auth = require("../middleware/auth");

router.post("/:conversationId/send", auth, MessageController.sendMessage);

router.get("/:conversationId", auth, MessageController.getMessages);

router.post("/:messageId/read", auth, MessageController.markAsRead);

router.post("/:conversationId/mark-read", auth, MessageController.markConversationAsRead);

router.delete("/:messageId", auth, MessageController.deleteMessage);

router.get("/stats/unread", auth, MessageController.getUnreadCount);

router.post("/:messageId/translate", auth, MessageController.addTranslation);

router.get("/:conversationId/search", auth, MessageController.searchMessages);

module.exports = router;
