# 🛡️ Security & Authentication Questions

## 🔐 Security Implementation

### **Q20: How did you implement security measures in your WhatsApp bot?**

**Answer:**

**Multi-layered Security Architecture:**
```typescript
// 1. Rate Limiting Implementation
class AdvancedRateLimiter {
  private redis: Redis;
  private rules: RateLimitRule[] = [
    { window: 60, maxRequests: 30, name: 'per_minute' },      // 30 req/min
    { window: 3600, maxRequests: 500, name: 'per_hour' },     // 500 req/hour
    { window: 86400, maxRequests: 5000, name: 'per_day' }     // 5000 req/day
  ];
  
  async checkRateLimit(identifier: string): Promise<RateLimitResult> {
    const results = await Promise.all(
      this.rules.map(rule => this.checkSingleRule(identifier, rule))
    );
    
    const violated = results.find(result => !result.allowed);
    
    if (violated) {
      // Log security event
      await this.logSecurityEvent('rate_limit_exceeded', {
        identifier,
        rule: violated.rule,
        currentCount: violated.currentCount,
        timestamp: new Date()
      });
      
      return {
        allowed: false,
        rule: violated.rule,
        retryAfter: violated.retryAfter,
        currentCount: violated.currentCount
      };
    }
    
    return { allowed: true };
  }
  
  private async checkSingleRule(identifier: string, rule: RateLimitRule): Promise<RateLimitResult> {
    const key = `ratelimit:${identifier}:${rule.name}`;
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, rule.window);
    }
    
    return {
      allowed: current <= rule.maxRequests,
      rule: rule.name,
      currentCount: current,
      retryAfter: current > rule.maxRequests ? await this.redis.ttl(key) : undefined
    };
  }
}

// 2. Input Validation & Sanitization
class MessageValidator {
  private readonly maxMessageLength = 4000;
  private readonly prohibitedPatterns = [
    /script\s*:/i,                    // Script injection
    /<\s*script/i,                    // HTML script tags
    /javascript\s*:/i,                // JavaScript protocol
    /on\w+\s*=/i,                     // Event handlers
    /eval\s*\(/i,                     // eval() function
    /document\s*\./i,                 // DOM manipulation
    /window\s*\./i,                   // Window object access
    /\${.*}/,                         // Template literal injection
    /\[object\s+Object\]/i            // Object toString attempts
  ];
  
  async validateMessage(message: string, contact: IContact): Promise<ValidationResult> {
    const results: ValidationResult = {
      isValid: true,
      errors: [],
      sanitizedMessage: message,
      securityLevel: 'low'
    };
    
    // Length validation
    if (message.length > this.maxMessageLength) {
      results.isValid = false;
      results.errors.push('Message exceeds maximum length');
      results.securityLevel = 'medium';
    }
    
    // Pattern-based validation
    for (const pattern of this.prohibitedPatterns) {
      if (pattern.test(message)) {
        results.isValid = false;
        results.errors.push('Prohibited pattern detected');
        results.securityLevel = 'high';
        
        // Log security incident
        await this.logSecurityIncident('prohibited_pattern', {
          contactId: contact._id,
          pattern: pattern.source,
          message: message.substring(0, 100), // Log first 100 chars
          timestamp: new Date()
        });
      }
    }
    
    // Content sanitization
    if (results.isValid) {
      results.sanitizedMessage = this.sanitizeMessage(message);
    }
    
    return results;
  }
  
  private sanitizeMessage(message: string): string {
    return message
      .replace(/<[^>]*>/g, '')          // Remove HTML tags
      .replace(/javascript:/gi, '')      // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '')       // Remove event handlers
      .trim();
  }
}

// 3. Contact Authentication & Authorization
class ContactAuthenticator {
  async authenticateContact(phoneNumber: string, additionalData?: any): Promise<AuthResult> {
    try {
      // 1. Verify phone number format
      if (!this.isValidPhoneNumber(phoneNumber)) {
        return { authenticated: false, reason: 'invalid_phone_format' };
      }
      
      // 2. Check against blacklist
      const isBlacklisted = await this.checkBlacklist(phoneNumber);
      if (isBlacklisted) {
        await this.logSecurityEvent('blacklisted_contact_attempt', { phoneNumber });
        return { authenticated: false, reason: 'blacklisted' };
      }
      
      // 3. Rate limit authentication attempts
      const rateLimitResult = await this.checkAuthenticationRateLimit(phoneNumber);
      if (!rateLimitResult.allowed) {
        return { authenticated: false, reason: 'rate_limited', retryAfter: rateLimitResult.retryAfter };
      }
      
      // 4. Verify contact exists or create new one
      let contact = await ContactService.findByPhoneNumber(phoneNumber);
      if (!contact) {
        contact = await this.createNewContact(phoneNumber, additionalData);
      }
      
      // 5. Generate secure session
      const session = await this.createSecureSession(contact);
      
      return {
        authenticated: true,
        contact,
        session,
        permissions: this.calculatePermissions(contact)
      };
      
    } catch (error) {
      console.error('Authentication error:', error);
      return { authenticated: false, reason: 'internal_error' };
    }
  }
  
  private async createSecureSession(contact: IContact): Promise<SecureSession> {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    const session: SecureSession = {
      sessionId,
      contactId: contact._id,
      createdAt: new Date(),
      expiresAt,
      permissions: this.calculatePermissions(contact),
      lastActivity: new Date(),
      ipAddress: undefined, // WhatsApp doesn't provide IP
      userAgent: 'WhatsApp Client'
    };
    
    // Store session in Redis
    await this.redis.setex(
      `session:${sessionId}`,
      24 * 60 * 60,
      JSON.stringify(session)
    );
    
    return session;
  }
}
```

**API Security & Encryption:**
```typescript
// 4. API Key Management
class SecureAPIKeyManager {
  private readonly encryptionKey: Buffer;
  
  constructor() {
    this.encryptionKey = crypto.scryptSync(
      process.env.MASTER_KEY!,
      process.env.SALT!,
      32
    );
  }
  
  async storeAPIKey(service: string, apiKey: string): Promise<void> {
    const encrypted = this.encrypt(apiKey);
    
    await APIKeyModel.create({
      service,
      encryptedKey: encrypted.encryptedData,
      iv: encrypted.iv,
      createdAt: new Date(),
      lastUsed: null,
      rotationSchedule: this.calculateRotationSchedule(service)
    });
  }
  
  async getAPIKey(service: string): Promise<string | null> {
    const record = await APIKeyModel.findOne({ service, isActive: true });
    if (!record) return null;
    
    const decrypted = this.decrypt(record.encryptedKey, record.iv);
    
    // Update last used timestamp
    await APIKeyModel.updateOne(
      { _id: record._id },
      { lastUsed: new Date() }
    );
    
    return decrypted;
  }
  
  private encrypt(text: string): { encryptedData: string; iv: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
    
    let encryptedData = cipher.update(text, 'utf8', 'hex');
    encryptedData += cipher.final('hex');
    
    return {
      encryptedData,
      iv: iv.toString('hex')
    };
  }
  
  private decrypt(encryptedData: string, iv: string): string {
    const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
    
    let decryptedData = decipher.update(encryptedData, 'hex', 'utf8');
    decryptedData += decipher.final('utf8');
    
    return decryptedData;
  }
}

// 5. Data Encryption at Rest
class DataEncryption {
  async encryptSensitiveData(data: any): Promise<EncryptedData> {
    const serialized = JSON.stringify(data);
    const compressed = await this.compress(serialized);
    const encrypted = this.encrypt(compressed);
    
    return {
      data: encrypted.encryptedData,
      iv: encrypted.iv,
      algorithm: 'aes-256-gcm',
      compressed: true,
      timestamp: new Date()
    };
  }
  
  async decryptSensitiveData(encryptedData: EncryptedData): Promise<any> {
    const decrypted = this.decrypt(encryptedData.data, encryptedData.iv);
    const decompressed = encryptedData.compressed 
      ? await this.decompress(decrypted) 
      : decrypted;
    
    return JSON.parse(decompressed);
  }
  
  private async compress(data: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      zlib.gzip(Buffer.from(data, 'utf8'), (err, compressed) => {
        if (err) reject(err);
        else resolve(compressed);
      });
    });
  }
}
```

### **Q21: How did you implement audit logging and security monitoring?**

**Answer:**

**Comprehensive Security Monitoring:**
```typescript
enum SecurityEventType {
  AUTHENTICATION_FAILURE = 'auth_failure',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_PATTERN = 'suspicious_pattern',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  DATA_ACCESS = 'data_access',
  CONFIGURATION_CHANGE = 'config_change',
  API_KEY_ROTATION = 'api_key_rotation',
  SECURITY_ALERT = 'security_alert'
}

interface SecurityEvent {
  eventId: string;
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  source: {
    component: string;
    function: string;
    version: string;
  };
  actor: {
    contactId?: string;
    phoneNumber?: string;
    sessionId?: string;
    ipAddress?: string;
  };
  resource: {
    type: string;
    id?: string;
    name?: string;
  };
  details: Record<string, any>;
  impact: {
    affected: string[];
    potential: string;
    mitigation: string;
  };
  investigation: {
    status: 'open' | 'investigating' | 'resolved' | 'false_positive';
    assignedTo?: string;
    notes: string[];
  };
}

class SecurityMonitor {
  private alertThresholds = {
    [SecurityEventType.AUTHENTICATION_FAILURE]: { count: 5, window: 300 },
    [SecurityEventType.RATE_LIMIT_EXCEEDED]: { count: 3, window: 600 },
    [SecurityEventType.SUSPICIOUS_PATTERN]: { count: 1, window: 60 },
  };
  
  async logSecurityEvent(
    type: SecurityEventType,
    severity: SecurityEvent['severity'],
    details: Partial<SecurityEvent>
  ): Promise<void> {
    const event: SecurityEvent = {
      eventId: crypto.randomUUID(),
      type,
      severity,
      timestamp: new Date(),
      source: {
        component: details.source?.component || 'whatsapp-bot',
        function: details.source?.function || 'unknown',
        version: process.env.APP_VERSION || '1.0.0'
      },
      actor: details.actor || {},
      resource: details.resource || { type: 'unknown' },
      details: details.details || {},
      impact: details.impact || {
        affected: [],
        potential: 'Unknown',
        mitigation: 'Under investigation'
      },
      investigation: {
        status: 'open',
        notes: []
      }
    };
    
    // Store the event
    await Promise.all([
      this.storeSecurityEvent(event),
      this.updateSecurityMetrics(event),
      this.checkAlertThresholds(event)
    ]);
    
    // Real-time notifications for critical events
    if (severity === 'critical') {
      await this.sendImmediateAlert(event);
    }
  }
  
  private async storeSecurityEvent(event: SecurityEvent): Promise<void> {
    // Store in multiple locations for redundancy
    await Promise.all([
      // Primary storage - MongoDB
      SecurityEventModel.create(event),
      
      // Real-time analytics - Redis Stream
      this.redis.xadd(
        'security_events',
        '*',
        'event', JSON.stringify(event)
      ),
      
      // Long-term storage - File system (for compliance)
      this.writeToSecurityLog(event)
    ]);
  }
  
  private async checkAlertThresholds(event: SecurityEvent): Promise<void> {
    const threshold = this.alertThresholds[event.type];
    if (!threshold) return;
    
    const recentEvents = await this.getRecentEvents(
      event.type,
      threshold.window,
      event.actor
    );
    
    if (recentEvents.length >= threshold.count) {
      await this.triggerSecurityAlert({
        type: 'threshold_exceeded',
        originalEvent: event,
        recentEvents,
        threshold
      });
    }
  }
  
  async generateSecurityReport(timeframe: 'daily' | 'weekly' | 'monthly'): Promise<SecurityReport> {
    const startDate = this.calculateStartDate(timeframe);
    const events = await SecurityEventModel.find({
      timestamp: { $gte: startDate }
    });
    
    return {
      timeframe,
      generatedAt: new Date(),
      summary: {
        totalEvents: events.length,
        eventsByType: this.groupEventsByType(events),
        eventsBySeverity: this.groupEventsBySeverity(events),
        topActors: this.getTopActors(events),
        trends: await this.calculateTrends(events, timeframe)
      },
      alerts: await this.getActiveAlerts(),
      recommendations: this.generateRecommendations(events),
      compliance: {
        dataRetention: await this.checkDataRetention(),
        accessControls: await this.auditAccessControls(),
        encryptionStatus: await this.verifyEncryption()
      }
    };
  }
}

// Automated Security Response System
class SecurityResponseSystem {
  async handleSecurityIncident(event: SecurityEvent): Promise<void> {
    const response = await this.determineResponse(event);
    
    for (const action of response.actions) {
      try {
        await this.executeSecurityAction(action, event);
        
        await this.logResponseAction({
          eventId: event.eventId,
          action: action.type,
          success: true,
          timestamp: new Date()
        });
      } catch (error) {
        console.error(`Failed to execute security action ${action.type}:`, error);
        
        await this.logResponseAction({
          eventId: event.eventId,
          action: action.type,
          success: false,
          error: error.message,
          timestamp: new Date()
        });
      }
    }
  }
  
  private async executeSecurityAction(action: SecurityAction, event: SecurityEvent): Promise<void> {
    switch (action.type) {
      case 'block_contact':
        await this.blockContact(event.actor.contactId!);
        break;
        
      case 'rate_limit_ip':
        await this.applyRateLimit(event.actor.ipAddress!, action.duration);
        break;
        
      case 'revoke_session':
        await this.revokeSession(event.actor.sessionId!);
        break;
        
      case 'alert_admin':
        await this.sendAdminAlert(event, action.details);
        break;
        
      case 'backup_logs':
        await this.createSecurityBackup(event.timestamp);
        break;
        
      default:
        throw new Error(`Unknown security action: ${action.type}`);
    }
  }
}
```

This security implementation provides comprehensive protection including rate limiting, input validation, authentication, encryption, audit logging, and automated incident response - essential for a production WhatsApp bot handling sensitive conversations.

### **Q22: How did you handle GDPR compliance and data privacy?**

**Answer:**

**GDPR Compliance Framework:**
```typescript
interface DataPrivacyConfig {
  dataRetentionPeriod: number; // days
  anonymizationThreshold: number; // days
  consentRequired: boolean;
  rightToBeForgotten: boolean;
  dataPortability: boolean;
  encryptionRequired: boolean;
}

class GDPRComplianceManager {
  private readonly config: DataPrivacyConfig = {
    dataRetentionPeriod: 365, // 1 year
    anonymizationThreshold: 30, // 30 days for inactive users
    consentRequired: true,
    rightToBeForgotten: true,
    dataPortability: true,
    encryptionRequired: true
  };
  
  async handleDataSubjectRequest(request: DataSubjectRequest): Promise<DataSubjectResponse> {
    const { type, contactId, requestDetails } = request;
    
    switch (type) {
      case 'access':
        return await this.handleAccessRequest(contactId);
      
      case 'portability':
        return await this.handlePortabilityRequest(contactId, requestDetails.format);
      
      case 'erasure':
        return await this.handleErasureRequest(contactId, requestDetails.reason);
      
      case 'rectification':
        return await this.handleRectificationRequest(contactId, requestDetails.corrections);
      
      case 'restriction':
        return await this.handleRestrictionRequest(contactId, requestDetails.reason);
      
      default:
        throw new Error(`Unsupported request type: ${type}`);
    }
  }
  
  private async handleErasureRequest(contactId: string, reason?: string): Promise<DataSubjectResponse> {
    // Log the erasure request
    await this.logDataProcessingActivity({
      activity: 'data_erasure_request',
      contactId,
      reason,
      timestamp: new Date(),
      legalBasis: 'subject_request'
    });
    
    // Create backup before deletion (for legal compliance)
    const dataSnapshot = await this.createDataSnapshot(contactId);
    await this.storeComplianceBackup(contactId, dataSnapshot, 'erasure_backup');
    
    // Perform erasure
    const erasureResult = await this.performDataErasure(contactId);
    
    // Verify erasure completion
    const verificationResult = await this.verifyDataErasure(contactId);
    
    return {
      requestId: crypto.randomUUID(),
      status: verificationResult.complete ? 'completed' : 'partially_completed',
      processedAt: new Date(),
      details: {
        recordsDeleted: erasureResult.deletedCount,
        backupCreated: true,
        verificationPassed: verificationResult.complete,
        retainedData: verificationResult.retainedData // Legal holds, etc.
      }
    };
  }
  
  private async performDataErasure(contactId: string): Promise<ErasureResult> {
    const deletionTasks = [
      // Personal data
      ContactModel.deleteOne({ _id: contactId }),
      
      // Message history
      MessageModel.deleteMany({ contactId }),
      
      // Context data
      ContextModel.deleteMany({ contactId }),
      
      // Session data
      this.redis.del(`session:*:${contactId}`),
      
      // Cache data
      this.redis.del(`contact:${contactId}`, `context:${contactId}*`),
      
      // Audit logs (anonymize rather than delete)
      this.anonymizeAuditLogs(contactId)
    ];
    
    const results = await Promise.allSettled(deletionTasks);
    
    return {
      deletedCount: results.filter(r => r.status === 'fulfilled').length,
      errors: results
        .filter(r => r.status === 'rejected')
        .map(r => (r as PromiseRejectedResult).reason)
    };
  }
}
```

This comprehensive security implementation covers all major aspects including authentication, authorization, input validation, encryption, audit logging, GDPR compliance, and automated security responses - all essential for a production-grade system handling sensitive data.
