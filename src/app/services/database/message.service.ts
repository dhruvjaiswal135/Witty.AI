import Message, { IMessage } from '../../../models/Message';
import Contact from '../../../models/Contact';

interface MessageCreateData {
  whatsappNumber: string;
  messageId: string;
  direction: IMessage['direction'];
  messageType: IMessage['messageType'];
  content: string;
  mediaUrl?: string;
  timestamp?: Date;
  processedByAI?: boolean;
  aiResponse?: string;
  aiProcessingTime?: number;
  aiConfidence?: number;
  contextUsed?: string;
  threadId?: string;
  geminiChatId?: string;
  metadata?: IMessage['metadata'];
}

interface MessageUpdateData {
  processedByAI?: boolean;
  aiResponse?: string;
  aiProcessingTime?: number;
  aiConfidence?: number;
  contextUsed?: string;
  threadId?: string;
  geminiChatId?: string;
  metadata?: Partial<IMessage['metadata']>;
}

class DatabaseMessageService {
  /**
   * Normalize phone number (remove @c.us suffix)
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    return phoneNumber.replace('@c.us', '');
  }

  /**
   * Add a new message
   */
  async addMessage(data: MessageCreateData): Promise<IMessage> {
    const normalizedNumber = this.normalizePhoneNumber(data.whatsappNumber);
    
    // Check if message already exists
    const existingMessage = await Message.findOne({ messageId: data.messageId });
    if (existingMessage) {
      throw new Error(`Message with ID ${data.messageId} already exists`);
    }

    // Find contact for this number
    const contact = await Contact.findOne({ whatsappNumber: normalizedNumber });
    const contactId = contact?._id;

    const message = new Message({
      whatsappNumber: normalizedNumber,
      contactId,
      messageId: data.messageId,
      direction: data.direction,
      messageType: data.messageType,
      content: data.content,
      mediaUrl: data.mediaUrl,
      timestamp: data.timestamp || new Date(),
      processedByAI: data.processedByAI || false,
      aiResponse: data.aiResponse,
      aiProcessingTime: data.aiProcessingTime,
      aiConfidence: data.aiConfidence,
      contextUsed: data.contextUsed,
      threadId: data.threadId,
      geminiChatId: data.geminiChatId,
      metadata: data.metadata
    });

    await message.save();

    // Update contact interaction if this is an inbound message
    if (data.direction === 'inbound' && contact) {
      await Contact.updateOne(
        { _id: contactId },
        {
          $inc: { 'metadata.totalMessagesReceived': 1 },
          $set: { lastInteraction: new Date() }
        }
      );
    }

    console.log(`Message saved: ${data.direction} from ${normalizedNumber}`);
    return message;
  }

  /**
   * Get message by ID
   */
  async getMessageById(messageId: string): Promise<IMessage | null> {
    return await Message.findOne({ messageId }).populate('contactId');
  }

  /**
   * Update message
   */
  async updateMessage(messageId: string, data: MessageUpdateData): Promise<IMessage | null> {
    const message = await Message.findOneAndUpdate(
      { messageId },
      { $set: data },
      { new: true }
    ).populate('contactId');

    if (message) {
      console.log(`Message updated: ${messageId}`);
    }

    return message;
  }

  /**
   * Get conversation history for a WhatsApp number
   */
  async getConversationHistory(
    whatsappNumber: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<IMessage[]> {
    const normalizedNumber = this.normalizePhoneNumber(whatsappNumber);
    
    return await Message.find({ whatsappNumber: normalizedNumber })
      .populate('contactId')
      .sort({ timestamp: -1 })
      .skip(offset)
      .limit(limit);
  }

  /**
   * Get messages by thread ID
   */
  async getMessagesByThread(threadId: string, limit: number = 50): Promise<IMessage[]> {
    return await Message.find({ threadId })
      .populate('contactId')
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  /**
   * Get messages by Gemini chat ID
   */
  async getMessagesByGeminiChat(geminiChatId: string, limit: number = 50): Promise<IMessage[]> {
    return await Message.find({ geminiChatId })
      .populate('contactId')
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  /**
   * Get recent messages across all conversations
   */
  async getRecentMessages(limit: number = 20): Promise<IMessage[]> {
    return await Message.find()
      .populate('contactId')
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  /**
   * Get messages by direction (inbound/outbound)
   */
  async getMessagesByDirection(
    direction: IMessage['direction'],
    limit: number = 50
  ): Promise<IMessage[]> {
    return await Message.find({ direction })
      .populate('contactId')
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  /**
   * Get messages processed by AI
   */
  async getAIMessages(limit: number = 50): Promise<IMessage[]> {
    return await Message.find({ processedByAI: true })
      .populate('contactId')
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  /**
   * Search messages by content
   */
  async searchMessages(searchTerm: string, limit: number = 50): Promise<IMessage[]> {
    const regex = new RegExp(searchTerm, 'i');
    return await Message.find({
      $or: [
        { content: regex },
        { aiResponse: regex }
      ]
    })
      .populate('contactId')
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  /**
   * Get message statistics
   */
  async getMessageStats(): Promise<{
    total: number;
    inbound: number;
    outbound: number;
    aiProcessed: number;
    byType: Record<string, number>;
    byDirection: Record<string, number>;
  }> {
    const stats = await Message.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          inbound: { $sum: { $cond: [{ $eq: ['$direction', 'inbound'] }, 1, 0] } },
          outbound: { $sum: { $cond: [{ $eq: ['$direction', 'outbound'] }, 1, 0] } },
          aiProcessed: { $sum: { $cond: ['$processedByAI', 1, 0] } },
          byType: {
            $push: {
              type: '$messageType',
              count: 1
            }
          },
          byDirection: {
            $push: {
              direction: '$direction',
              count: 1
            }
          }
        }
      }
    ]);

    if (stats.length === 0) {
      return {
        total: 0,
        inbound: 0,
        outbound: 0,
        aiProcessed: 0,
        byType: {},
        byDirection: {}
      };
    }

    const stat = stats[0];
    const byType: Record<string, number> = {};
    const byDirection: Record<string, number> = {};

    stat.byType.forEach((item: any) => {
      byType[item.type] = (byType[item.type] || 0) + item.count;
    });

    stat.byDirection.forEach((item: any) => {
      byDirection[item.direction] = (byDirection[item.direction] || 0) + item.count;
    });

    return {
      total: stat.total,
      inbound: stat.inbound,
      outbound: stat.outbound,
      aiProcessed: stat.aiProcessed,
      byType,
      byDirection
    };
  }

  /**
   * Get conversation statistics for a specific number
   */
  async getConversationStats(whatsappNumber: string): Promise<{
    total: number;
    inbound: number;
    outbound: number;
    aiProcessed: number;
    firstMessage: Date | null;
    lastMessage: Date | null;
    averageResponseTime?: number;
  }> {
    const normalizedNumber = this.normalizePhoneNumber(whatsappNumber);
    
    const messages = await Message.find({ whatsappNumber: normalizedNumber })
      .sort({ timestamp: 1 });

    if (messages.length === 0) {
      return {
        total: 0,
        inbound: 0,
        outbound: 0,
        aiProcessed: 0,
        firstMessage: null,
        lastMessage: null
      };
    }

    const inbound = messages.filter(m => m.direction === 'inbound').length;
    const outbound = messages.filter(m => m.direction === 'outbound').length;
    const aiProcessed = messages.filter(m => m.processedByAI).length;
    const firstMessage = messages[0].timestamp;
    const lastMessage = messages[messages.length - 1].timestamp;

    // Calculate average response time
    let totalResponseTime = 0;
    let responseCount = 0;

    for (let i = 0; i < messages.length - 1; i++) {
      const current = messages[i];
      const next = messages[i + 1];
      
      if (current.direction === 'inbound' && next.direction === 'outbound') {
        const responseTime = next.timestamp.getTime() - current.timestamp.getTime();
        totalResponseTime += responseTime;
        responseCount++;
      }
    }

    const averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : undefined;

    return {
      total: messages.length,
      inbound,
      outbound,
      aiProcessed,
      firstMessage,
      lastMessage,
      averageResponseTime
    };
  }

  /**
   * Delete old messages (cleanup)
   */
  async deleteOldMessages(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await Message.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    console.log(`Deleted ${result.deletedCount} old messages`);
    return result.deletedCount || 0;
  }
}

export default new DatabaseMessageService(); 