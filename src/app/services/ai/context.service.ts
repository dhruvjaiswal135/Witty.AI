interface UserContext {
  id: string;
  personalInfo: {
    name: string;
    role: string;
    expertise: string[];
    personality: string;
    communicationStyle: string;
    availability: string;
  };
  organizationInfo: {
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
    tone: 'professional' | 'casual' | 'friendly' | 'formal';
  };
  createdAt: Date;
  updatedAt: Date;
}

class ContextService {
  private contexts: Map<string, UserContext> = new Map();
  private defaultContextId: string = 'default';

  constructor() {
    this.initializeDefaultContext();
  }

  /**
   * Initialize default context
   */
  private initializeDefaultContext(): void {
    const defaultContext: UserContext = {
      id: this.defaultContextId,
      personalInfo: {
        name: 'Alok Kumar',
        role: 'Sr. Software Engineer',
        expertise: ['software development', 'communication', 'mentorship'],
        personality: 'Helpful and professional',
        communicationStyle: 'Clear and concise',
        availability: '24/7'
      },
      organizationInfo: {
        name: 'Viacation Tourism Pvt Ltd',
        industry: 'Technology',
        services: ['Software Solutions', 'AI assistance', 'Communication'],
        values: ['Efficiency', 'Helpfulness', 'Professionalism'],
        contactInfo: {
          email: 'thealokkumarsingh@gmail.com',
          phone: '+917042184136',
          website: 'https://th3hero.github.io'
        }
      },
      aiInstructions: {
        responseStyle: 'Professional yet friendly',
        topicsToAvoid: ['sensitive personal information', 'confidential data'],
        preferredLanguage: 'English',
        tone: 'professional'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.contexts.set(this.defaultContextId, defaultContext);
  }

  /**
   * Set personal and organization context
   */
  async setContext(
    contextId: string,
    personalInfo: Partial<UserContext['personalInfo']>,
    organizationInfo: Partial<UserContext['organizationInfo']>,
    aiInstructions: Partial<UserContext['aiInstructions']> = {}
  ): Promise<UserContext> {
    const existingContext = this.contexts.get(contextId);
    
    const context: UserContext = {
      id: contextId,
      personalInfo: {
        name: personalInfo.name || existingContext?.personalInfo.name || 'AI Assistant',
        role: personalInfo.role || existingContext?.personalInfo.role || 'Personal Assistant',
        expertise: personalInfo.expertise || existingContext?.personalInfo.expertise || ['general assistance'],
        personality: personalInfo.personality || existingContext?.personalInfo.personality || 'Helpful and professional',
        communicationStyle: personalInfo.communicationStyle || existingContext?.personalInfo.communicationStyle || 'Clear and concise',
        availability: personalInfo.availability || existingContext?.personalInfo.availability || '24/7'
      },
      organizationInfo: {
        name: organizationInfo.name || existingContext?.organizationInfo.name || 'Personal Organization',
        industry: organizationInfo.industry || existingContext?.organizationInfo.industry || 'Technology',
        services: organizationInfo.services || existingContext?.organizationInfo.services || ['AI assistance'],
        values: organizationInfo.values || existingContext?.organizationInfo.values || ['Efficiency'],
        contactInfo: {
          email: organizationInfo.contactInfo?.email || existingContext?.organizationInfo.contactInfo.email || 'assistant@example.com',
          phone: organizationInfo.contactInfo?.phone || existingContext?.organizationInfo.contactInfo.phone || '+1234567890',
          website: organizationInfo.contactInfo?.website || existingContext?.organizationInfo.contactInfo.website || 'https://example.com'
        }
      },
      aiInstructions: {
        responseStyle: aiInstructions.responseStyle || existingContext?.aiInstructions.responseStyle || 'Professional yet friendly',
        topicsToAvoid: aiInstructions.topicsToAvoid || existingContext?.aiInstructions.topicsToAvoid || ['sensitive information'],
        preferredLanguage: aiInstructions.preferredLanguage || existingContext?.aiInstructions.preferredLanguage || 'English',
        tone: aiInstructions.tone || existingContext?.aiInstructions.tone || 'professional'
      },
      createdAt: existingContext?.createdAt || new Date(),
      updatedAt: new Date()
    };

    this.contexts.set(contextId, context);
    console.log(`Context updated for ID: ${contextId}`);
    return context;
  }

  /**
   * Get context by ID
   */
  getContext(contextId: string = this.defaultContextId): UserContext | null {
    return this.contexts.get(contextId) || null;
  }

  /**
   * Get formatted context for AI prompt
   */
  getFormattedContext(contextId: string = this.defaultContextId): string {
    const context = this.getContext(contextId);
    if (!context) {
      return 'No context available';
    }

    return `
PERSONAL INFORMATION:
- Name: ${context.personalInfo.name}
- Role: ${context.personalInfo.role}
- Expertise: ${context.personalInfo.expertise.join(', ')}
- Personality: ${context.personalInfo.personality}
- Communication Style: ${context.personalInfo.communicationStyle}
- Availability: ${context.personalInfo.availability}

ORGANIZATION INFORMATION:
- Organization: ${context.organizationInfo.name}
- Industry: ${context.organizationInfo.industry}
- Services: ${context.organizationInfo.services.join(', ')}
- Values: ${context.organizationInfo.values.join(', ')}
- Contact: ${context.organizationInfo.contactInfo.email} | ${context.organizationInfo.contactInfo.phone}

AI INSTRUCTIONS:
- Response Style: ${context.aiInstructions.responseStyle}
- Tone: ${context.aiInstructions.tone}
- Language: ${context.aiInstructions.preferredLanguage}
- Avoid: ${context.aiInstructions.topicsToAvoid.join(', ')}
`;
  }

  /**
   * Update specific context fields
   */
  async updateContext(
    contextId: string,
    updates: Partial<{
      personalInfo: Partial<UserContext['personalInfo']>;
      organizationInfo: Partial<UserContext['organizationInfo']>;
      aiInstructions: Partial<UserContext['aiInstructions']>;
    }>
  ): Promise<UserContext | null> {
    const existingContext = this.getContext(contextId);
    if (!existingContext) {
      return null;
    }

    const updatedContext: UserContext = {
      ...existingContext,
      personalInfo: { ...existingContext.personalInfo, ...updates.personalInfo },
      organizationInfo: { ...existingContext.organizationInfo, ...updates.organizationInfo },
      aiInstructions: { ...existingContext.aiInstructions, ...updates.aiInstructions },
      updatedAt: new Date()
    };

    this.contexts.set(contextId, updatedContext);
    return updatedContext;
  }

  /**
   * Delete context
   */
  deleteContext(contextId: string): boolean {
    if (contextId === this.defaultContextId) {
      console.warn('Cannot delete default context');
      return false;
    }
    return this.contexts.delete(contextId);
  }

  /**
   * List all contexts
   */
  listContexts(): Array<{ id: string; name: string; updatedAt: Date }> {
    return Array.from(this.contexts.values()).map(context => ({
      id: context.id,
      name: context.personalInfo.name,
      updatedAt: context.updatedAt
    }));
  }

  /**
   * Get context summary
   */
  getContextSummary(contextId: string = this.defaultContextId): {
    hasPersonalInfo: boolean;
    hasOrganizationInfo: boolean;
    hasAIInstructions: boolean;
    lastUpdated: Date | null;
  } {
    const context = this.getContext(contextId);
    if (!context) {
      return {
        hasPersonalInfo: false,
        hasOrganizationInfo: false,
        hasAIInstructions: false,
        lastUpdated: null
      };
    }

    return {
      hasPersonalInfo: !!context.personalInfo.name,
      hasOrganizationInfo: !!context.organizationInfo.name,
      hasAIInstructions: !!context.aiInstructions.responseStyle,
      lastUpdated: context.updatedAt
    };
  }
}

export default new ContextService(); 