const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    text: {
      type: String,
      required: true,
      maxlength: 5000
    },

    type: {
      type: String,
      enum: ["user", "system", "automated"],
      default: "user"
    },

    attachments: [{
      url: String,
      publicId: String,
      type: {
        type: String,
        enum: ['image', 'pdf', 'document', 'video', 'other']
      },
      name: String,
      size: Number,
      mimeType: String
    }],

    translations: [{
      language: String,
      text: String,
      translatedAt: {
        type: Date,
        default: Date.now
      }
    }],

    isRead: {
      type: Boolean,
      default: false
    },
    readAt: Date,

    fromTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MessageTemplate'
    },

    metadata: {
      eventType: String,
      eventData: mongoose.Schema.Types.Mixed,
      ipAddress: String,
      userAgent: String,
      isQuickReply: Boolean,
      quickReplyCategory: String
    },

    deleted: {
      type: Boolean,
      default: false
    },
    deletedAt: Date
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ isRead: 1, conversation: 1 });
messageSchema.index({ deleted: 1 });

messageSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

messageSchema.methods.addTranslation = function(language, translatedText) {
  this.translations = this.translations.filter(t => t.language !== language);

  this.translations.push({
    language,
    text: translatedText,
    translatedAt: new Date()
  });

  return this.save();
};

messageSchema.methods.softDelete = function() {
  this.deleted = true;
  this.deletedAt = new Date();
  return this.save();
};

module.exports = mongoose.model("Message", messageSchema);
