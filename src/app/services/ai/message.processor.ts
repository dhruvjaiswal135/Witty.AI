import GeminiService from './gemini.service';
import ContextService from './context.service';
import ThreadService from './thread.service';
import ContactService from './contact.service';
import DatabaseMessageService from '../database/message.service';
import DatabaseContextService from '../database/context.service';

interface ProcessedMessage {
  originalMessage: string;
  whatsappNumber: string;
  userName?: string;
  aiResponse: string;
  confidence: number;
  processingTime: number;
  contextUsed: string;
  threadId: string;
  contactInfo?: any;
}

interface ProcessingOptions {
  contextId?: string;
  maxResponseLength?: number;
  useContactContext?: boolean;
}

class MessageProcessor {
  private isInitialized: boolean = false;
  private processingQueue: Map<string, Promise<ProcessedMessage>> = new Map();

  /**
   * Initialize the message processor
   */
  async initialize(): Promise<boolean> {
    try {
      // Initialize Gemini service
      const geminiReady = await GeminiService.initialize();
      if (!geminiReady) {
        console.error('Failed to initialize Gemini service');
        return false;
      }

      // Ensure default context exists
      await DatabaseContextService.ensureDefaultContext();

      this.isInitialized = true;
      console.log('Message processor initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize message processor:', error);
      return false;
    }
  }

  /**
   * Process incoming WhatsApp message and generate AI response
   */
  async processMessage(
    message: string,
    whatsappNumber: string,
    userName?: string,
    options: ProcessingOptions = {}
  ): Promise<ProcessedMessage> {
    if (!this.isInitialized) {
      throw new Error('Message processor not initialized');
    }

    const startTime = Date.now();
    const contextId = options.contextId || 'default';
    const useContactContext = options.useContactContext !== false; // Default to true

    // Check if already processing this number
    const processingKey = `${whatsappNumber}_${Date.now()}`;
    if (this.processingQueue.has(processingKey)) {
      throw new Error('Message already being processed');
    }

    try {
      // Store incoming message in database
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await DatabaseMessageService.addMessage({
        whatsappNumber,
        messageId,
        direction: 'inbound',
        messageType: 'text',
        content: message,
        timestamp: new Date()
      });

      // Add user message to thread
      ThreadService.addMessage(whatsappNumber, message, 'user', {
        messageType: 'text'
      });

      // Update contact interaction
      await ContactService.updateInteraction(whatsappNumber);

      // Get contact information
      const contact = await ContactService.getContactByNumber(whatsappNumber);
      let context: string;
      let contextUsed: string;

      if (contact && useContactContext) {
        // Use personalized contact context
        const personalizedContext = await ContactService.getPersonalizedContext(whatsappNumber);
        context = this.buildPersonalizedContext(personalizedContext);
        contextUsed = `contact_${contact.relationship}`;
        console.log(`Using personalized context for ${contact.name} (${contact.relationshipType})`);
      } else {
        // Use default context
        const dbContext = await DatabaseContextService.getContextById(contextId);
        if (dbContext) {
          context = this.formatContextForAI(dbContext);
          await DatabaseContextService.incrementUsage(contextId);
        } else {
          context = ContextService.getFormattedContext(contextId);
        }
        contextUsed = contextId;
      }

      // Prepare conversation context for AI
      const conversationContext = {
        userInfo: context,
        organizationInfo: context, // Using same context for both
        conversationHistory: ThreadService.getThreadHistory(whatsappNumber, 10).map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        }))
      };

      // Generate AI response
      const aiResponse = await GeminiService.generateResponse(
        message,
        conversationContext,
        options.maxResponseLength || 1000
      );

      // Store AI response in database
      const aiMessageId = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await DatabaseMessageService.addMessage({
        whatsappNumber,
        messageId: aiMessageId,
        direction: 'outbound',
        messageType: 'text',
        content: aiResponse.text,
        timestamp: new Date(),
        processedByAI: true,
        aiResponse: aiResponse.text,
        aiProcessingTime: Date.now() - startTime,
        aiConfidence: aiResponse.confidence,
        contextUsed,
        threadId: ThreadService.getOrCreateThread(whatsappNumber, userName).threadId
      });

      // Add AI response to thread
      ThreadService.addMessage(whatsappNumber, aiResponse.text, 'assistant', {
        messageType: 'text'
      });

      const processingTime = Date.now() - startTime;
      const thread = ThreadService.getOrCreateThread(whatsappNumber, userName);

      const processedMessage: ProcessedMessage = {
        originalMessage: message,
        whatsappNumber,
        userName,
        aiResponse: aiResponse.text,
        confidence: aiResponse.confidence,
        processingTime,
        contextUsed,
        threadId: thread.threadId,
        contactInfo: contact ? {
          id: contact.id,
          name: contact.name,
          relationship: contact.relationship,
          relationshipType: contact.relationshipType,
          priority: contact.priority
        } : undefined
      };

      console.log(`Processed message for ${whatsappNumber} in ${processingTime}ms`);
      return processedMessage;

    } catch (error: any) {
      console.error(`Error processing message for ${whatsappNumber}:`, error);
      throw new Error(`Failed to process message: ${error.message || 'Unknown error'}`);
    } finally {
      this.processingQueue.delete(processingKey);
    }
  }

  /**
   * Build personalized context from contact information
   */
  private buildPersonalizedContext(personalizedContext: {
    contact: any;
    relationshipContext: any;
    customContext?: any;
  }): string {
    const { contact, relationshipContext, customContext } = personalizedContext;
    
    if (!contact || !relationshipContext) {
      return 'No specific relationship context available.';
    }

    const context = customContext || relationshipContext;

    return `
RELATIONSHIP CONTEXT:
- Contact Name: ${contact.name}
- Relationship: ${contact.relationshipType}
- Relationship Category: ${contact.relationship}

PERSONALITY:
${context.personality}

COMMUNICATION STYLE:
${context.communicationStyle}

APPROPRIATE TOPICS:
${context.topics?.join(', ') || 'General conversation'}

AVOID THESE TOPICS:
${context.avoidTopics?.join(', ') || 'None specified'}

RESPONSE TONE:
${context.responseTone}

SPECIAL INSTRUCTIONS:
${context.specialInstructions}

PRIORITY: ${contact.priority}
NOTES: ${contact.notes || 'None'}
`;
  }

  /**
   * Format database context for AI
   */
  private formatContextForAI(context: any): string {
    return `
PERSONAL INFORMATION:
- Name: ${context.personalInfo.name}
- Role: ${context.personalInfo.role}
- Expertise: ${context.personalInfo.expertise.join(', ')}
- Personality: ${context.personalInfo.personality}
- Communication Style: ${context.personalInfo.communicationStyle}
- Availability: ${context.personalInfo.availability}

${context.organizationInfo ? `
ORGANIZATION INFORMATION:
- Name: ${context.organizationInfo.name}
- Industry: ${context.organizationInfo.industry}
- Services: ${context.organizationInfo.services.join(', ')}
- Values: ${context.organizationInfo.values.join(', ')}
- Contact: ${context.organizationInfo.contactInfo.email} | ${context.organizationInfo.contactInfo.phone}
` : ''}

AI INSTRUCTIONS:
- Response Style: ${context.aiInstructions.responseStyle}
- Preferred Language: ${context.aiInstructions.preferredLanguage}
- Tone: ${context.aiInstructions.tone}
- Topics to Avoid: ${context.aiInstructions.topicsToAvoid.join(', ')}
`;
  }

  /**
   * Process message with custom context
   */
  async processMessageWithCustomContext(
    message: string,
    whatsappNumber: string,
    customContext: string,
    userName?: string,
    options: ProcessingOptions = {}
  ): Promise<ProcessedMessage> {
    if (!this.isInitialized) {
      throw new Error('Message processor not initialized');
    }

    const startTime = Date.now();

    try {
      // Store incoming message in database
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await DatabaseMessageService.addMessage({
        whatsappNumber,
        messageId,
        direction: 'inbound',
        messageType: 'text',
        content: message,
        timestamp: new Date()
      });

      // Add user message to thread
      ThreadService.addMessage(whatsappNumber, message, 'user', {
        messageType: 'text'
      });

      // Prepare conversation context with custom context
      const conversationContext = {
        userInfo: customContext,
        organizationInfo: customContext,
        conversationHistory: ThreadService.getThreadHistory(whatsappNumber, 10).map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        }))
      };

      // Generate AI response
      const aiResponse = await GeminiService.generateResponse(
        message,
        conversationContext,
        options.maxResponseLength || 1000
      );

      // Store AI response in database
      const aiMessageId = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await DatabaseMessageService.addMessage({
        whatsappNumber,
        messageId: aiMessageId,
        direction: 'outbound',
        messageType: 'text',
        content: aiResponse.text,
        timestamp: new Date(),
        processedByAI: true,
        aiResponse: aiResponse.text,
        aiProcessingTime: Date.now() - startTime,
        aiConfidence: aiResponse.confidence,
        contextUsed: 'custom',
        threadId: ThreadService.getOrCreateThread(whatsappNumber, userName).threadId
      });

      // Add AI response to thread
      ThreadService.addMessage(whatsappNumber, aiResponse.text, 'assistant', {
        messageType: 'text'
      });

      const processingTime = Date.now() - startTime;
      const thread = ThreadService.getOrCreateThread(whatsappNumber, userName);

      const processedMessage: ProcessedMessage = {
        originalMessage: message,
        whatsappNumber,
        userName,
        aiResponse: aiResponse.text,
        confidence: aiResponse.confidence,
        processingTime,
        contextUsed: 'custom',
        threadId: thread.threadId
      };

      console.log(`Processed custom message for ${whatsappNumber} in ${processingTime}ms`);
      return processedMessage;

    } catch (error: any) {
      console.error(`Error processing custom message for ${whatsappNumber}:`, error);
      throw new Error(`Failed to process custom message: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Get processing statistics
   */
  async getProcessingStats(): Promise<{
    isInitialized: boolean;
    geminiStatus: any;
    activeThreads: number;
    totalThreads: number;
    contextSummary: any;
    messageStats: any;
  }> {
    const messageStats = await DatabaseMessageService.getMessageStats();
    const contextStats = await DatabaseContextService.getContextStats();

    return {
      isInitialized: this.isInitialized,
      geminiStatus: GeminiService.getStatus(),
      activeThreads: ThreadService.getActiveThreads(24).length,
      totalThreads: ThreadService.listThreads().length,
      contextSummary: contextStats,
      messageStats
    };
  }

  /**
   * Get thread info
   */
  async getThreadInfo(whatsappNumber: string): Promise<{
    threadId: string;
    messageCount: number;
    lastInteraction: Date | null;
    topics: string[];
    sentiment: string;
    threadAge: number;
    conversationStats: any;
  }> {
    const thread = ThreadService.getOrCreateThread(whatsappNumber);
    const threadStats = ThreadService.getThreadStats(whatsappNumber);
    const conversationStats = await DatabaseMessageService.getConversationStats(whatsappNumber);

    return {
      threadId: thread.threadId,
      messageCount: threadStats.messageCount,
      lastInteraction: threadStats.lastInteraction,
      topics: threadStats.topics,
      sentiment: threadStats.sentiment,
      threadAge: threadStats.threadAge,
      conversationStats
    };
  }

  /**
   * Clear conversation
   */
  async clearConversation(whatsappNumber: string): Promise<boolean> {
    const cleared = ThreadService.clearThread(whatsappNumber);
    if (cleared) {
      console.log(`Conversation cleared for ${whatsappNumber}`);
    }
    return cleared;
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(whatsappNumber: string, limit: number = 50): Promise<any[]> {
    return await DatabaseMessageService.getConversationHistory(whatsappNumber, limit);
  }

  /**
   * Update context
   */
  async updateContext(
    contextId: string,
    personalInfo: any,
    organizationInfo: any,
    aiInstructions: any
  ): Promise<any> {
    const updatedContext = await DatabaseContextService.updateContext(contextId, {
      personalInfo,
      organizationInfo,
      aiInstructions
    });

    if (updatedContext) {
      console.log(`Context updated: ${contextId}`);
    }

    return updatedContext;
  }

  /**
   * Get active threads
   */
  getActiveThreads(hours: number = 24): any[] {
    return ThreadService.getActiveThreads(hours);
  }

  /**
   * Search conversations
   */
  async searchConversations(query: string): Promise<any[]> {
    return await DatabaseMessageService.searchMessages(query);
  }

  /**
   * Check if processor is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

export default new MessageProcessor(); 