import mongoose, { Document } from 'mongoose';
import MessageSchema from '../../../database/migration/message.schema';

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

export default mongoose.model<IMessage>('Message', MessageSchema); 