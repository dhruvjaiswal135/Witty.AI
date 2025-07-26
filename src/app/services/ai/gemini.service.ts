import environment from '../../../config/environment';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface AIResponse {
  text: string;
  confidence: number;
  context: string;
}

interface ConversationContext {
  userInfo: string;
  organizationInfo: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
}

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private isInitialized: boolean = false;

  constructor() {
    const apiKey = environment.gemini.key;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY not found in environment variables');
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Gemini service:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Initialize the Gemini service
   */
  async initialize(): Promise<boolean> {
    if (!this.isInitialized || !this.genAI || !this.model) {
      console.error('Gemini service not properly initialized');
      return false;
    }

    try {
      // Test the connection
      const result = await this.model.generateContent('Hello');
      await result.response;
      console.log('Gemini service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Gemini service:', error);
      return false;
    }
  }

  /**
   * Generate response based on context and message
   */
  async generateResponse(
    message: string,
    context: ConversationContext,
    maxTokens: number = 1000
  ): Promise<AIResponse> {
    if (!this.isInitialized || !this.model) {
      throw new Error('Gemini service not initialized');
    }

    try {
      // Build the prompt with context
      const prompt = this.buildPrompt(message, context);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        text: text.trim(),
        confidence: 0.9, // Gemini doesn't provide confidence scores
        context: 'Generated based on user context and conversation history'
      };
    } catch (error) {
      console.error('Error generating AI response:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  /**
   * Build context-aware prompt
   */
  private buildPrompt(message: string, context: ConversationContext): string {
    const userInfo = context.userInfo || 'No specific user information provided';
    const orgInfo = context.organizationInfo || 'No organization information provided';
    
    // Build conversation history
    const history = context.conversationHistory
      .slice(-10) // Last 10 messages for context
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    return `
You are an AI assistant representing a person/organization. Please respond to WhatsApp messages based on the following context:

PERSONAL/ORGANIZATION CONTEXT:
${userInfo}

ORGANIZATION INFORMATION:
${orgInfo}

CONVERSATION HISTORY:
${history}

CURRENT MESSAGE:
${message}

INSTRUCTIONS:
1. Respond naturally as if you are the person/organization
2. Use the provided context to personalize your responses
3. Keep responses concise and WhatsApp-appropriate
4. Be helpful, professional, and friendly
5. If you don't have enough context, ask for clarification politely

Please provide a response:
`;
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.genAI !== null && this.model !== null;
  }

  /**
   * Get service status
   */
  getStatus(): { ready: boolean; model: string; apiKey: boolean } {
    return {
      ready: this.isReady(),
      model: 'gemini-2.5-flash',
      apiKey: !!environment.gemini.key
    };
  }
}

export default new GeminiService(); 