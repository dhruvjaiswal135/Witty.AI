# 🔗 API Design & Integration Questions

## 🌐 RESTful API Design

### **Q27: How did you design the REST API architecture for your WhatsApp bot?**

**Answer:**

**🎯 Core Concepts & Theory:**

**What is REST?**
REST (Representational State Transfer) is an architectural style for designing web services. It's based on six key principles:

1. **Client-Server Architecture**: Separation of concerns between client and server
2. **Stateless**: Each request contains all information needed to process it
3. **Cacheable**: Responses should be cacheable when appropriate
4. **Uniform Interface**: Consistent way to interact with resources
5. **Layered System**: Architecture can have multiple layers
6. **Code on Demand** (optional): Server can send executable code to client

**Why REST for WhatsApp Bot APIs?**
- **Simplicity**: Easy to understand and implement
- **Scalability**: Stateless nature allows horizontal scaling
- **Flexibility**: Can handle various data formats (JSON, XML)
- **Standard HTTP Methods**: GET, POST, PUT, DELETE are universally understood
- **Caching**: HTTP caching mechanisms work naturally with REST

**Key Design Principles I Applied:**

1. **Resource-Based URLs**: Each URL represents a specific resource
   - `/api/v1/messages` = collection of messages
   - `/api/v1/messages/123` = specific message with ID 123

2. **HTTP Methods for Actions**:
   - GET = Retrieve data (read-only)
   - POST = Create new resource
   - PUT = Update existing resource
   - DELETE = Remove resource

3. **Consistent Response Format**: All responses follow same structure
4. **API Versioning**: `/v1/` in URL for backward compatibility
5. **Authentication & Authorization**: Secure access to protected resources

**🔧 Implementation Breakdown:**
```typescript
// src/routes/api/v1/index.ts
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validation.middleware';
import { rateLimit } from '../../middleware/rateLimit.middleware';

const router = Router();

// API Versioning Strategy - WHY THIS MATTERS:
// - Allows backward compatibility when API changes
// - Clients can migrate to new versions gradually
// - Multiple versions can run simultaneously
router.use('/v1', require('./v1'));
router.use('/v2', require('./v2')); // Future version

// Core API Routes with proper HTTP methods
// CONCEPT: Middleware Chain Pattern
// Each route goes through: authentication → authorization → rate limiting → actual handler
router.use('/v1/contacts', authenticate, require('./contacts'));
router.use('/v1/messages', authenticate, require('./messages'));
router.use('/v1/conversations', authenticate, require('./conversations'));
router.use('/v1/analytics', authenticate, authorize(['admin']), require('./analytics'));
router.use('/v1/webhooks', rateLimit({ windowMs: 60000, max: 100 }), require('./webhooks'));

// Health and Status endpoints - Public endpoints for monitoring
router.get('/health', require('./health'));
router.get('/metrics', authenticate, authorize(['admin']), require('./metrics'));

export default router;
```

**📚 Middleware Chain Explanation:**

**What is Middleware?**
Middleware functions are functions that execute during the request-response cycle. They have access to:
- Request object (req)
- Response object (res) 
- Next middleware function (next)

**Why Use Middleware Chain?**
1. **Separation of Concerns**: Each middleware handles one responsibility
2. **Reusability**: Same middleware can be used across multiple routes
3. **Flexibility**: Can add/remove middleware without changing core logic
4. **Order Matters**: Middleware executes in the order it's defined

**My Middleware Strategy:**
1. `authenticate` - Verifies user identity (JWT token validation)
2. `authorize(['admin'])` - Checks user permissions for specific roles
3. `rateLimit` - Prevents abuse by limiting requests per time window
4. `validateRequest` - Validates input data format and constraints

**🔨 Message Controller Implementation:**
```typescript
// src/routes/api/v1/messages.ts
class MessageController {
  // GET /api/v1/messages - List messages with pagination and filtering
  // CONCEPT: Collection Resource with Query Parameters
  async getMessages(req: Request, res: Response): Promise<void> {
    try {
      // PAGINATION CONCEPT:
      // Instead of returning all messages (could be millions), we use pagination
      // page=1, limit=20 means "give me first 20 messages"
      // page=2, limit=20 means "give me messages 21-40"
      const {
        page = 1,           // Which page of results
        limit = 20,         // How many items per page
        contactId,          // Filter by specific contact
        threadId,           // Filter by conversation thread
        direction,          // Filter by 'incoming' or 'outgoing'
        dateFrom,           // Filter messages after this date
        dateTo,             // Filter messages before this date
        search              // Full-text search in message content
      } = req.query;

      // FILTERING CONCEPT:
      // Build MongoDB query filter object based on provided parameters
      const filter: any = {};
      
      // Only add filters if parameters are provided
      if (contactId) filter.contactId = contactId;
      if (threadId) filter.threadId = threadId;
      if (direction) filter.direction = direction;
      
      // DATE RANGE FILTERING:
      // MongoDB uses $gte (greater than or equal) and $lte (less than or equal)
      if (dateFrom || dateTo) {
        filter.timestamp = {};
        if (dateFrom) filter.timestamp.$gte = new Date(dateFrom as string);
        if (dateTo) filter.timestamp.$lte = new Date(dateTo as string);
      }
      
      // FULL-TEXT SEARCH:
      // MongoDB text index allows searching within message content
      if (search) {
        filter.$text = { $search: search };
      }

      // SERVICE LAYER PATTERN:
      // Controller doesn't handle database directly - delegates to service
      const messages = await MessageService.getMessages(filter, {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sort: { timestamp: -1 }  // Sort by newest first
      });

      // STANDARDIZED RESPONSE FORMAT:
      // Every paginated response follows this structure
      const response: PaginatedResponse<IMessage> = {
        data: messages.data,                    // The actual messages
        pagination: {
          page: messages.page,                  // Current page number
          limit: messages.limit,                // Items per page
          total: messages.total,                // Total number of messages
          pages: Math.ceil(messages.total / messages.limit), // Total pages
          hasNext: messages.page < Math.ceil(messages.total / messages.limit),
          hasPrev: messages.page > 1
        },
        meta: {
          requestId: req.id,       // Unique ID for request tracking
          timestamp: new Date(),   // When response was generated
          version: 'v1'           // API version used
        }
      };

      // HTTP STATUS CODES:
      // 200 = OK (successful GET request)
      res.status(200).json(response);
    } catch (error) {
      // ERROR HANDLING PATTERN:
      // Throw custom error that will be caught by error middleware
      throw new APIError('Failed to retrieve messages', 500, error);
    }
  }

  // POST /api/v1/messages - Send a new message
  // CONCEPT: Resource Creation
  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      // DESTRUCTURING ASSIGNMENT:
      // Extract specific properties from request body
      const { phoneNumber, message, messageType = 'text' } = req.body;

      // INPUT VALIDATION PATTERN:
      // Validate before processing to prevent bad data
      const validation = await this.validateMessageInput(req.body);
      if (!validation.isValid) {
        // HTTP 400 = Bad Request (client error)
        throw new APIError('Invalid input', 400, validation.errors);
      }

      // BUSINESS LOGIC DELEGATION:
      // Controller handles HTTP concerns, service handles business logic
      const result = await MessageService.sendMessage({
        phoneNumber,
        message,
        messageType,
        metadata: {
          source: 'api',           // How message was created
          requestId: req.id,       // For tracing/debugging
          timestamp: new Date()    // When request was made
        }
      });

      // RESOURCE CREATION RESPONSE:
      const response: APIResponse<MessageResult> = {
        success: true,
        data: result,
        meta: {
          requestId: req.id,
          timestamp: new Date(),
          version: 'v1'
        }
      };

      // HTTP STATUS CODES:
      // 201 = Created (successful POST request that created a resource)
      res.status(201).json(response);
    } catch (error) {
      throw new APIError('Failed to send message', 500, error);
    }
  }

  // GET /api/v1/messages/:id - Get specific message
  // CONCEPT: Single Resource Retrieval
  async getMessage(req: Request, res: Response): Promise<void> {
    try {
      // URL PARAMETERS:
      // :id in route becomes req.params.id
      const { id } = req.params;
      
      const message = await MessageService.getMessageById(id);
      
      // RESOURCE NOT FOUND HANDLING:
      if (!message) {
        // HTTP 404 = Not Found
        throw new APIError('Message not found', 404);
      }

      // AUTHORIZATION CHECK:
      // User can only access messages they have permission to see
      if (!this.canAccessMessage(req.user, message)) {
        // HTTP 403 = Forbidden (authenticated but not authorized)
        throw new APIError('Insufficient permissions', 403);
      }

      const response: APIResponse<IMessage> = {
        success: true,
        data: message,
        meta: {
          requestId: req.id,
          timestamp: new Date(),
          version: 'v1'
        }
      };

      res.status(200).json(response);
    } catch (error) {
      throw new APIError('Failed to retrieve message', 500, error);
    }
  }

  // PUT /api/v1/messages/:id - Update message (mark as read, etc.)
  // CONCEPT: Resource Update
  async updateMessage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      // PARTIAL UPDATE PATTERN:
      // PUT typically replaces entire resource, but here we do partial update
      // (PATCH would be more semantically correct for partial updates)
      const updatedMessage = await MessageService.updateMessage(id, updates);
      
      const response: APIResponse<IMessage> = {
        success: true,
        data: updatedMessage,
        meta: {
          requestId: req.id,
          timestamp: new Date(),
          version: 'v1'
        }
      };

      res.status(200).json(response);
    } catch (error) {
      throw new APIError('Failed to update message', 500, error);
    }
  }

  // DELETE /api/v1/messages/:id - Delete message
  // CONCEPT: Resource Deletion
  async deleteMessage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      await MessageService.deleteMessage(id);
      
      // HTTP STATUS CODES:
      // 204 = No Content (successful deletion, no response body needed)
      res.status(204).send();
    } catch (error) {
      throw new APIError('Failed to delete message', 500, error);
    }
  }
}
```

**🏗️ Architecture Patterns Used:**

**1. MVC (Model-View-Controller) Pattern:**
- **Model**: Data structures (IMessage interface, database schemas)
- **View**: JSON responses (what client sees)
- **Controller**: This class (handles HTTP requests/responses)

**2. Service Layer Pattern:**
- Controllers handle HTTP concerns (status codes, headers, validation)
- Services handle business logic (message processing, database operations)
- Clear separation of responsibilities

**3. Repository Pattern (in MessageService):**
- Abstracts database operations
- Makes code testable (can mock MessageService)
- Can switch databases without changing controller code

**📊 HTTP Status Code Strategy:**

| Code | Meaning | When I Use It |
|------|---------|---------------|
| 200 | OK | Successful GET, PUT requests |
| 201 | Created | Successful POST (resource created) |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing/invalid authentication |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |

**🔄 Request-Response Flow:**

1. **Client sends request** → `POST /api/v1/messages`
2. **Express routing** → Matches route to controller method
3. **Middleware chain** → authenticate → authorize → validate
4. **Controller method** → Extracts data, validates input
5. **Service layer** → Handles business logic
6. **Database operation** → Stores/retrieves data
7. **Response formatting** → Standardized JSON response
8. **HTTP response** → Status code + JSON body sent to client

**🎯 Response Standardization Theory:**
```typescript
// src/types/api.types.ts
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta: {
    requestId: string;
    timestamp: Date;
    version: string;
    duration?: number;
  };
}

interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// src/middleware/response.middleware.ts
class ResponseFormatter {
  static success<T>(
    data: T,
    meta: Partial<ResponseMeta> = {}
  ): APIResponse<T> {
    return {
      success: true,
      data,
      meta: {
        requestId: meta.requestId || generateRequestId(),
        timestamp: new Date(),
        version: meta.version || 'v1',
        duration: meta.duration
      }
    };
  }

  static error(
    message: string,
    code: string = 'INTERNAL_ERROR',
    details?: any,
    meta: Partial<ResponseMeta> = {}
  ): APIResponse<null> {
    return {
      success: false,
      error: {
        code,
        message,
        details
      },
      meta: {
        requestId: meta.requestId || generateRequestId(),
        timestamp: new Date(),
        version: meta.version || 'v1',
        duration: meta.duration
      }
    };
  }

  static paginated<T>(
    data: T[],
    pagination: PaginationInfo,
    meta: Partial<ResponseMeta> = {}
  ): PaginatedResponse<T> {
    return {
      success: true,
      data,
      pagination,
      meta: {
        requestId: meta.requestId || generateRequestId(),
        timestamp: new Date(),
        version: meta.version || 'v1',
        duration: meta.duration
      }
    };
  }
}
```

### **Q28: How did you implement webhook handling for real-time integrations?**

**Answer:**

**🎯 Webhook Concepts & Theory:**

**What are Webhooks?**
Webhooks are "reverse APIs" - instead of your application calling an external API, the external service calls your application when specific events occur. Think of them as "HTTP callbacks."

**Traditional API vs Webhooks:**

```
Traditional API (Polling):
Your App → [Request] → External Service
Your App ← [Response] ← External Service
(Repeats every X seconds to check for updates)

Webhook (Push):
External Service → [Event Notification] → Your App
(Only when something actually happens)
```

**Why Use Webhooks?**

1. **Real-time Updates**: Instant notifications when events occur
2. **Efficiency**: No need to constantly poll for changes
3. **Scalability**: Reduces server load and API calls
4. **Cost-effective**: Pay only for actual events, not polling requests
5. **Better UX**: Users see updates immediately

**Webhook Use Cases in WhatsApp Bot:**
- New message received
- Message delivered/read
- Contact status changes
- Connection status updates
- Error notifications

**🔧 Webhook Architecture Components:**

**1. Webhook Registration System:**
- Stores webhook URLs and configuration
- Validates webhook endpoints
- Manages subscriptions to different event types

**2. Event Detection & Publishing:**
- Monitors system for events (new messages, status changes)
- Publishes events to webhook delivery system
- Handles event filtering based on subscriptions

**3. Reliable Delivery System:**
- Queue-based delivery for reliability
- Retry mechanism with exponential backoff
- Dead letter queue for failed deliveries
- Delivery status tracking

**4. Security & Verification:**
- HMAC signature verification
- Webhook URL validation
- Rate limiting for webhook endpoints
- Timeout handling

**🛠️ Implementation Deep Dive:**

**Core Data Structures & Interfaces:**
```typescript
// src/webhooks/webhook.service.ts

// WEBHOOK CONFIGURATION INTERFACE:
// This defines all settings needed for a webhook endpoint
interface WebhookConfig {
  url: string;              // Where to send webhook calls
  events: string[];         // Which events this webhook subscribes to
  secret: string;           // Secret for HMAC signature verification
  retryAttempts: number;    // How many times to retry failed deliveries
  timeout: number;          // Timeout for webhook HTTP requests (milliseconds)
  active: boolean;          // Whether webhook is currently enabled
}

// WEBHOOK EVENT INTERFACE:
// Standardized format for all events that trigger webhooks
interface WebhookEvent {
  id: string;               // Unique identifier for this event
  type: string;             // Event type (e.g., 'message.received')
  data: any;                // Event-specific payload data
  timestamp: Date;          // When the event occurred
  source: string;           // What system/service generated this event
}

// WEBHOOK DELIVERY INTERFACE:
// Tracks the status and metadata of webhook delivery attempts
interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventId: string;
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  attempt: number;
  responseCode?: number;
  responseTime?: number;
  error?: string;
  createdAt: Date;
  deliveredAt?: Date;
}

class WebhookService {
  private webhooks: Map<string, WebhookConfig> = new Map();
  private queue: Queue;
  private deliveryAttempts: Map<string, number> = new Map();
  
  constructor() {
    // QUEUE SETUP EXPLANATION:
    // Using Redis-backed queue for reliable webhook delivery
    // Benefits: persistence, retry logic, monitoring, horizontal scaling
    this.queue = new Queue('webhook-delivery', {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: 3,                 // Try up to 3 times
        backoff: 'exponential',      // Wait longer between each retry: 1s, 2s, 4s
        removeOnComplete: 100,       // Keep last 100 successful jobs for monitoring
        removeOnFail: 50,           // Keep last 50 failed jobs for debugging
        delay: 0                     // Send immediately (no initial delay)
      }
    });
    
    this.setupWebhookProcessor();
  }
  
  // WEBHOOK REGISTRATION PROCESS:
  // This method handles subscribing a new endpoint to receive webhooks
  async registerWebhook(webhook: WebhookConfig): Promise<string> {
    const webhookId = crypto.randomUUID();
    
    // WEBHOOK VALIDATION CONCEPT:
    // Before registering, we verify the endpoint can receive webhooks
    // This prevents registering broken URLs that will constantly fail
    await this.validateWebhookEndpoint(webhook.url, webhook.secret);
    
    // WEBHOOK STORAGE PATTERN:
    // Store in both memory (for fast access) and database (for persistence)
    this.webhooks.set(webhookId, {
      ...webhook,
      active: true
    });
    
    // Persist to database for recovery after server restart
    await WebhookModel.create({
      webhookId,
      ...webhook,
      createdAt: new Date()
    });
    
    // Return unique ID for webhook management
    return webhookId;
  }
  
  // WEBHOOK ENDPOINT VALIDATION:
  // Verifies webhook URL can receive and properly handle webhook calls
  private async validateWebhookEndpoint(url: string, secret: string): Promise<void> {
    const testEvent: WebhookEvent = {
      id: 'test-' + crypto.randomUUID(),
      type: 'webhook.test',
      data: { message: 'This is a test webhook call' },
      timestamp: new Date(),
      source: 'webhook-validator'
    };
    
    try {
      const signature = this.generateSignature(testEvent, secret);
      
      // VALIDATION REQUEST EXPLANATION:
      // Send test webhook with proper headers and signature
      // Expect 200 response to confirm endpoint is working
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Test': 'true',        // Indicates this is a test call
          'User-Agent': 'WhatsApp-Bot-Webhook-Validator/1.0'
        },
        body: JSON.stringify(testEvent),
        signal: AbortSignal.timeout(10000)  // 10 second timeout for validation
      });
      
      if (!response.ok) {
        throw new Error(`Webhook validation failed: ${response.status} ${response.statusText}`);
      }
      
      // Optional: Check response body for specific validation confirmation
      const responseText = await response.text();
      if (responseText && !responseText.includes('webhook_validated')) {
        console.warn('Webhook endpoint may not be properly configured for validation');
      }
      
    } catch (error) {
      throw new Error(`Webhook endpoint validation failed: ${error.message}`);
    }
  }
  
  // EVENT DELIVERY ORCHESTRATION:
  // This is the main method that handles sending events to all subscribed webhooks
  async deliverWebhook(event: WebhookEvent): Promise<void> {
    // WEBHOOK FILTERING LOGIC:
    // Only send to webhooks that are:
    // 1. Active (not disabled)
    // 2. Subscribed to this specific event type
    const relevantWebhooks = Array.from(this.webhooks.values())
      .filter(webhook => 
        webhook.active && 
        webhook.events.includes(event.type)
      );
    
    // EVENT FANOUT PATTERN:
    // Send the same event to multiple webhooks simultaneously
    // Using Promise.allSettled() means we don't fail if one webhook fails
    const deliveryPromises = relevantWebhooks.map(webhook =>
      this.queue.add('deliver-webhook', {
        webhook,
        event,
        attempt: 1,
        enqueuedAt: new Date()
      }, {
        // JOB-SPECIFIC OPTIONS:
        priority: this.getEventPriority(event.type),  // High priority for critical events
        delay: 0,                                     // Send immediately
        removeOnComplete: 1000,                       // Keep more completed jobs for this event type
        attempts: webhook.retryAttempts || 3          // Use webhook-specific retry count
      })
    );
    
    // PARALLEL EXECUTION EXPLANATION:
    // allSettled() waits for all promises to complete (success or failure)
    // This ensures we don't lose any webhook deliveries due to individual failures
    const results = await Promise.allSettled(deliveryPromises);
    
    // LOG DELIVERY SUMMARY:
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`Event ${event.id} delivery summary: ${successful} successful, ${failed} failed`);
    
    // OPTIONAL: Store delivery statistics for analytics
    await this.recordDeliveryMetrics(event.id, successful, failed);
  }
  
  // EVENT PRIORITY SYSTEM:
  // Different event types have different urgency levels
  private getEventPriority(eventType: string): number {
    const priorityMap: Record<string, number> = {
      'message.received': 10,      // Highest priority - user expects immediate response
      'message.delivered': 8,      // High priority - delivery confirmations
      'error.occurred': 9,         // Critical - errors need immediate attention
      'contact.created': 5,        // Medium priority - not time critical
      'conversation.ended': 3,     // Low priority - analytics event
      'ai.response.generated': 7   // High priority - affects user experience
    };
    
    return priorityMap[eventType] || 1;  // Default to lowest priority
  }
  
  // WEBHOOK PROCESSING SETUP:
  // This sets up the background worker that actually sends webhook HTTP requests
  private setupWebhookProcessor(): void {
    // QUEUE PROCESSOR PATTERN:
    // This worker processes jobs from the webhook delivery queue
    // It handles the actual HTTP requests, retries, and error handling
    this.queue.process('deliver-webhook', async (job) => {
      const { webhook, event, attempt } = job.data;
      
      try {
        // DELIVERY TIMING:
        const startTime = Date.now();
        
        // ACTUAL WEBHOOK DELIVERY:
        await this.sendWebhook(webhook, event);
        
        const deliveryTime = Date.now() - startTime;
        
        // SUCCESS LOGGING:
        // Track successful deliveries for monitoring and analytics
        await this.logWebhookDelivery({
          webhookId: webhook.id,
          eventId: event.id,
          status: 'delivered',
          attempt,
          responseTime: deliveryTime,
          timestamp: new Date()
        });
        
        // PERFORMANCE MONITORING:
        // Track slow webhook endpoints for optimization
        if (deliveryTime > 5000) {  // 5 second threshold
          console.warn(`Slow webhook delivery: ${webhook.url} took ${deliveryTime}ms`);
          await this.flagSlowWebhook(webhook.id, deliveryTime);
        }
        
      } catch (error) {
        // FAILURE LOGGING:
        // Detailed error tracking for debugging and monitoring
        await this.logWebhookDelivery({
          webhookId: webhook.id,
          eventId: event.id,
          status: 'failed',
          attempt,
          error: error.message,
          errorCode: error.code,
          httpStatus: error.status,
          timestamp: new Date()
        });
        
        // RETRY LOGIC:
        // Determine whether to retry based on error type and attempt count
        if (attempt < webhook.retryAttempts) {
          if (this.isRetryableError(error)) {
            // EXPONENTIAL BACKOFF:
            // Wait longer between each retry: 1s, 4s, 16s
            const delay = Math.pow(2, attempt) * 1000;
            
            // Re-queue with increased attempt count and delay
            await this.queue.add('deliver-webhook', {
              webhook,
              event,
              attempt: attempt + 1
            }, {
              delay,
              attempts: 1  // Single attempt per job (we handle retries manually)
            });
            
            console.log(`Retrying webhook ${webhook.id} attempt ${attempt + 1} in ${delay}ms`);
          } else {
            // Non-retryable error (e.g., 400 Bad Request, invalid URL)
            await this.handleNonRetryableError(webhook, event, error);
          }
        } else {
          // MAX ATTEMPTS REACHED:
          // Move to dead letter queue and alert administrators
          await this.handleWebhookFailure(webhook, event, error);
        }
      }
    });
    
    // QUEUE EVENT HANDLERS:
    // Monitor queue health and performance
    this.queue.on('completed', (job) => {
      console.log(`Webhook delivery job ${job.id} completed successfully`);
    });
    
    this.queue.on('failed', (job, error) => {
      console.error(`Webhook delivery job ${job.id} failed:`, error.message);
    });
    
    this.queue.on('stalled', (job) => {
      console.warn(`Webhook delivery job ${job.id} stalled - worker may have crashed`);
    });
  }
  
  // ERROR CLASSIFICATION:
  // Determines whether an error should trigger a retry
  private isRetryableError(error: any): boolean {
    // NETWORK/TEMPORARY ERRORS (should retry):
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    const retryableErrorCodes = ['TIMEOUT', 'ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED'];
    
    // CLIENT ERRORS (should NOT retry):
    const nonRetryableStatusCodes = [400, 401, 403, 404, 405, 410];
    
    if (error.status) {
      return retryableStatusCodes.includes(error.status);
    }
    
    if (error.code) {
      return retryableErrorCodes.includes(error.code);
    }
    
    // Default to retryable for unknown errors
    return true;
  }
  
  // HTTP WEBHOOK DELIVERY:
  // This method handles the actual HTTP request to the webhook endpoint
  private async sendWebhook(webhook: WebhookConfig, event: WebhookEvent): Promise<void> {
    // PAYLOAD STANDARDIZATION:
    // All webhooks receive the same consistent payload format
    // This makes it easier for clients to handle different event types
    const payload = {
      id: event.id,                           // Unique event identifier
      type: event.type,                       // Event type (e.g., 'message.received')
      data: event.data,                       // Event-specific data
      timestamp: event.timestamp.toISOString(), // ISO 8601 timestamp
      source: event.source                    // System that generated the event
    };
    
    // SECURITY: HMAC SIGNATURE GENERATION:
    // Create cryptographic signature to verify webhook authenticity
    // Recipient can verify this signature to ensure webhook came from us
    const signature = this.generateSignature(payload, webhook.secret);
    
    // HTTP REQUEST CONFIGURATION:
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        // CONTENT TYPE:
        'Content-Type': 'application/json',
        
        // SECURITY HEADERS:
        'X-Webhook-Signature': signature,         // HMAC signature for verification
        'X-Webhook-ID': event.id,                // Event ID for deduplication
        'X-Webhook-Timestamp': event.timestamp.toISOString(), // Timestamp for replay attack prevention
        
        // IDENTIFICATION:
        'User-Agent': 'WhatsApp-Bot-Webhook/1.0', // Identifies our webhook system
        
        // OPTIONAL HEADERS:
        'X-Webhook-Delivery-ID': crypto.randomUUID(), // Unique delivery attempt ID
        'X-Webhook-Event-Type': event.type,      // Event type in header for easy filtering
        'X-Webhook-Source': event.source         // Source system identifier
      },
      body: JSON.stringify(payload),
      
      // TIMEOUT CONFIGURATION:
      // Prevent hanging requests that could block the queue
      signal: AbortSignal.timeout(webhook.timeout || 30000) // Default 30 second timeout
    });
    
    // RESPONSE VALIDATION:
    // Check if webhook endpoint accepted the request
    if (!response.ok) {
      // DETAILED ERROR INFORMATION:
      const errorBody = await response.text().catch(() => 'No response body');
      
      const error = new WebhookDeliveryError(
        `Webhook delivery failed: ${response.status} ${response.statusText}`,
        {
          status: response.status,
          statusText: response.statusText,
          responseBody: errorBody,
          webhookUrl: webhook.url,
          eventId: event.id,
          headers: Object.fromEntries(response.headers.entries())
        }
      );
      
      throw error;
    }
    
    // SUCCESS VALIDATION:
    // Optionally validate response body for webhook acknowledgment
    const responseBody = await response.text().catch(() => '');
    
    // Log response details for debugging
    console.log(`Webhook delivered successfully to ${webhook.url}: ${response.status}`);
    
    // OPTIONAL: Parse response for webhook-specific acknowledgments
    if (responseBody) {
      try {
        const parsedResponse = JSON.parse(responseBody);
        if (parsedResponse.webhookReceived) {
          // Webhook endpoint confirmed receipt
          console.log('Webhook receipt confirmed by endpoint');
        }
      } catch (e) {
        // Non-JSON response is acceptable
      }
    }
  }
  
  // SIGNATURE GENERATION:
  // Creates HMAC-SHA256 signature for webhook security
  private generateSignature(payload: any, secret: string): string {
    // HMAC PROCESS EXPLANATION:
    // 1. Convert payload to consistent string representation
    // 2. Create HMAC using SHA-256 and the shared secret
    // 3. Output as hexadecimal string
    
    const data = JSON.stringify(payload);
    
    // CRYPTO PROCESS:
    // HMAC (Hash-based Message Authentication Code) ensures:
    // - Message integrity (data hasn't been tampered with)
    // - Authentication (message came from holder of secret)
    return crypto
      .createHmac('sha256', secret)           // Create HMAC with SHA-256
      .update(data)                          // Add payload data
      .digest('hex');                        // Output as hex string
  }
  
  // SIGNATURE VERIFICATION:
  // Verifies incoming webhook signatures (for receiving webhooks from other services)
  async verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): Promise<boolean> {
    // SECURITY: TIMING-SAFE COMPARISON:
    // Use crypto.timingSafeEqual to prevent timing attacks
    // Regular string comparison could leak information about the secret
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    // TIMING ATTACK PREVENTION:
    // timingSafeEqual takes constant time regardless of where strings differ
    // This prevents attackers from using response time to guess the signature
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }
}

// Webhook event types
enum WebhookEventType {
  MESSAGE_RECEIVED = 'message.received',
  MESSAGE_SENT = 'message.sent',
  MESSAGE_DELIVERED = 'message.delivered',
  MESSAGE_READ = 'message.read',
  CONTACT_CREATED = 'contact.created',
  CONTACT_UPDATED = 'contact.updated',
  CONVERSATION_STARTED = 'conversation.started',
  CONVERSATION_ENDED = 'conversation.ended',
  AI_RESPONSE_GENERATED = 'ai.response.generated',
  ERROR_OCCURRED = 'error.occurred'
}

// Webhook endpoints
router.post('/webhooks/whatsapp', async (req, res) => {
  try {
    const signature = req.headers['x-webhook-signature'] as string;
    const payload = JSON.stringify(req.body);
    
    // Verify signature
    const isValid = await WebhookService.verifyWebhookSignature(
      payload,
      signature,
      process.env.WHATSAPP_WEBHOOK_SECRET!
    );
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Process webhook
    await WhatsAppWebhookHandler.process(req.body);
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});
```

### **Q29: How did you implement API rate limiting and throttling?**

**Answer:**

**🎯 Rate Limiting Concepts & Theory:**

**What is Rate Limiting?**
Rate limiting is a technique for controlling the rate at which clients can make requests to an API. It prevents abuse, ensures fair usage, and protects server resources from being overwhelmed.

**Why Rate Limiting is Essential:**

1. **Prevent DoS Attacks**: Stops malicious users from overwhelming your server
2. **Fair Resource Allocation**: Ensures all users get reasonable access
3. **Cost Control**: Prevents expensive operations from being called excessively
4. **Quality of Service**: Maintains performance for all users
5. **Business Model Protection**: Enforces API usage limits for different pricing tiers

**Rate Limiting Algorithms:**

1. **Fixed Window**: Count requests in fixed time windows (e.g., 100 requests per minute)
   - Simple to implement
   - Can have burst issues at window boundaries

2. **Sliding Window**: Count requests in a moving time window
   - More accurate than fixed window
   - Prevents burst issues
   - More complex to implement

3. **Token Bucket**: Bucket fills with tokens at fixed rate, requests consume tokens
   - Allows bursts up to bucket size
   - Self-regulating
   - Good for variable request patterns

4. **Leaky Bucket**: Requests queued and processed at steady rate
   - Smooths out bursts
   - Can introduce latency
   - Good for protecting downstream services

**My Implementation Strategy:**
I chose a **Sliding Window** approach with **Redis** for distributed rate limiting across multiple server instances.

**🔧 Implementation Deep Dive:**

**Core Data Structures & Configuration:**
```typescript
// src/middleware/rateLimit.middleware.ts

// RATE LIMIT CONFIGURATION INTERFACE:
// Defines all parameters for different rate limiting policies
interface RateLimitConfig {
  windowMs: number;                    // Time window in milliseconds
  maxRequests: number;                 // Maximum requests allowed in window
  keyGenerator?: (req: Request) => string; // How to identify unique clients
  skipSuccessfulRequests?: boolean;    // Whether to count successful requests
  skipFailedRequests?: boolean;        // Whether to count failed requests
  message?: string;                    // Custom error message
  headers?: boolean;                   // Whether to include rate limit headers
  bypassTokens?: string[];            // Tokens that bypass rate limiting
  costFunction?: (req: Request) => number; // Custom cost calculation per request
}

// RATE LIMIT STATUS INTERFACE:
// Tracks current state of rate limiting for a client
interface RateLimitInfo {
  remaining: number;       // Requests remaining in current window
  resetTime: Date;         // When the rate limit window resets
  totalRequests: number;   // Total requests made in current window
  windowStart: Date;       // When current window started
  retryAfter?: number;     // Seconds to wait before next request (when limited)
}

// RATE LIMITING METRICS INTERFACE:
// For monitoring and analytics
interface RateLimitMetrics {
  endpoint: string;
  clientId: string;
  requestsInWindow: number;
  limitExceeded: boolean;
  timestamp: Date;
  responseTime: number;
}

class AdvancedRateLimiter {
  private redis: Redis;
  private configs: Map<string, RateLimitConfig> = new Map();
  private metrics: RateLimitMetrics[] = [];
  
  constructor() {
    // REDIS CONNECTION SETUP:
    // Redis provides distributed storage for rate limiting across multiple servers
    // Benefits: atomic operations, expiration, persistence, clustering support
    this.redis = new Redis(process.env.REDIS_URL, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });
    
    this.setupDefaultConfigs();
    this.setupMetricsCollection();
  }
  
  // CONFIGURATION SETUP:
  // Pre-define rate limiting policies for different endpoint types
  private setupDefaultConfigs(): void {
    // GENERAL API ENDPOINTS:
    // Moderate limits for regular API usage
    this.configs.set('api', {
      windowMs: 60 * 1000,         // 1 minute window
      maxRequests: 100,            // 100 requests per minute
      keyGenerator: (req) => `api:${this.getClientId(req)}`,
      message: 'Too many API requests, please try again later',
      headers: true,               // Include rate limit headers in response
      costFunction: (req) => req.method === 'GET' ? 1 : 2  // POST/PUT cost more
    });
    
    // WEBHOOK ENDPOINTS:
    // Higher limits since webhooks are automated
    this.configs.set('webhook', {
      windowMs: 60 * 1000,         // 1 minute window
      maxRequests: 1000,           // 1000 requests per minute
      keyGenerator: (req) => `webhook:${this.getClientId(req)}`,
      skipSuccessfulRequests: true, // Only count failed webhooks
      message: 'Webhook rate limit exceeded'
    });
    
    // AUTHENTICATION ENDPOINTS:
    // Very strict limits to prevent brute force attacks
    this.configs.set('auth', {
      windowMs: 15 * 60 * 1000,    // 15 minute window
      maxRequests: 5,              // Only 5 attempts per 15 minutes
      keyGenerator: (req) => `auth:${req.ip}:${req.body?.username || 'unknown'}`,
      message: 'Too many authentication attempts. Please try again later.',
      bypassTokens: ['emergency-admin-token'] // Emergency bypass
    });
    
    // AI/ML ENDPOINTS:
    // Conservative limits due to computational cost
    this.configs.set('ai', {
      windowMs: 60 * 1000,         // 1 minute window
      maxRequests: 20,             // 20 AI requests per minute
      keyGenerator: (req) => `ai:${this.getClientId(req)}`,
      message: 'AI request limit exceeded. Upgrade your plan for higher limits.',
      costFunction: (req) => {
        // Different AI operations have different costs
        const operation = req.body?.operation || 'default';
        const costMap: Record<string, number> = {
          'text-generation': 3,
          'image-analysis': 5,
          'sentiment-analysis': 1,
          'translation': 2,
          'default': 1
        };
        return costMap[operation] || 1;
      }
    });
    
    // ADMIN ENDPOINTS:
    // Moderate limits for administrative operations
    this.configs.set('admin', {
      windowMs: 60 * 1000,         // 1 minute window
      maxRequests: 50,             // 50 admin requests per minute
      keyGenerator: (req) => `admin:${req.user?.id || req.ip}`,
      message: 'Admin rate limit exceeded'
    });
  }
  
  createRateLimitMiddleware(configName: string): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const config = this.configs.get(configName);
        if (!config) {
          return next();
        }
        
        const key = config.keyGenerator!(req);
        const rateLimitInfo = await this.checkRateLimit(key, config);
        
        // Add rate limit headers
        if (config.headers !== false) {
          res.set({
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
            'X-RateLimit-Reset': rateLimitInfo.resetTime.toISOString(),
            'X-RateLimit-Window': config.windowMs.toString()
          });
        }
        
        if (rateLimitInfo.remaining < 0) {
          // Rate limit exceeded
          const retryAfter = Math.ceil((rateLimitInfo.resetTime.getTime() - Date.now()) / 1000);
          
          res.set('Retry-After', retryAfter.toString());
          
          // Log rate limit violation
          await this.logRateLimitViolation(req, config, rateLimitInfo);
          
          return res.status(429).json({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: config.message || 'Rate limit exceeded',
              details: {
                limit: config.maxRequests,
                windowMs: config.windowMs,
                retryAfter
              }
            }
          });
        }
        
        next();
      } catch (error) {
        console.error('Rate limiting error:', error);
        next(); // Continue on error to avoid blocking requests
      }
    };
  }
  
  private async checkRateLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitInfo> {
    const now = Date.now();
    const window = Math.floor(now / config.windowMs);
    const redisKey = `ratelimit:${key}:${window}`;
    
    // Use Redis pipeline for atomic operations
    const pipeline = this.redis.pipeline();
    pipeline.incr(redisKey);
    pipeline.expire(redisKey, Math.ceil(config.windowMs / 1000));
    
    const results = await pipeline.exec();
    const currentCount = results![0][1] as number;
    
    const remaining = config.maxRequests - currentCount;
    const resetTime = new Date((window + 1) * config.windowMs);
    
    return {
      remaining,
      resetTime,
      totalRequests: currentCount
    };
  }
  
  // Adaptive rate limiting based on system load
  async getAdaptiveLimit(baseLimit: number): Promise<number> {
    const systemMetrics = await this.getSystemMetrics();
    
    // Reduce limits under high load
    if (systemMetrics.cpuUsage > 80) {
      return Math.floor(baseLimit * 0.5);
    } else if (systemMetrics.cpuUsage > 60) {
      return Math.floor(baseLimit * 0.7);
    } else if (systemMetrics.memoryUsage > 85) {
      return Math.floor(baseLimit * 0.6);
    }
    
    return baseLimit;
  }
  
  // Premium user rate limiting
  async createPremiumRateLimit(userId: string): Promise<RateLimitConfig> {
    const user = await UserService.getUserById(userId);
    
    const multiplier = user.plan === 'premium' ? 5 : 
                     user.plan === 'pro' ? 3 : 1;
    
    return {
      windowMs: 60 * 1000,
      maxRequests: 100 * multiplier,
      keyGenerator: () => `premium:${userId}`,
      message: 'Rate limit exceeded for your plan'
    };
  }
}
```

This comprehensive API design covers RESTful principles, proper HTTP methods, response standardization, webhook infrastructure, and sophisticated rate limiting - all essential for a production-grade API that can scale and integrate with external systems.
