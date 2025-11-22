const express = require("express");
const router = express.Router();
const ConversationController = require("../controllers/conversationController");
const auth = require("../middleware/auth");

router.get("/", auth, ConversationController.listConversations);

router.post("/", auth, ConversationController.createConversation);

router.get("/:conversationId", auth, ConversationController.getConversation);

router.post("/:conversationId/archive", auth, ConversationController.archiveConversation);

router.post("/:conversationId/read", auth, ConversationController.markAsRead);

router.post("/:conversationId/labels", auth, ConversationController.addLabel);

router.delete("/:conversationId", auth, ConversationController.deleteConversation);

router.post("/:conversationId/typing", auth, ConversationController.setTyping);

router.get("/stats/unread", auth, ConversationController.getUnreadCount);

module.exports = router;
