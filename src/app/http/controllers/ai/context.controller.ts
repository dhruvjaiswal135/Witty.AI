import { Request, Response } from 'express';
import ContextService from '../../../services/ai/context.service';

class ContextController {
  /**
   * Set personal and organization context
   */
  async setContext(req: Request, res: Response): Promise<void> {
    try {
      const { contextId, personalInfo, organizationInfo, aiInstructions } = req.body;

      if (!personalInfo && !organizationInfo && !aiInstructions) {
        res.status(400).json({
          success: false,
          message: 'At least one context section must be provided'
        });
        return;
      }

      const context = await ContextService.setContext(
        contextId || 'default',
        personalInfo || {},
        organizationInfo || {},
        aiInstructions || {}
      );

      res.status(200).json({
        success: true,
        message: 'Context updated successfully',
        data: context
      });
    } catch (error: any) {
      console.error('Error setting context:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to set context',
        error: error.message
      });
    }
  }

  /**
   * Get context by ID
   */
  async getContext(req: Request, res: Response): Promise<void> {
    try {
      const { contextId } = req.params;
      const context = ContextService.getContext(contextId);

      if (!context) {
        res.status(404).json({
          success: false,
          message: 'Context not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: context
      });
    } catch (error: any) {
      console.error('Error getting context:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get context',
        error: error.message
      });
    }
  }

  /**
   * Get formatted context for AI
   */
  async getFormattedContext(req: Request, res: Response): Promise<void> {
    try {
      const { contextId } = req.params;
      const formattedContext = ContextService.getFormattedContext(contextId);

      res.status(200).json({
        success: true,
        data: {
          contextId: contextId || 'default',
          formattedContext
        }
      });
    } catch (error: any) {
      console.error('Error getting formatted context:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get formatted context',
        error: error.message
      });
    }
  }

  /**
   * Update specific context fields
   */
  async updateContext(req: Request, res: Response): Promise<void> {
    try {
      const { contextId } = req.params;
      const { personalInfo, organizationInfo, aiInstructions } = req.body;

      const updatedContext = await ContextService.updateContext(contextId, {
        personalInfo,
        organizationInfo,
        aiInstructions
      });

      if (!updatedContext) {
        res.status(404).json({
          success: false,
          message: 'Context not found'
        });
        return;
      }

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

  /**
   * List all contexts
   */
  async listContexts(req: Request, res: Response): Promise<void> {
    try {
      const contexts = ContextService.listContexts();

      res.status(200).json({
        success: true,
        data: contexts
      });
    } catch (error: any) {
      console.error('Error listing contexts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list contexts',
        error: error.message
      });
    }
  }

  /**
   * Get context summary
   */
  async getContextSummary(req: Request, res: Response): Promise<void> {
    try {
      const { contextId } = req.params;
      const summary = ContextService.getContextSummary(contextId);

      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error: any) {
      console.error('Error getting context summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get context summary',
        error: error.message
      });
    }
  }

  /**
   * Delete context
   */
  async deleteContext(req: Request, res: Response): Promise<void> {
    try {
      const { contextId } = req.params;
      const deleted = ContextService.deleteContext(contextId);

      if (!deleted) {
        res.status(400).json({
          success: false,
          message: 'Cannot delete default context or context not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Context deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting context:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete context',
        error: error.message
      });
    }
  }
}

export default new ContextController(); 