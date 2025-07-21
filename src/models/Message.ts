import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  whatsappNumber: string;
  contactId?: string;
  messageId: string;
  direction: 'inbound' | 'outbound';
  messageType: 'text' | 'media' | 'document' | 'audio' | 'video' | 'location' | 'contact';
  content: string;
  mediaUrl?: string;
  timestamp: Date;
  processedByAI: boolean;
  aiResponse?: string;
  aiProcessingTime?: number;
  aiConfidence?: number;
  contextUsed?: string;
  threadId?: string;
  geminiChatId?: string;
  metadata?: {
    originalMessageId?: string;
    replyToMessageId?: string;
    isForwarded?: boolean;
    isReply?: boolean;
    language?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
    keywords?: string[];
    processingErrors?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
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

// Indexes for better query performance
MessageSchema.index({ whatsappNumber: 1, timestamp: -1 });
MessageSchema.index({ contactId: 1, timestamp: -1 });
MessageSchema.index({ direction: 1 });
MessageSchema.index({ messageType: 1 });
MessageSchema.index({ processedByAI: 1 });
MessageSchema.index({ threadId: 1 });
MessageSchema.index({ geminiChatId: 1 });

// Compound indexes for common queries
MessageSchema.index({ whatsappNumber: 1, direction: 1, timestamp: -1 });
MessageSchema.index({ contactId: 1, direction: 1, timestamp: -1 });

// Virtual for conversation thread
MessageSchema.virtual('conversationThread').get(function() {
  return `${this.whatsappNumber}_${this.threadId || 'default'}`;
});

// Pre-save middleware to normalize phone number
MessageSchema.pre('save', function(next) {
  if (this.isModified('whatsappNumber')) {
    // Remove @c.us suffix if present
    this.whatsappNumber = this.whatsappNumber.replace('@c.us', '');
  }
  next();
});

export default mongoose.model<IMessage>('Message', MessageSchema); 