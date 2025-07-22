import Context, { IContext } from '../../../models/Context';

interface ContextCreateData {
  contextId: string;
  name: string;
  description?: string;
  personalInfo: IContext['personalInfo'];
  organizationInfo?: IContext['organizationInfo'];
  aiInstructions: IContext['aiInstructions'];
  isDefault?: boolean;
  metadata?: IContext['metadata'];
}

interface ContextUpdateData {
  name?: string;
  description?: string;
  personalInfo?: Partial<IContext['personalInfo']>;
  organizationInfo?: Partial<IContext['organizationInfo']>;
  aiInstructions?: Partial<IContext['aiInstructions']>;
  isDefault?: boolean;
  isActive?: boolean;
  metadata?: Partial<IContext['metadata']>;
}

class DatabaseContextService {
  /**
   * Create a new context
   */
  async createContext(data: ContextCreateData): Promise<IContext> {
    // Check if context already exists
    const existingContext = await Context.findOne({ contextId: data.contextId });
    if (existingContext) {
      throw new Error(`Context with ID ${data.contextId} already exists`);
    }

    const context = new Context({
      contextId: data.contextId,
      name: data.name,
      description: data.description,
      personalInfo: data.personalInfo,
      organizationInfo: data.organizationInfo,
      aiInstructions: data.aiInstructions,
      isDefault: data.isDefault || false,
      isActive: true,
      usageCount: 0,
      metadata: data.metadata
    });

    await context.save();
    console.log(`Context created: ${data.name} (${data.contextId})`);
    return context;
  }

  /**
   * Get context by ID
   */
  async getContextById(contextId: string): Promise<IContext | null> {
    return await Context.findOne({ contextId, isActive: true });
  }

  /**
   * Get default context
   */
  async getDefaultContext(): Promise<IContext | null> {
    return await Context.findOne({ isDefault: true, isActive: true });
  }

  /**
   * Update context
   */
  async updateContext(contextId: string, data: ContextUpdateData): Promise<IContext | null> {
    const context = await Context.findOneAndUpdate(
      { contextId },
      { $set: data },
      { new: true }
    );

    if (context) {
      console.log(`Context updated: ${context.name} (${contextId})`);
    }

    return context;
  }

  /**
   * Delete context
   */
  async deleteContext(contextId: string): Promise<boolean> {
    const context = await Context.findOne({ contextId });
    if (!context) {
      throw new Error(`Context with ID ${contextId} not found`);
    }

    if (context.isDefault) {
      throw new Error('Cannot delete default context');
    }

    const result = await Context.findOneAndUpdate(
      { contextId },
      { isActive: false },
      { new: true }
    );

    return !!result;
  }

  /**
   * List all active contexts
   */
  async listContexts(): Promise<IContext[]> {
    return await Context.find({ isActive: true }).sort({ name: 1 });
  }

  /**
   * Search contexts by name or description
   */
  async searchContexts(searchTerm: string): Promise<IContext[]> {
    const regex = new RegExp(searchTerm, 'i');
    return await Context.find({
      isActive: true,
      $or: [
        { name: regex },
        { description: regex },
        { 'personalInfo.name': regex },
        { 'organizationInfo.name': regex }
      ]
    }).sort({ name: 1 });
  }

  /**
   * Increment usage count for a context
   */
  async incrementUsage(contextId: string): Promise<void> {
    await Context.updateOne(
      { contextId },
      {
        $inc: { usageCount: 1 },
        $set: { lastUsed: new Date() }
      }
    );
  }

  /**
   * Set default context
   */
  async setDefaultContext(contextId: string): Promise<IContext | null> {
    // First, remove default flag from all contexts
    await Context.updateMany({}, { isDefault: false });

    // Then set the specified context as default
    const context = await Context.findOneAndUpdate(
      { contextId, isActive: true },
      { isDefault: true },
      { new: true }
    );

    if (context) {
      console.log(`Default context set to: ${context.name} (${contextId})`);
    }

    return context;
  }

  /**
   * Get context statistics
   */
  async getContextStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    default: number;
    mostUsed: IContext[];
    recentlyUsed: IContext[];
  }> {
    const [total, active, inactive, defaultCount] = await Promise.all([
      Context.countDocuments(),
      Context.countDocuments({ isActive: true }),
      Context.countDocuments({ isActive: false }),
      Context.countDocuments({ isDefault: true })
    ]);

    const mostUsed = await Context.find({ isActive: true })
      .sort({ usageCount: -1 })
      .limit(5);

    const recentlyUsed = await Context.find({ 
      isActive: true, 
      lastUsed: { $exists: true } 
    })
      .sort({ lastUsed: -1 })
      .limit(5);

    return {
      total,
      active,
      inactive,
      default: defaultCount,
      mostUsed,
      recentlyUsed
    };
  }

  /**
   * Get contexts by tone
   */
  async getContextsByTone(tone: IContext['aiInstructions']['tone']): Promise<IContext[]> {
    return await Context.find({
      'aiInstructions.tone': tone,
      isActive: true
    }).sort({ name: 1 });
  }

  /**
   * Clone context
   */
  async cloneContext(contextId: string, newContextId: string, newName: string): Promise<IContext> {
    const originalContext = await Context.findOne({ contextId, isActive: true });
    if (!originalContext) {
      throw new Error(`Context with ID ${contextId} not found`);
    }

    const clonedContext = new Context({
      contextId: newContextId,
      name: newName,
      description: `${originalContext.description || ''} (Cloned from ${originalContext.name})`,
      personalInfo: originalContext.personalInfo,
      organizationInfo: originalContext.organizationInfo,
      aiInstructions: originalContext.aiInstructions,
      isDefault: false,
      isActive: true,
      usageCount: 0,
      metadata: {
        ...originalContext.metadata,
        createdBy: 'cloned',
        version: '1.0.0'
      }
    });

    await clonedContext.save();
    console.log(`Context cloned: ${newName} (${newContextId}) from ${originalContext.name}`);
    return clonedContext;
  }

  /**
   * Get context usage analytics
   */
  async getContextUsageAnalytics(days: number = 30): Promise<{
    contextId: string;
    name: string;
    usageCount: number;
    lastUsed: Date | null;
    averageUsagePerDay: number;
  }[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const contexts = await Context.find({
      isActive: true,
      $or: [
        { lastUsed: { $gte: cutoffDate } },
        { usageCount: { $gt: 0 } }
      ]
    }).sort({ usageCount: -1 });

    return contexts.map(context => ({
      contextId: context.contextId,
      name: context.name,
      usageCount: context.usageCount,
      lastUsed: context.lastUsed || null,
      averageUsagePerDay: context.usageCount / days
    }));
  }

  /**
   * Create default context if none exists
   */
  async ensureDefaultContext(): Promise<IContext> {
    const defaultContext = await this.getDefaultContext();
    if (defaultContext) {
      return defaultContext;
    }

    // Create a default context
    const defaultContextData: ContextCreateData = {
      contextId: 'default',
      name: 'Dhruv Narayan Jaiswal (Default Context)',
      description: 'Default AI context for Dhruv Narayan Jaiswal, Senior Product Engineer and Team Lead at ViaCation Tourism Pvt Ltd',
      personalInfo: {
        name: 'Dhruv Narayan Jaiswal',
        role: 'Software Engineer',
        expertise: [
          'Node.js', 'React', 'Next.js', 'NestJS', 'Express.js', 'JavaScript', 'TypeScript', 'PHP', 'Laravel', 'Python', 'Go', 'GraphQL', 'RESTful APIs',
          'PostgreSQL', 'MongoDB', 'DocumentDB', 'MySQL', 'Prisma', 'Sequelize',
          'AWS', 'Docker', 'CI/CD', 'GitHub Actions', 'Bitbucket Pipelines', 'Jira',
          'Hasura', 'Web3.js', 'Agile/Scrum'
        ],
        personality: 'Helpful, friendly, professional, and a mentor',
        communicationStyle: 'Clear, concise, and engaging',
        availability: '9am–7pm IST, Mon–Sat'
      },
      organizationInfo: {
        name: 'ViaCation Tourism Pvt Ltd',
        industry: 'Travel & Tourism',
        services: ['Travel booking', 'Tour management', 'Cloud infrastructure optimization'],
        values: ['Scalability', 'Performance', 'Teamwork', 'Mentorship', 'Innovation'],
        contactInfo: {
          email: 'dhruvjaiswal135@gmail.com',
          phone: '+91 9118607143',
          website: 'https://github.com/dhruvjaiswal135'
        }
      },
      aiInstructions: {
        responseStyle: 'Professional yet friendly, with a focus on mentorship and technical clarity',
        topicsToAvoid: ['Sensitive personal information', 'Confidential data'],
        preferredLanguage: 'English',
        tone: 'professional'
      },
      isDefault: true
    };

    return await this.createContext(defaultContextData);
  }
}

export default new DatabaseContextService(); 