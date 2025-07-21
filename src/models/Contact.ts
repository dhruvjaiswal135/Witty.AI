import mongoose, { Document, Schema } from 'mongoose';

export interface IContact extends Document {
  whatsappNumber: string;
  name: string;
  relationship: 'girlfriend' | 'family' | 'friend' | 'colleague' | 'client' | 'potential_customer' | 'other';
  relationshipType: string;
  contextId: string;
  isActive: boolean;
  priority: 'high' | 'medium' | 'low';
  notes?: string;
  lastInteraction?: Date;
  messageCount: number;
  geminiChatId?: string;
  customContext?: {
    personality?: string;
    communicationStyle?: string;
    topics?: string[];
    avoidTopics?: string[];
    responseTone?: string;
    specialInstructions?: string;
  };
  metadata?: {
    firstMessageDate?: Date;
    lastMessageDate?: Date;
    totalMessagesSent?: number;
    totalMessagesReceived?: number;
    averageResponseTime?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>({
  whatsappNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  relationship: {
    type: String,
    required: true,
    enum: ['girlfriend', 'family', 'friend', 'colleague', 'client', 'potential_customer', 'other'],
    default: 'other'
  },
  relationshipType: {
    type: String,
    required: true,
    trim: true
  },
  contextId: {
    type: String,
    required: true,
    default: 'default'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  notes: {
    type: String,
    trim: true
  },
  lastInteraction: {
    type: Date
  },
  messageCount: {
    type: Number,
    default: 0
  },
  geminiChatId: {
    type: String,
    trim: true
  },
  customContext: {
    personality: String,
    communicationStyle: String,
    topics: [String],
    avoidTopics: [String],
    responseTone: String,
    specialInstructions: String
  },
  metadata: {
    firstMessageDate: Date,
    lastMessageDate: Date,
    totalMessagesSent: {
      type: Number,
      default: 0
    },
    totalMessagesReceived: {
      type: Number,
      default: 0
    },
    averageResponseTime: Number
  }
}, {
  timestamps: true,
  collection: 'contacts'
});

// Indexes for better query performance
ContactSchema.index({ relationship: 1 });
ContactSchema.index({ contextId: 1 });
ContactSchema.index({ isActive: 1 });
ContactSchema.index({ priority: 1 });
ContactSchema.index({ lastInteraction: -1 });

// Virtual for normalized phone number (without @c.us)
ContactSchema.virtual('normalizedNumber').get(function() {
  return this.whatsappNumber.replace('@c.us', '');
});

// Pre-save middleware to normalize phone number
ContactSchema.pre('save', function(next) {
  if (this.isModified('whatsappNumber')) {
    // Remove @c.us suffix if present
    this.whatsappNumber = this.whatsappNumber.replace('@c.us', '');
  }
  next();
});

export default mongoose.model<IContact>('Contact', ContactSchema); 