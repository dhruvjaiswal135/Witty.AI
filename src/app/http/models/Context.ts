import mongoose, { Document } from 'mongoose';
import ContextSchema from '../../../database/migration/context.schema';

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

export default mongoose.model<IContext>('Context', ContextSchema); 