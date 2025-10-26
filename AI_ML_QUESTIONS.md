# 🤖 AI & Machine Learning Questions

## 🧠 AI Integration & Prompt Engineering

### **Q16: How did you implement prompt engineering for the Gemini AI model?**

**Answer:**

**Sophisticated Prompt Architecture:**
```typescript
class AdvancedPromptBuilder {
  buildContextualPrompt(message: string, context: ConversationContext): string {
    return `
${this.buildSystemInstructions()}

${this.buildPersonalityContext(context)}

${this.buildConversationHistory(context)}

${this.buildUserContext(context)}

${this.buildResponseGuidelines()}

Current User Message: "${message}"

Generate a response that:
1. Maintains the established personality and tone
2. Addresses the user's specific need or question
3. Uses the provided context appropriately
4. Stays within character and organizational guidelines
5. Provides actionable information when possible

Response:`;
  }
  
  private buildSystemInstructions(): string {
    return `You are an AI assistant representing a specific person/organization. Your responses should be:
- Natural and conversational
- Contextually appropriate
- Helpful and solution-oriented
- Consistent with the provided personality
- Professional yet approachable`;
  }
  
  private buildPersonalityContext(context: ConversationContext): string {
    const personal = context.personalInfo;
    return `
PERSONALITY PROFILE:
- Name: ${personal.name}
- Role: ${personal.role}
- Communication Style: ${personal.communicationStyle}
- Expertise Areas: ${personal.expertise.join(', ')}
- Personality Traits: ${personal.personality}
- Availability: ${personal.availability}`;
  }
  
  private buildConversationHistory(context: ConversationContext): string {
    if (!context.conversationHistory.length) return 'No previous conversation history.';
    
    const recentMessages = context.conversationHistory.slice(-6); // Last 6 messages
    return `
RECENT CONVERSATION:
${recentMessages.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n')}`;
  }
  
  private buildResponseGuidelines(): string {
    return `
RESPONSE GUIDELINES:
- Keep responses concise (under 200 words unless detailed explanation needed)
- Use appropriate tone based on relationship and context
- Provide specific, actionable information when possible
- Ask clarifying questions if the request is unclear
- Escalate to human if the request is outside your capabilities
- Do not make assumptions about personal information not provided`;
  }
}
```

**Dynamic Prompt Optimization:**
```typescript
class PromptOptimizer {
  private performanceMetrics = new Map<string, number>();
  
  async optimizePrompt(basePrompt: string, context: any): Promise<string> {
    // A/B testing different prompt variations
    const variations = this.generatePromptVariations(basePrompt);
    
    // Select best performing variation
    const bestVariation = await this.selectBestVariation(variations, context);
    
    // Apply dynamic optimizations
    return this.applyDynamicOptimizations(bestVariation, context);
  }
  
  private generatePromptVariations(basePrompt: string): string[] {
    return [
      // Variation 1: More structured
      this.addStructuredFormat(basePrompt),
      
      // Variation 2: More conversational
      this.addConversationalTone(basePrompt),
      
      // Variation 3: More directive
      this.addDirectiveInstructions(basePrompt)
    ];
  }
  
  private async selectBestVariation(variations: string[], context: any): Promise<string> {
    // Check historical performance
    const performanceScores = variations.map(variation => 
      this.performanceMetrics.get(this.hashPrompt(variation)) || 0.5
    );
    
    // Select best performing or use exploration strategy
    const bestIndex = performanceScores.indexOf(Math.max(...performanceScores));
    
    // 10% exploration rate for testing new variations
    if (Math.random() < 0.1) {
      return variations[Math.floor(Math.random() * variations.length)];
    }
    
    return variations[bestIndex];
  }
}
```

### **Q17: How did you handle different conversation contexts and maintain personality consistency?**

**Answer:**

**Context-Aware Personality Engine:**
```typescript
interface PersonalityProfile {
  basePersonality: string;
  communicationStyle: string;
  expertise: string[];
  responsePatterns: {
    greeting: string[];
    problemSolving: string[];
    escalation: string[];
    farewell: string[];
  };
  adaptationRules: {
    relationship: Record<string, PersonalityAdjustment>;
    urgency: Record<string, PersonalityAdjustment>;
    topic: Record<string, PersonalityAdjustment>;
  };
}

interface PersonalityAdjustment {
  toneModifier: number; // -1 (more casual) to 1 (more formal)
  responseLength: 'short' | 'medium' | 'detailed';
  emphasisLevel: 'low' | 'medium' | 'high';
  supportLevel: 'basic' | 'comprehensive' | 'expert';
}

class PersonalityEngine {
  async generateContextualResponse(
    message: string,
    contact: IContact,
    conversationHistory: Message[]
  ): Promise<string> {
    // 1. Analyze conversation context
    const context = await this.analyzeConversationContext(message, conversationHistory);
    
    // 2. Determine appropriate personality adaptation
    const personalityAdjustment = this.calculatePersonalityAdjustment(contact, context);
    
    // 3. Build adapted prompt
    const adaptedPrompt = this.buildAdaptedPrompt(message, contact, personalityAdjustment, context);
    
    // 4. Generate response with consistency checks
    const response = await this.generateWithConsistencyCheck(adaptedPrompt, conversationHistory);
    
    return response;
  }
  
  private analyzeConversationContext(message: string, history: Message[]): ConversationContext {
    return {
      intent: this.classifyIntent(message),
      urgency: this.assessUrgency(message),
      topic: this.extractTopic(message),
      sentiment: this.analyzeSentiment(message),
      conversationStage: this.determineConversationStage(history),
      previousResolutions: this.extractPreviousResolutions(history)
    };
  }
  
  private calculatePersonalityAdjustment(
    contact: IContact,
    context: ConversationContext
  ): PersonalityAdjustment {
    let adjustment: PersonalityAdjustment = {
      toneModifier: 0,
      responseLength: 'medium',
      emphasisLevel: 'medium',
      supportLevel: 'comprehensive'
    };
    
    // Adjust based on relationship
    if (contact.relationship === 'family') {
      adjustment.toneModifier = -0.5; // More casual
      adjustment.responseLength = 'short';
    } else if (contact.relationship === 'client') {
      adjustment.toneModifier = 0.5; // More formal
      adjustment.supportLevel = 'expert';
    }
    
    // Adjust based on urgency
    if (context.urgency === 'high') {
      adjustment.responseLength = 'short';
      adjustment.emphasisLevel = 'high';
    }
    
    // Adjust based on contact priority
    if (contact.priority === 'high') {
      adjustment.supportLevel = 'expert';
      adjustment.responseLength = 'detailed';
    }
    
    return adjustment;
  }
}
```

**Consistency Validation System:**
```typescript
class ResponseConsistencyValidator {
  async validateResponse(
    response: string,
    expectedPersonality: PersonalityProfile,
    conversationHistory: Message[]
  ): Promise<{ isConsistent: boolean; issues: string[]; confidence: number }> {
    const validationResults = await Promise.all([
      this.validateToneConsistency(response, expectedPersonality),
      this.validateContentRelevance(response, conversationHistory),
      this.validatePersonalityAlignment(response, expectedPersonality),
      this.validateFactualConsistency(response, conversationHistory)
    ]);
    
    const issues = validationResults.flatMap(result => result.issues);
    const confidence = validationResults.reduce((avg, result) => avg + result.confidence, 0) / validationResults.length;
    
    return {
      isConsistent: issues.length === 0,
      issues,
      confidence
    };
  }
  
  private async validateToneConsistency(
    response: string,
    personality: PersonalityProfile
  ): Promise<ValidationResult> {
    // Analyze tone using NLP
    const detectedTone = await this.analyzeTone(response);
    const expectedTone = personality.communicationStyle;
    
    const consistency = this.calculateToneAlignment(detectedTone, expectedTone);
    
    return {
      issues: consistency < 0.7 ? ['Tone inconsistency detected'] : [],
      confidence: consistency
    };
  }
}
```

### **Q18: How did you implement intent classification and sentiment analysis?**

**Answer:**

**Multi-layered Intent Classification:**
```typescript
interface IntentClassificationResult {
  primaryIntent: string;
  confidence: number;
  secondaryIntents: Array<{ intent: string; confidence: number }>;
  entities: Array<{ entity: string; value: string; confidence: number }>;
}

class IntentClassifier {
  private intentPatterns: Map<string, RegExp[]> = new Map([
    ['order_inquiry', [
      /order\s*#?\s*(\d+)/i,
      /track(ing)?\s*(my\s*)?order/i,
      /where\s+is\s+my\s+order/i,
      /order\s+status/i
    ]],
    ['billing_question', [
      /billing/i,
      /invoice/i,
      /payment/i,
      /charge/i,
      /refund/i
    ]],
    ['technical_support', [
      /not\s+working/i,
      /error/i,
      /problem/i,
      /issue/i,
      /bug/i,
      /broken/i
    ]],
    ['general_inquiry', [
      /how\s+to/i,
      /can\s+you/i,
      /information/i,
      /help/i
    ]],
    ['escalation_request', [
      /speak\s+to\s+(human|person|agent|manager)/i,
      /escalate/i,
      /complaint/i,
      /not\s+satisfied/i
    ]]
  ]);
  
  async classifyIntent(message: string): Promise<IntentClassificationResult> {
    const results: Array<{ intent: string; confidence: number }> = [];
    
    // Pattern-based classification
    for (const [intent, patterns] of this.intentPatterns) {
      const confidence = this.calculatePatternConfidence(message, patterns);
      if (confidence > 0.3) {
        results.push({ intent, confidence });
      }
    }
    
    // ML-based classification (using Gemini for complex cases)
    if (results.length === 0 || Math.max(...results.map(r => r.confidence)) < 0.6) {
      const mlResult = await this.classifyWithML(message);
      results.push(...mlResult);
    }
    
    // Sort by confidence
    results.sort((a, b) => b.confidence - a.confidence);
    
    // Extract entities
    const entities = await this.extractEntities(message, results[0]?.intent);
    
    return {
      primaryIntent: results[0]?.intent || 'general_inquiry',
      confidence: results[0]?.confidence || 0.5,
      secondaryIntents: results.slice(1, 3),
      entities
    };
  }
  
  private async classifyWithML(message: string): Promise<Array<{ intent: string; confidence: number }>> {
    const prompt = `
Classify the intent of this customer message. Return only the classification in JSON format.

Message: "${message}"

Available intents:
- order_inquiry: Questions about orders, tracking, delivery
- billing_question: Payment, invoices, refunds, charges
- technical_support: Product issues, errors, troubleshooting
- product_information: Questions about products, features, specifications
- general_inquiry: General questions, information requests
- escalation_request: Requests to speak with humans, complaints
- greeting: Hello, hi, good morning, etc.
- farewell: Goodbye, thanks, bye, etc.

Response format:
{
  "intents": [
    {"intent": "order_inquiry", "confidence": 0.85},
    {"intent": "billing_question", "confidence": 0.12}
  ]
}`;
    
    try {
      const response = await GeminiService.generateResponse(prompt, {}, 200);
      const parsed = JSON.parse(response.text);
      return parsed.intents || [];
    } catch (error) {
      console.error('ML intent classification failed:', error);
      return [];
    }
  }
}
```

**Advanced Sentiment Analysis:**
```typescript
interface SentimentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  emotions: Array<{ emotion: string; intensity: number }>;
  urgency: 'low' | 'medium' | 'high';
}

class SentimentAnalyzer {
  private positiveWords = new Set([
    'good', 'great', 'excellent', 'amazing', 'love', 'perfect', 'satisfied', 'happy'
  ]);
  
  private negativeWords = new Set([
    'bad', 'terrible', 'awful', 'hate', 'disappointed', 'frustrated', 'angry', 'upset'
  ]);
  
  private urgencyIndicators = new Set([
    'urgent', 'asap', 'immediately', 'emergency', 'critical', 'important', 'rush'
  ]);
  
  async analyzeSentiment(message: string): Promise<SentimentAnalysis> {
    // Lexicon-based analysis
    const lexiconResult = this.lexiconBasedAnalysis(message);
    
    // ML-based analysis for complex cases
    const mlResult = await this.mlBasedAnalysis(message);
    
    // Combine results
    const combined = this.combineAnalysis(lexiconResult, mlResult);
    
    // Detect urgency
    const urgency = this.detectUrgency(message);
    
    return {
      ...combined,
      urgency
    };
  }
  
  private lexiconBasedAnalysis(message: string): Partial<SentimentAnalysis> {
    const words = message.toLowerCase().split(/\s+/);
    let positiveScore = 0;
    let negativeScore = 0;
    
    for (const word of words) {
      if (this.positiveWords.has(word)) positiveScore++;
      if (this.negativeWords.has(word)) negativeScore++;
    }
    
    const total = positiveScore + negativeScore;
    if (total === 0) {
      return { sentiment: 'neutral', confidence: 0.5 };
    }
    
    const positiveRatio = positiveScore / total;
    
    if (positiveRatio > 0.6) {
      return { sentiment: 'positive', confidence: 0.7 };
    } else if (positiveRatio < 0.4) {
      return { sentiment: 'negative', confidence: 0.7 };
    } else {
      return { sentiment: 'neutral', confidence: 0.6 };
    }
  }
  
  private async mlBasedAnalysis(message: string): Promise<Partial<SentimentAnalysis>> {
    const prompt = `
Analyze the sentiment and emotions in this message. Return JSON only.

Message: "${message}"

Response format:
{
  "sentiment": "positive|negative|neutral",
  "confidence": 0.85,
  "emotions": [
    {"emotion": "frustration", "intensity": 0.7},
    {"emotion": "confusion", "intensity": 0.3}
  ]
}`;
    
    try {
      const response = await GeminiService.generateResponse(prompt, {}, 200);
      return JSON.parse(response.text);
    } catch (error) {
      console.error('ML sentiment analysis failed:', error);
      return { sentiment: 'neutral', confidence: 0.5 };
    }
  }
}
```

### **Q19: How did you implement conversation flow management and state transitions?**

**Answer:**

**Finite State Machine for Conversations:**
```typescript
enum ConversationState {
  INITIAL = 'initial',
  GREETING = 'greeting',
  INFORMATION_GATHERING = 'information_gathering',
  PROBLEM_IDENTIFICATION = 'problem_identification',
  SOLUTION_PROVIDING = 'solution_providing',
  CONFIRMATION = 'confirmation',
  ESCALATION = 'escalation',
  CLOSING = 'closing'
}

interface StateTransition {
  from: ConversationState;
  to: ConversationState;
  condition: (context: ConversationContext) => boolean;
  action?: (context: ConversationContext) => Promise<void>;
}

class ConversationFlowManager {
  private stateTransitions: StateTransition[] = [
    {
      from: ConversationState.INITIAL,
      to: ConversationState.GREETING,
      condition: (ctx) => this.isGreeting(ctx.currentMessage),
      action: async (ctx) => await this.recordGreeting(ctx)
    },
    {
      from: ConversationState.GREETING,
      to: ConversationState.INFORMATION_GATHERING,
      condition: (ctx) => this.hasSpecificRequest(ctx.currentMessage),
      action: async (ctx) => await this.initializeDataCollection(ctx)
    },
    {
      from: ConversationState.INFORMATION_GATHERING,
      to: ConversationState.PROBLEM_IDENTIFICATION,
      condition: (ctx) => this.hasSufficientInfo(ctx),
      action: async (ctx) => await this.analyzeGatheredInfo(ctx)
    },
    {
      from: ConversationState.PROBLEM_IDENTIFICATION,
      to: ConversationState.SOLUTION_PROVIDING,
      condition: (ctx) => this.canProvideSolution(ctx),
      action: async (ctx) => await this.prepareSolution(ctx)
    },
    {
      from: ConversationState.SOLUTION_PROVIDING,
      to: ConversationState.CONFIRMATION,
      condition: (ctx) => this.solutionProvided(ctx),
      action: async (ctx) => await this.requestConfirmation(ctx)
    },
    {
      from: ConversationState.CONFIRMATION,
      to: ConversationState.CLOSING,
      condition: (ctx) => this.isConfirmed(ctx.currentMessage),
      action: async (ctx) => await this.initiateClosure(ctx)
    },
    // Escalation transitions (can happen from any state)
    {
      from: ConversationState.INFORMATION_GATHERING,
      to: ConversationState.ESCALATION,
      condition: (ctx) => this.needsEscalation(ctx),
      action: async (ctx) => await this.initiateEscalation(ctx)
    }
  ];
  
  async processStateTransition(
    currentState: ConversationState,
    context: ConversationContext
  ): Promise<{ newState: ConversationState; action?: string }> {
    // Find applicable transitions
    const applicableTransitions = this.stateTransitions.filter(
      transition => transition.from === currentState && transition.condition(context)
    );
    
    if (applicableTransitions.length === 0) {
      // No state change
      return { newState: currentState };
    }
    
    // Select best transition (could use priority system)
    const selectedTransition = applicableTransitions[0];
    
    // Execute transition action
    if (selectedTransition.action) {
      await selectedTransition.action(context);
    }
    
    // Update conversation state
    await this.updateConversationState(context.threadId, selectedTransition.to);
    
    return {
      newState: selectedTransition.to,
      action: selectedTransition.action ? 'action_executed' : undefined
    };
  }
  
  private async generateStateAwareResponse(
    state: ConversationState,
    context: ConversationContext
  ): Promise<string> {
    const statePrompts = {
      [ConversationState.GREETING]: `
Generate a friendly greeting response. Be welcoming and ask how you can help.
Context: ${context.personalInfo}`,
      
      [ConversationState.INFORMATION_GATHERING]: `
Ask relevant follow-up questions to understand the user's need better.
Current information gathered: ${JSON.stringify(context.collectedData)}
Missing information: ${this.identifyMissingInfo(context)}`,
      
      [ConversationState.SOLUTION_PROVIDING]: `
Provide a comprehensive solution based on the gathered information.
Problem identified: ${context.identifiedProblem}
User profile: ${context.userProfile}
Available solutions: ${context.availableSolutions}`,
      
      [ConversationState.CONFIRMATION]: `
Confirm if the provided solution meets the user's needs.
Solution provided: ${context.providedSolution}
Ask for confirmation and offer additional help if needed.`
    };
    
    const prompt = statePrompts[state] || 'Generate an appropriate response';
    
    return await GeminiService.generateResponse(
      `${prompt}\n\nUser message: "${context.currentMessage}"`,
      context,
      300
    );
  }
}
```

**Context Persistence and Recovery:**
```typescript
class ConversationContextManager {
  async saveConversationContext(threadId: string, context: ConversationContext): Promise<void> {
    const contextData = {
      threadId,
      state: context.currentState,
      collectedData: context.collectedData,
      identifiedProblem: context.identifiedProblem,
      providedSolutions: context.providedSolutions,
      userProfile: context.userProfile,
      sessionMetadata: {
        startTime: context.startTime,
        lastActivity: new Date(),
        messageCount: context.messageCount,
        stateHistory: context.stateHistory
      },
      timestamp: new Date()
    };
    
    // Store in both Redis (fast access) and MongoDB (persistence)
    await Promise.all([
      this.redis.setex(`context:${threadId}`, 3600, JSON.stringify(contextData)),
      this.saveToDatabase(contextData)
    ]);
  }
  
  async recoverConversationContext(threadId: string): Promise<ConversationContext | null> {
    try {
      // Try Redis first
      let contextData = await this.redis.get(`context:${threadId}`);
      
      if (!contextData) {
        // Fallback to database
        const dbRecord = await ConversationContextModel.findOne({ threadId });
        if (dbRecord) {
          contextData = JSON.stringify(dbRecord);
          // Restore to Redis
          await this.redis.setex(`context:${threadId}`, 3600, contextData);
        }
      }
      
      if (!contextData) return null;
      
      const parsed = JSON.parse(contextData);
      
      // Reconstruct context object
      return {
        threadId: parsed.threadId,
        currentState: parsed.state,
        collectedData: parsed.collectedData || {},
        identifiedProblem: parsed.identifiedProblem,
        providedSolutions: parsed.providedSolutions || [],
        userProfile: parsed.userProfile,
        startTime: new Date(parsed.sessionMetadata.startTime),
        lastActivity: new Date(parsed.sessionMetadata.lastActivity),
        messageCount: parsed.sessionMetadata.messageCount,
        stateHistory: parsed.sessionMetadata.stateHistory || []
      };
    } catch (error) {
      console.error('Failed to recover conversation context:', error);
      return null;
    }
  }
}
```

This AI/ML implementation demonstrates sophisticated conversation management, intent classification, sentiment analysis, and state-based dialogue flow - all critical for a production-grade conversational AI system.
