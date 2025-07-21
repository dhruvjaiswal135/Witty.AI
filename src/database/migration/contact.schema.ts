import { Schema } from 'mongoose';
// Note: The schema is used by the model for typing, no need to import IContact here.

const ContactSchema = new Schema({
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

ContactSchema.index({ relationship: 1 });
ContactSchema.index({ contextId: 1 });
ContactSchema.index({ isActive: 1 });
ContactSchema.index({ priority: 1 });
ContactSchema.index({ lastInteraction: -1 });

ContactSchema.virtual('normalizedNumber').get(function(this: any) {
  return this.whatsappNumber.replace('@c.us', '');
});

ContactSchema.pre('save', function(this: any, next) {
  if (this.isModified('whatsappNumber')) {
    this.whatsappNumber = this.whatsappNumber.replace('@c.us', '');
  }
  next();
});

export default ContactSchema; 