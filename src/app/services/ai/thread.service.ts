interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  metadata?: {
    messageType?: 'text' | 'image' | 'document' | 'audio';
    fileName?: string;
    fileSize?: number;
  };
}

interface ConversationThread {
  threadId: string;
  whatsappNumber: string;
  userName?: string;
  messages: Message[];
  context: {
    lastInteraction: Date;
    messageCount: number;
    topics: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
  };
  createdAt: Date;
  updatedAt: Date;
}

class ThreadService {
  private threads: Map<string, ConversationThread> = new Map();
  private maxMessagesPerThread: number = 50; // Keep last 50 messages for context

  /**
   * Create or get a conversation thread for a WhatsApp number
   */
  getOrCreateThread(whatsappNumber: string, userName?: string): ConversationThread {
    const threadId = this.generateThreadId(whatsappNumber);
    
    if (this.threads.has(threadId)) {
      const thread = this.threads.get(threadId)!;
      if (userName && !thread.userName) {
        thread.userName = userName;
        thread.updatedAt = new Date();
      }
      return thread;
    }

    const newThread: ConversationThread = {
      threadId,
      whatsappNumber,
      userName,
      messages: [],
      context: {
        lastInteraction: new Date(),
        messageCount: 0,
        topics: [],
        sentiment: 'neutral'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.threads.set(threadId, newThread);
    console.log(`Created new thread for ${whatsappNumber}`);
    return newThread;
  }

  /**
   * Add a message to a thread
   */
  addMessage(whatsappNumber: string, content: string, role: 'user' | 'assistant', metadata?: Message['metadata']): Message {
    const thread = this.getOrCreateThread(whatsappNumber);
    
    const message: Message = {
      id: this.generateMessageId(),
      content,
      role,
      timestamp: new Date(),
      metadata
    };

    thread.messages.push(message);
    thread.context.lastInteraction = new Date();
    thread.context.messageCount = thread.messages.length;
    thread.updatedAt = new Date();

    // Keep only the last maxMessagesPerThread messages
    if (thread.messages.length > this.maxMessagesPerThread) {
      thread.messages = thread.messages.slice(-this.maxMessagesPerThread);
    }

    // Update topics based on message content (simple keyword extraction)
    this.updateThreadTopics(thread, content);

    return message;
  }

  /**
   * Get conversation history for a thread
   */
  getThreadHistory(whatsappNumber: string, limit?: number): Message[] {
    const thread = this.getOrCreateThread(whatsappNumber);
    const messages = thread.messages;
    
    if (limit && limit > 0) {
      return messages.slice(-limit);
    }
    
    return messages;
  }

  /**
   * Get formatted conversation history for AI context
   */
  getFormattedHistory(whatsappNumber: string, limit: number = 10): string {
    const messages = this.getThreadHistory(whatsappNumber, limit);
    
    if (messages.length === 0) {
      return 'No previous conversation history.';
    }

    return messages
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');
  }

  /**
   * Get thread statistics
   */
  getThreadStats(whatsappNumber: string): {
    messageCount: number;
    lastInteraction: Date | null;
    topics: string[];
    sentiment: string;
    threadAge: number; // in days
  } {
    const thread = this.getOrCreateThread(whatsappNumber);
    
    return {
      messageCount: thread.context.messageCount,
      lastInteraction: thread.context.lastInteraction,
      topics: thread.context.topics,
      sentiment: thread.context.sentiment,
      threadAge: Math.floor((Date.now() - thread.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    };
  }

  /**
   * Update thread topics based on message content
   */
  private updateThreadTopics(thread: ConversationThread, content: string): void {
    const keywords = this.extractKeywords(content.toLowerCase());
    const existingTopics = new Set(thread.context.topics);
    
    keywords.forEach(keyword => {
      if (!existingTopics.has(keyword)) {
        existingTopics.add(keyword);
      }
    });

    thread.context.topics = Array.from(existingTopics).slice(0, 10); // Keep top 10 topics
  }

  /**
   * Simple keyword extraction
   */
  private extractKeywords(content: string): string[] {
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
    ]);

    const words = content
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.has(word))
      .slice(0, 5); // Top 5 keywords

    return words;
  }

  /**
   * Clear thread history
   */
  clearThread(whatsappNumber: string): boolean {
    const threadId = this.generateThreadId(whatsappNumber);
    const thread = this.threads.get(threadId);
    
    if (thread) {
      thread.messages = [];
      thread.context.messageCount = 0;
      thread.context.topics = [];
      thread.context.sentiment = 'neutral';
      thread.updatedAt = new Date();
      console.log(`Cleared thread for ${whatsappNumber}`);
      return true;
    }
    
    return false;
  }

  /**
   * Delete thread completely
   */
  deleteThread(whatsappNumber: string): boolean {
    const threadId = this.generateThreadId(whatsappNumber);
    const deleted = this.threads.delete(threadId);
    
    if (deleted) {
      console.log(`Deleted thread for ${whatsappNumber}`);
    }
    
    return deleted;
  }

  /**
   * List all threads
   */
  listThreads(): Array<{
    threadId: string;
    whatsappNumber: string;
    userName?: string;
    messageCount: number;
    lastInteraction: Date;
    createdAt: Date;
  }> {
    return Array.from(this.threads.values()).map(thread => ({
      threadId: thread.threadId,
      whatsappNumber: thread.whatsappNumber,
      userName: thread.userName,
      messageCount: thread.context.messageCount,
      lastInteraction: thread.context.lastInteraction,
      createdAt: thread.createdAt
    }));
  }

  /**
   * Get active threads (with recent activity)
   */
  getActiveThreads(hours: number = 24): ConversationThread[] {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return Array.from(this.threads.values()).filter(thread => 
      thread.context.lastInteraction > cutoffTime
    );
  }

  /**
   * Generate unique thread ID
   */
  private generateThreadId(whatsappNumber: string): string {
    return `thread_${whatsappNumber.replace(/[^0-9]/g, '')}`;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get thread by ID
   */
  getThreadById(threadId: string): ConversationThread | null {
    return this.threads.get(threadId) || null;
  }

  /**
   * Search threads by content
   */
  searchThreads(query: string): ConversationThread[] {
    const results: ConversationThread[] = [];
    const searchTerm = query.toLowerCase();

    for (const thread of this.threads.values()) {
      const hasMatch = thread.messages.some(message => 
        message.content.toLowerCase().includes(searchTerm)
      ) || thread.userName?.toLowerCase().includes(searchTerm);

      if (hasMatch) {
        results.push(thread);
      }
    }

    return results;
  }
}

export default new ThreadService(); 