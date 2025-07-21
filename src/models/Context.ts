import mongoose, { Document, Schema } from 'mongoose';

export interface IContext extends Document {
  contextId: string;
  name: string;
  description?: string;
  personalInfo: {
    name: string;
    role: string;
    expertise: string[];
    personality: string;
    communicationStyle: string;
    availability: string;
  };
  organizationInfo?: {
    name: string;
    industry: string;
    services: string[];
    values: string[];
    contactInfo: {
      email: string;
      phone: string;
      website: string;
    };
  };
  aiInstructions: {
    responseStyle: string;
    topicsToAvoid: string[];
    preferredLanguage: string;
    tone: 'professional' | 'casual' | 'friendly' | 'formal' | 'romantic' | 'caring';
  };
  isDefault: boolean;
  isActive: boolean;
  usageCount: number;
  lastUsed?: Date;
  metadata?: {
    createdBy?: string;
    version?: string;
    tags?: string[];
    rating?: number;
    feedback?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const ContextSchema = new Schema<IContext>({
  contextId: {
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
  description: {
    type: String,
    trim: true
  },
  personalInfo: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    role: {
      type: String,
      required: true,
      trim: true
    },
    expertise: {
      type: [String],
      default: []
    },
    personality: {
      type: String,
      required: true,
      trim: true
    },
    communicationStyle: {
      type: String,
      required: true,
      trim: true
    },
    availability: {
      type: String,
      required: true,
      trim: true
    }
  },
  organizationInfo: {
    name: String,
    industry: String,
    services: [String],
    values: [String],
    contactInfo: {
      email: String,
      phone: String,
      website: String
    }
  },
  aiInstructions: {
    responseStyle: {
      type: String,
      required: true,
      trim: true
    },
    topicsToAvoid: {
      type: [String],
      default: []
    },
    preferredLanguage: {
      type: String,
      required: true,
      default: 'English'
    },
    tone: {
      type: String,
      required: true,
      enum: ['professional', 'casual', 'friendly', 'formal', 'romantic', 'caring'],
      default: 'professional'
    }
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsed: {
    type: Date
  },
  metadata: {
    createdBy: String,
    version: {
      type: String,
      default: '1.0.0'
    },
    tags: [String],
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: [String]
  }
}, {
  timestamps: true,
  collection: 'contexts'
});

// Indexes for better query performance
ContextSchema.index({ isDefault: 1 });
ContextSchema.index({ isActive: 1 });
ContextSchema.index({ usageCount: -1 });
ContextSchema.index({ lastUsed: -1 });

// Ensure only one default context exists
ContextSchema.pre('save', async function(next) {
  if (this.isDefault) {
    // Remove default flag from other contexts
    await (this.constructor as any).updateMany(
      { _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

export default mongoose.model<IContext>('Context', ContextSchema); 