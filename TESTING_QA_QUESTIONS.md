# 🧪 Testing & Quality Assurance Questions

## 🔬 Testing Strategy

### **Q23: How would you implement comprehensive testing for this WhatsApp bot?**

**Answer:**

**Multi-layered Testing Architecture:**
```typescript
// 1. Unit Testing Framework
describe('MessageProcessor', () => {
  let messageProcessor: MessageProcessor;
  let mockGeminiService: jest.Mocked<GeminiService>;
  let mockContextService: jest.Mocked<ContextService>;
  
  beforeEach(() => {
    mockGeminiService = {
      generateResponse: jest.fn(),
      validateAPIKey: jest.fn()
    } as any;
    
    mockContextService = {
      getContext: jest.fn(),
      updateContext: jest.fn(),
      createContext: jest.fn()
    } as any;
    
    messageProcessor = new MessageProcessor(mockGeminiService, mockContextService);
  });
  
  describe('processMessage', () => {
    it('should generate AI response for valid message', async () => {
      // Arrange
      const mockMessage: IMessage = {
        content: 'Hello, how can I help?',
        contactId: 'contact123',
        threadId: 'thread123',
        timestamp: new Date(),
        direction: 'incoming'
      };
      
      const mockContext = {
        threadId: 'thread123',
        conversationHistory: [],
        personalInfo: { name: 'John', role: 'Customer' }
      };
      
      mockContextService.getContext.mockResolvedValue(mockContext);
      mockGeminiService.generateResponse.mockResolvedValue({
        text: 'Hello! I\'m here to help you. What can I do for you today?',
        usage: { promptTokens: 10, completionTokens: 15 }
      });
      
      // Act
      const result = await messageProcessor.processMessage(mockMessage);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.content).toContain('Hello!');
      expect(mockContextService.getContext).toHaveBeenCalledWith('thread123');
      expect(mockGeminiService.generateResponse).toHaveBeenCalledWith(
        expect.stringContaining('Hello, how can I help?'),
        mockContext,
        300
      );
    });
    
    it('should handle context retrieval failure gracefully', async () => {
      // Arrange
      const mockMessage: IMessage = {
        content: 'Test message',
        contactId: 'contact123',
        threadId: 'thread123',
        timestamp: new Date(),
        direction: 'incoming'
      };
      
      mockContextService.getContext.mockRejectedValue(new Error('Database error'));
      
      // Act & Assert
      await expect(messageProcessor.processMessage(mockMessage)).rejects.toThrow('Database error');
    });
  });
  
  describe('input validation', () => {
    it('should reject messages exceeding length limit', async () => {
      const longMessage = 'a'.repeat(5001);
      const mockMessage: IMessage = {
        content: longMessage,
        contactId: 'contact123',
        threadId: 'thread123',
        timestamp: new Date(),
        direction: 'incoming'
      };
      
      await expect(messageProcessor.processMessage(mockMessage))
        .rejects.toThrow('Message exceeds maximum length');
    });
    
    it('should sanitize malicious input', async () => {
      const maliciousMessage = '<script>alert("xss")</script>Hello';
      const mockMessage: IMessage = {
        content: maliciousMessage,
        contactId: 'contact123',
        threadId: 'thread123',
        timestamp: new Date(),
        direction: 'incoming'
      };
      
      mockContextService.getContext.mockResolvedValue({
        threadId: 'thread123',
        conversationHistory: [],
        personalInfo: { name: 'John', role: 'Customer' }
      });
      
      mockGeminiService.generateResponse.mockResolvedValue({
        text: 'Response',
        usage: { promptTokens: 5, completionTokens: 5 }
      });
      
      await messageProcessor.processMessage(mockMessage);
      
      // Verify sanitized input was passed to AI service
      expect(mockGeminiService.generateResponse).toHaveBeenCalledWith(
        expect.stringContaining('Hello'), // Script tag should be removed
        expect.anything(),
        expect.any(Number)
      );
      expect(mockGeminiService.generateResponse).toHaveBeenCalledWith(
        expect.not.stringContaining('<script>'), // No script tags
        expect.anything(),
        expect.any(Number)
      );
    });
  });
});

// 2. Integration Testing
describe('WhatsApp Service Integration', () => {
  let whatsappService: WhatsAppService;
  let testClient: MockWhatsAppClient;
  
  beforeAll(async () => {
    testClient = new MockWhatsAppClient();
    whatsappService = new WhatsAppService(testClient);
    await whatsappService.initialize();
  });
  
  afterAll(async () => {
    await whatsappService.disconnect();
  });
  
  describe('message handling flow', () => {
    it('should process incoming message end-to-end', async () => {
      // Arrange
      const incomingMessage = {
        from: '1234567890@c.us',
        body: 'Hello, I need help with my order',
        timestamp: Date.now()
      };
      
      // Act
      const messagePromise = new Promise((resolve) => {
        whatsappService.on('messageProcessed', resolve);
      });
      
      testClient.simulateIncomingMessage(incomingMessage);
      
      const result = await messagePromise;
      
      // Assert
      expect(result).toBeDefined();
      expect(result.response).toContain('help');
    });
    
    it('should handle multiple concurrent messages', async () => {
      const messages = Array.from({ length: 10 }, (_, i) => ({
        from: `12345${i}@c.us`,
        body: `Test message ${i}`,
        timestamp: Date.now() + i
      }));
      
      const promises = messages.map(msg => {
        return new Promise((resolve) => {
          whatsappService.once('messageProcessed', resolve);
          testClient.simulateIncomingMessage(msg);
        });
      });
      
      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
    });
  });
});

// 3. Load Testing
class LoadTestRunner {
  async runLoadTest(config: LoadTestConfig): Promise<LoadTestResults> {
    const {
      concurrentUsers,
      duration,
      messageRate,
      rampUpTime
    } = config;
    
    const results: LoadTestResults = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      responseTimePercentiles: {},
      errorTypes: new Map(),
      throughput: 0
    };
    
    const workers = [];
    const responseTimes: number[] = [];
    
    // Ramp up users gradually
    for (let i = 0; i < concurrentUsers; i++) {
      setTimeout(() => {
        const worker = this.createTestWorker(messageRate, responseTimes, results);
        workers.push(worker);
      }, (i * rampUpTime) / concurrentUsers);
    }
    
    // Run test for specified duration
    await new Promise(resolve => setTimeout(resolve, duration));
    
    // Stop all workers
    workers.forEach(worker => worker.stop());
    
    // Calculate final metrics
    results.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    results.responseTimePercentiles = this.calculatePercentiles(responseTimes);
    results.throughput = results.successfulRequests / (duration / 1000);
    
    return results;
  }
  
  private createTestWorker(
    messageRate: number,
    responseTimes: number[],
    results: LoadTestResults
  ): TestWorker {
    return {
      async start() {
        const interval = setInterval(async () => {
          const startTime = Date.now();
          
          try {
            await this.sendTestMessage();
            results.successfulRequests++;
            responseTimes.push(Date.now() - startTime);
          } catch (error) {
            results.failedRequests++;
            this.recordError(error, results.errorTypes);
          }
          
          results.totalRequests++;
        }, 1000 / messageRate);
        
        this.interval = interval;
      },
      
      stop() {
        if (this.interval) {
          clearInterval(this.interval);
        }
      }
    };
  }
}

// 4. End-to-End Testing
describe('Complete User Journey E2E Tests', () => {
  let app: Application;
  let whatsappSimulator: WhatsAppSimulator;
  
  beforeAll(async () => {
    app = await createTestApp();
    whatsappSimulator = new WhatsAppSimulator();
    await app.start();
  });
  
  afterAll(async () => {
    await app.stop();
  });
  
  describe('Customer Support Journey', () => {
    it('should handle complete support conversation', async () => {
      const customer = whatsappSimulator.createCustomer('test-customer-1');
      
      // 1. Initial greeting
      const greeting = await customer.sendMessage('Hello');
      expect(greeting.response).toMatch(/hello|hi|welcome/i);
      
      // 2. Ask for help
      const helpRequest = await customer.sendMessage('I need help with my order');
      expect(helpRequest.response).toMatch(/order|help|assist/i);
      
      // 3. Provide order details
      const orderDetails = await customer.sendMessage('Order #12345');
      expect(orderDetails.response).toMatch(/order.*12345|found.*order/i);
      
      // 4. Get solution
      const solution = await customer.sendMessage('When will it arrive?');
      expect(solution.response).toMatch(/delivery|arrive|shipping/i);
      
      // 5. Confirmation
      const confirmation = await customer.sendMessage('Thank you');
      expect(confirmation.response).toMatch(/welcome|glad|help/i);
      
      // Verify conversation was saved
      const conversation = await ConversationModel.findOne({
        'participants.phoneNumber': customer.phoneNumber
      });
      expect(conversation).toBeDefined();
      expect(conversation.messages).toHaveLength(10); // 5 exchanges
    });
  });
});

// 5. Performance Testing
class PerformanceTester {
  async measureResponseTime(operation: () => Promise<any>): Promise<PerformanceMetrics> {
    const iterations = 100;
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime.bigint();
      await operation();
      const end = process.hrtime.bigint();
      
      times.push(Number(end - start) / 1_000_000); // Convert to milliseconds
    }
    
    return {
      average: times.reduce((a, b) => a + b) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      p50: this.percentile(times, 50),
      p90: this.percentile(times, 90),
      p95: this.percentile(times, 95),
      p99: this.percentile(times, 99)
    };
  }
  
  async profileMemoryUsage(): Promise<MemoryProfile> {
    const before = process.memoryUsage();
    
    // Simulate heavy load
    await this.simulateHeavyLoad();
    
    const after = process.memoryUsage();
    
    return {
      heapUsedDelta: after.heapUsed - before.heapUsed,
      heapTotalDelta: after.heapTotal - before.heapTotal,
      externalDelta: after.external - before.external,
      rssDelata: after.rss - before.rss
    };
  }
}
```

### **Q24: How would you implement monitoring and observability?**

**Answer:**

**Comprehensive Observability Stack:**
```typescript
// 1. Application Metrics
class MetricsCollector {
  private metrics = new Map<string, Metric>();
  private prometheus = require('prom-client');
  
  constructor() {
    this.initializeMetrics();
  }
  
  private initializeMetrics(): void {
    // Counter metrics
    this.metrics.set('messages_processed_total', new this.prometheus.Counter({
      name: 'whatsapp_messages_processed_total',
      help: 'Total number of messages processed',
      labelNames: ['direction', 'status', 'contact_type']
    }));
    
    this.metrics.set('ai_requests_total', new this.prometheus.Counter({
      name: 'ai_requests_total',
      help: 'Total number of AI API requests',
      labelNames: ['model', 'status', 'response_type']
    }));
    
    // Histogram metrics
    this.metrics.set('response_duration', new this.prometheus.Histogram({
      name: 'whatsapp_response_duration_seconds',
      help: 'Time taken to generate responses',
      labelNames: ['message_type', 'complexity'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
    }));
    
    this.metrics.set('ai_processing_duration', new this.prometheus.Histogram({
      name: 'ai_processing_duration_seconds',
      help: 'Time taken for AI processing',
      labelNames: ['model', 'prompt_length_bucket'],
      buckets: [0.5, 1, 2, 5, 10, 20, 60]
    }));
    
    // Gauge metrics
    this.metrics.set('active_conversations', new this.prometheus.Gauge({
      name: 'active_conversations_count',
      help: 'Number of active conversations',
      labelNames: ['conversation_type']
    }));
    
    this.metrics.set('queue_depth', new this.prometheus.Gauge({
      name: 'message_queue_depth',
      help: 'Current message queue depth',
      labelNames: ['queue_type']
    }));
  }
  
  recordMessageProcessed(direction: string, status: string, contactType: string): void {
    this.metrics.get('messages_processed_total')
      .labels(direction, status, contactType)
      .inc();
  }
  
  recordResponseTime(duration: number, messageType: string, complexity: string): void {
    this.metrics.get('response_duration')
      .labels(messageType, complexity)
      .observe(duration);
  }
  
  async collectCustomMetrics(): Promise<CustomMetrics> {
    return {
      database: {
        connectionPool: await this.getDatabaseMetrics(),
        queryPerformance: await this.getQueryMetrics(),
        indexUsage: await this.getIndexMetrics()
      },
      ai: {
        tokenUsage: await this.getTokenUsageMetrics(),
        modelPerformance: await this.getModelMetrics(),
        promptEfficiency: await this.getPromptMetrics()
      },
      whatsapp: {
        connectionStatus: await this.getWhatsAppStatus(),
        messageQueue: await this.getQueueMetrics(),
        sessionHealth: await this.getSessionMetrics()
      }
    };
  }
}

// 2. Structured Logging
class StructuredLogger {
  private winston = require('winston');
  private logger: any;
  
  constructor() {
    this.logger = this.winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: this.winston.format.combine(
        this.winston.format.timestamp(),
        this.winston.format.errors({ stack: true }),
        this.winston.format.json(),
        this.winston.format.printf(this.customFormat)
      ),
      defaultMeta: {
        service: 'whatsapp-bot',
        version: process.env.APP_VERSION,
        environment: process.env.NODE_ENV,
        hostname: require('os').hostname(),
        pid: process.pid
      },
      transports: [
        new this.winston.transports.Console(),
        new this.winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 10485760, // 10MB
          maxFiles: 5
        }),
        new this.winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 10485760,
          maxFiles: 10
        })
      ]
    });
  }
  
  private customFormat = (info: any) => {
    return JSON.stringify({
      timestamp: info.timestamp,
      level: info.level,
      message: info.message,
      service: info.service,
      version: info.version,
      environment: info.environment,
      hostname: info.hostname,
      pid: info.pid,
      traceId: info.traceId,
      spanId: info.spanId,
      userId: info.userId,
      sessionId: info.sessionId,
      correlationId: info.correlationId,
      ...info.meta,
      stack: info.stack
    });
  };
  
  logMessageProcessing(context: MessageProcessingContext): void {
    this.logger.info('Message processing started', {
      messageId: context.messageId,
      contactId: context.contactId,
      threadId: context.threadId,
      messageLength: context.message.length,
      messageType: context.messageType,
      traceId: context.traceId
    });
  }
  
  logAIInteraction(context: AIInteractionContext): void {
    this.logger.info('AI interaction', {
      model: context.model,
      promptTokens: context.usage.promptTokens,
      completionTokens: context.usage.completionTokens,
      responseTime: context.duration,
      traceId: context.traceId,
      temperature: context.parameters.temperature,
      maxTokens: context.parameters.maxTokens
    });
  }
  
  logError(error: Error, context: ErrorContext): void {
    this.logger.error('Application error', {
      errorMessage: error.message,
      errorName: error.name,
      errorStack: error.stack,
      operation: context.operation,
      userId: context.userId,
      sessionId: context.sessionId,
      traceId: context.traceId,
      additionalData: context.additionalData
    });
  }
}

// 3. Distributed Tracing
class TracingService {
  private tracer: any;
  
  constructor() {
    const { NodeTracerProvider } = require('@opentelemetry/sdk-node');
    const { Resource } = require('@opentelemetry/resources');
    const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
    
    const provider = new NodeTracerProvider({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'whatsapp-bot',
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV,
      }),
    });
    
    provider.register();
    this.tracer = require('@opentelemetry/api').trace.getTracer('whatsapp-bot');
  }
  
  async traceMessageProcessing<T>(
    operation: string,
    context: any,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.tracer.startActiveSpan(operation, async (span: any) => {
      try {
        // Add attributes
        span.setAttributes({
          'message.id': context.messageId,
          'message.direction': context.direction,
          'contact.id': context.contactId,
          'thread.id': context.threadId,
          'message.length': context.message?.length || 0
        });
        
        const result = await fn();
        
        span.setStatus({ code: 1 }); // OK
        return result;
      } catch (error) {
        span.recordException(error);
        span.setStatus({ code: 2, message: error.message }); // ERROR
        throw error;
      } finally {
        span.end();
      }
    });
  }
  
  async traceAIInteraction<T>(
    model: string,
    context: any,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.tracer.startActiveSpan('ai.generate_response', async (span: any) => {
      try {
        span.setAttributes({
          'ai.model': model,
          'ai.prompt.length': context.promptLength,
          'ai.temperature': context.temperature,
          'ai.max_tokens': context.maxTokens
        });
        
        const startTime = Date.now();
        const result = await fn();
        const duration = Date.now() - startTime;
        
        span.setAttributes({
          'ai.response.length': result.text?.length || 0,
          'ai.tokens.prompt': result.usage?.promptTokens || 0,
          'ai.tokens.completion': result.usage?.completionTokens || 0,
          'ai.duration_ms': duration
        });
        
        span.setStatus({ code: 1 });
        return result;
      } catch (error) {
        span.recordException(error);
        span.setStatus({ code: 2, message: error.message });
        throw error;
      } finally {
        span.end();
      }
    });
  }
}
```

This comprehensive testing and monitoring strategy provides complete coverage from unit tests to production observability, ensuring reliability and maintainability of the WhatsApp bot system.
