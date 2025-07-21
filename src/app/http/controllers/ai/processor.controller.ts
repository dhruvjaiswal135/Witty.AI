import { Request, Response } from 'express';
import MessageProcessor from '../../../services/ai/message.processor';

class ProcessorController {
  /**
   * Initialize the AI processor
   */
  async initialize(req: Request, res: Response): Promise<void> {
    try {
      const initialized = await MessageProcessor.initialize();

      if (!initialized) {
        res.status(500).json({
          success: false,
          message: 'Failed to initialize AI processor'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'AI processor initialized successfully',
        data: {
          ready: MessageProcessor.isReady()
        }
      });
    } catch (error: any) {
      console.error('Error initializing AI processor:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initialize AI processor',
        error: error.message
      });
    }
  }

  /**
   * Process a message and generate AI response
   */
  async processMessage(req: Request, res: Response): Promise<void> {
    try {
      const { message, whatsappNumber, userName, options } = req.body;

      if (!message || !whatsappNumber) {
        res.status(400).json({
          success: false,
          message: 'Message and WhatsApp number are required'
        });
        return;
      }

      if (!MessageProcessor.isReady()) {
        res.status(503).json({
          success: false,
          message: 'AI processor is not ready. Please initialize first.'
        });
        return;
      }

      const processedMessage = await MessageProcessor.processMessage(
        message,
        whatsappNumber,
        userName,
        options || {}
      );

      res.status(200).json({
        success: true,
        message: 'Message processed successfully',
        data: processedMessage
      });
    } catch (error: any) {
      console.error('Error processing message:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process message',
        error: error.message
      });
    }
  }

  /**
   * Process message with custom context
   */
  async processMessageWithCustomContext(req: Request, res: Response): Promise<void> {
    try {
      const { message, whatsappNumber, customContext, userName, options } = req.body;

      if (!message || !whatsappNumber || !customContext) {
        res.status(400).json({
          success: false,
          message: 'Message, WhatsApp number, and custom context are required'
        });
        return;
      }

      if (!MessageProcessor.isReady()) {
        res.status(503).json({
          success: false,
          message: 'AI processor is not ready. Please initialize first.'
        });
        return;
      }

      const processedMessage = await MessageProcessor.processMessageWithCustomContext(
        message,
        whatsappNumber,
        customContext,
        userName,
        options || {}
      );

      res.status(200).json({
        success: true,
        message: 'Message processed with custom context successfully',
        data: processedMessage
      });
    } catch (error: any) {
      console.error('Error processing message with custom context:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process message with custom context',
        error: error.message
      });
    }
  }

  /**
   * Get processing statistics
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await MessageProcessor.getProcessingStats();
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Error getting processing stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get processing stats',
        error: error.message
      });
    }
  }

  /**
   * Get thread information
   */
  async getThreadInfo(req: Request, res: Response): Promise<void> {
    try {
      const { whatsappNumber } = req.params;
      if (!whatsappNumber) {
        res.status(400).json({
          success: false,
          message: 'WhatsApp number is required'
        });
        return;
      }
      const threadInfo = await MessageProcessor.getThreadInfo(whatsappNumber);
      res.status(200).json({
        success: true,
        data: threadInfo
      });
    } catch (error: any) {
      console.error('Error getting thread info:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get thread info',
        error: error.message
      });
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(req: Request, res: Response): Promise<void> {
    try {
      const { whatsappNumber } = req.params;
      const { limit } = req.query;
      if (!whatsappNumber) {
        res.status(400).json({
          success: false,
          message: 'WhatsApp number is required'
        });
        return;
      }
      const history = await MessageProcessor.getConversationHistory(
        whatsappNumber,
        limit ? parseInt(limit as string) : undefined
      );
      res.status(200).json({
        success: true,
        data: {
          whatsappNumber,
          messageCount: history.length,
          messages: history
        }
      });
    } catch (error: any) {
      console.error('Error getting conversation history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get conversation history',
        error: error.message
      });
    }
  }

  /**
   * Clear conversation history
   */
  async clearConversation(req: Request, res: Response): Promise<void> {
    try {
      const { whatsappNumber } = req.params;
      if (!whatsappNumber) {
        res.status(400).json({
          success: false,
          message: 'WhatsApp number is required'
        });
        return;
      }
      const cleared = await MessageProcessor.clearConversation(whatsappNumber);
      if (!cleared) {
        res.status(404).json({
          success: false,
          message: 'Thread not found'
        });
        return;
      }
      res.status(200).json({
        success: true,
        message: 'Conversation history cleared successfully'
      });
    } catch (error: any) {
      console.error('Error clearing conversation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clear conversation',
        error: error.message
      });
    }
  }

  /**
   * Get active threads
   */
  async getActiveThreads(req: Request, res: Response): Promise<void> {
    try {
      const { hours } = req.query;
      const activeThreads = await MessageProcessor.getActiveThreads(
        hours ? parseInt(hours as string) : 24
      );
      res.status(200).json({
        success: true,
        data: {
          count: activeThreads.length,
          threads: activeThreads
        }
      });
    } catch (error: any) {
      console.error('Error getting active threads:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get active threads',
        error: error.message
      });
    }
  }

  /**
   * Search conversations
   */
  async searchConversations(req: Request, res: Response): Promise<void> {
    try {
      const { query } = req.query;
      if (!query) {
        res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
        return;
      }
      const results = await MessageProcessor.searchConversations(query as string);
      res.status(200).json({
        success: true,
        data: {
          query,
          count: results.length,
          results
        }
      });
    } catch (error: any) {
      console.error('Error searching conversations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search conversations',
        error: error.message
      });
    }
  }

  /**
   * Update context for future conversations
   */
  async updateContext(req: Request, res: Response): Promise<void> {
    try {
      const { contextId, personalInfo, organizationInfo, aiInstructions } = req.body;

      if (!personalInfo && !organizationInfo && !aiInstructions) {
        res.status(400).json({
          success: false,
          message: 'At least one context section must be provided'
        });
        return;
      }

      const updatedContext = await MessageProcessor.updateContext(
        contextId || 'default',
        personalInfo || {},
        organizationInfo || {},
        aiInstructions || {}
      );

      res.status(200).json({
        success: true,
        message: 'Context updated successfully',
        data: updatedContext
      });
    } catch (error: any) {
      console.error('Error updating context:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update context',
        error: error.message
      });
    }
  }
}

export default new ProcessorController(); 