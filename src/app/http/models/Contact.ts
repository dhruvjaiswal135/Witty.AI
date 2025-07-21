import mongoose, { Document } from 'mongoose';
import ContactSchema from '../../../database/migration/contact.schema';

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

export default mongoose.model<IContact>('Contact', ContactSchema); 