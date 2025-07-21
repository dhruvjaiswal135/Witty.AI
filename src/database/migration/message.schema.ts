import { Schema } from 'mongoose';
// Note: The schema is used by the model for typing, no need to import IMessage here.

const MessageSchema = new Schema({
  whatsappNumber: {
    type: String,
    required: true,
    trim: true
  },
  contactId: {
    type: Schema.Types.ObjectId,
    ref: 'Contact'
  },
  messageId: {
    type: String,
    required: true,
    unique: true
  },
  direction: {
    type: String,
    required: true,
    enum: ['inbound', 'outbound']
  },
  messageType: {
    type: String,
    required: true,
    enum: ['text', 'media', 'document', 'audio', 'video', 'location', 'contact'],
    default: 'text'
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  mediaUrl: {
    type: String,
    trim: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  processedByAI: {
    type: Boolean,
    default: false
  },
  aiResponse: {
    type: String,
    trim: true
  },
  aiProcessingTime: {
    type: Number
  },
  aiConfidence: {
    type: Number,
    min: 0,
    max: 1
  },
  contextUsed: {
    type: String,
    trim: true
  },
  threadId: {
    type: String,
    trim: true
  },
  geminiChatId: {
    type: String,
    trim: true
  },
  metadata: {
    originalMessageId: String,
    replyToMessageId: String,
    isForwarded: {
      type: Boolean,
      default: false
    },
    isReply: {
      type: Boolean,
      default: false
    },
    language: String,
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral']
    },
    keywords: [String],
    processingErrors: [String]
  }
}, {
  timestamps: true,
  collection: 'messages'
});

MessageSchema.index({ whatsappNumber: 1, timestamp: -1 });
MessageSchema.index({ contactId: 1, timestamp: -1 });
MessageSchema.index({ direction: 1 });
MessageSchema.index({ messageType: 1 });
MessageSchema.index({ processedByAI: 1 });
MessageSchema.index({ threadId: 1 });
MessageSchema.index({ geminiChatId: 1 });

MessageSchema.index({ whatsappNumber: 1, direction: 1, timestamp: -1 });
MessageSchema.index({ contactId: 1, direction: 1, timestamp: -1 });

MessageSchema.virtual('conversationThread').get(function(this: any) {
  return `${this.whatsappNumber}_${this.threadId || 'default'}`;
});

MessageSchema.pre('save', function(this: any, next) {
  if (this.isModified('whatsappNumber')) {
    this.whatsappNumber = this.whatsappNumber.replace('@c.us', '');
  }
  next();
});

export default MessageSchema; 