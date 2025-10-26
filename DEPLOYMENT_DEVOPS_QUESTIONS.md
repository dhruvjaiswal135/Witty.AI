# 🚀 Deployment & DevOps Questions

## ☁️ Deployment Strategy

### **Q25: How would you deploy this WhatsApp bot to production?**

**Answer:**

**Multi-Environment Deployment Pipeline:**
```yaml
# docker-compose.production.yml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.production
    image: whatsapp-bot:${VERSION}
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3000
      - MONGODB_URI=${MONGODB_URI}
      - REDIS_URL=${REDIS_URL}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - LOG_LEVEL=info
    volumes:
      - ./logs:/app/logs
      - whatsapp-sessions:/app/.wwebjs_auth
    ports:
      - "3000:3000"
    depends_on:
      - mongodb
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s

  mongodb:
    image: mongo:6.0
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
      MONGO_INITDB_DATABASE: whatsapp_bot
    volumes:
      - mongodb_data:/data/db
      - ./mongodb/init:/docker-entrypoint-initdb.d
    ports:
      - "27017:27017"

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - app

volumes:
  mongodb_data:
  redis_data:
  whatsapp-sessions:

# Dockerfile.production
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .
RUN npm run build

FROM node:18-alpine AS runner

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache chromium

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

# Set Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node dist/healthcheck.js

CMD ["node", "dist/index.js"]
```

**Kubernetes Deployment:**
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: whatsapp-bot
  labels:
    name: whatsapp-bot

---
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: whatsapp-bot
  namespace: whatsapp-bot
  labels:
    app: whatsapp-bot
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: whatsapp-bot
  template:
    metadata:
      labels:
        app: whatsapp-bot
    spec:
      containers:
      - name: whatsapp-bot
        image: whatsapp-bot:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: whatsapp-bot-secrets
              key: mongodb-uri
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: whatsapp-bot-secrets
              key: redis-url
        - name: GEMINI_API_KEY
          valueFrom:
            secretKeyRef:
              name: whatsapp-bot-secrets
              key: gemini-api-key
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        volumeMounts:
        - name: whatsapp-sessions
          mountPath: /app/.wwebjs_auth
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: whatsapp-sessions
        persistentVolumeClaim:
          claimName: whatsapp-sessions-pvc
      - name: logs
        persistentVolumeClaim:
          claimName: logs-pvc
      imagePullSecrets:
      - name: registry-secret

---
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: whatsapp-bot-service
  namespace: whatsapp-bot
spec:
  selector:
    app: whatsapp-bot
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP

---
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: whatsapp-bot-ingress
  namespace: whatsapp-bot
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - api.yourbot.com
    secretName: whatsapp-bot-tls
  rules:
  - host: api.yourbot.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: whatsapp-bot-service
            port:
              number: 80
```

**CI/CD Pipeline (GitHub Actions):**
```yaml
# .github/workflows/deploy.yml
name: Deploy WhatsApp Bot

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:6.0
        ports:
          - 27017:27017
        options: >-
          --health-cmd mongosh
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint
    
    - name: Run type checking
      run: npm run type-check
    
    - name: Run unit tests
      run: npm run test:unit
      env:
        NODE_ENV: test
        MONGODB_URI: mongodb://localhost:27017/test
        REDIS_URL: redis://localhost:6379
    
    - name: Run integration tests
      run: npm run test:integration
      env:
        NODE_ENV: test
        MONGODB_URI: mongodb://localhost:27017/test
        REDIS_URL: redis://localhost:6379
    
    - name: Generate coverage report
      run: npm run test:coverage
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3

  security:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run security audit
      run: npm audit --audit-level high
    
    - name: Run Snyk security scan
      uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
    
    - name: Run OWASP dependency check
      run: |
        wget https://github.com/jeremylong/DependencyCheck/releases/download/v8.4.0/dependency-check-8.4.0-release.zip
        unzip dependency-check-8.4.0-release.zip
        ./dependency-check/bin/dependency-check.sh --project "WhatsApp Bot" --scan . --format JSON --out dependency-check-report.json

  build:
    needs: [test, security]
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
    - name: Checkout repository
      uses: actions/checkout@v3

    - name: Setup Docker Buildx
      uses: docker/setup-buildx-action@v2

    - name: Log in to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v4
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha,prefix={{branch}}-
          type=raw,value=latest,enable={{is_default_branch}}

    - name: Build and push Docker image
      uses: docker/build-push-action@v4
      with:
        context: .
        file: ./Dockerfile.production
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    environment: staging

    steps:
    - name: Deploy to staging
      uses: azure/k8s-deploy@v1
      with:
        manifests: |
          k8s/namespace.yaml
          k8s/deployment.yaml
          k8s/service.yaml
          k8s/ingress.yaml
        images: |
          ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
        kubeconfig: ${{ secrets.KUBE_CONFIG_STAGING }}

  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production

    steps:
    - name: Deploy to production
      uses: azure/k8s-deploy@v1
      with:
        manifests: |
          k8s/namespace.yaml
          k8s/deployment.yaml
          k8s/service.yaml
          k8s/ingress.yaml
        images: |
          ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
        kubeconfig: ${{ secrets.KUBE_CONFIG_PRODUCTION }}
    
    - name: Run smoke tests
      run: |
        curl -f https://api.yourbot.com/health || exit 1
        curl -f https://api.yourbot.com/metrics || exit 1
```

### **Q26: How would you implement monitoring and alerting for production?**

**Answer:**

**Production Monitoring Stack:**
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alerts.yml"

scrape_configs:
  - job_name: 'whatsapp-bot'
    static_configs:
      - targets: ['whatsapp-bot:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'mongodb'
    static_configs:
      - targets: ['mongodb-exporter:9216']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

alertmanager_configs:
  - static_configs:
      - targets: ['alertmanager:9093']

# monitoring/alerts.yml
groups:
  - name: whatsapp_bot_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(whatsapp_messages_processed_total{status="error"}[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate in WhatsApp bot"
          description: "Error rate is {{ $value }} errors per second"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(whatsapp_response_duration_seconds_bucket[5m])) > 5
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "High response time"
          description: "95th percentile response time is {{ $value }} seconds"

      - alert: AIServiceDown
        expr: up{job="whatsapp-bot"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "WhatsApp bot service is down"
          description: "The WhatsApp bot service has been down for more than 1 minute"

      - alert: DatabaseConnectionFailed
        expr: mongodb_connections{state="current"} == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "Database connection failed"
          description: "No active connections to MongoDB"

      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes / 1024 / 1024 > 400
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value }}MB"

      - alert: MessageQueueBacklog
        expr: message_queue_depth > 100
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Message queue backlog"
          description: "Message queue has {{ $value }} pending messages"

# monitoring/grafana-dashboard.json
{
  "dashboard": {
    "title": "WhatsApp Bot Monitoring",
    "panels": [
      {
        "title": "Message Processing Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(whatsapp_messages_processed_total[5m])",
            "legendFormat": "{{direction}} - {{status}}"
          }
        ]
      },
      {
        "title": "Response Time Distribution",
        "type": "heatmap",
        "targets": [
          {
            "expr": "rate(whatsapp_response_duration_seconds_bucket[5m])",
            "legendFormat": "{{le}}"
          }
        ]
      },
      {
        "title": "AI Token Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(ai_tokens_used_total[5m])",
            "legendFormat": "{{type}}"
          }
        ]
      },
      {
        "title": "Active Conversations",
        "type": "stat",
        "targets": [
          {
            "expr": "active_conversations_count",
            "legendFormat": "Active"
          }
        ]
      }
    ]
  }
}
```

**Application Health Monitoring:**
```typescript
// src/monitoring/health.service.ts
interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  details?: any;
  duration?: number;
}

class HealthService {
  private checks: Map<string, () => Promise<HealthCheck>> = new Map();
  
  constructor() {
    this.registerHealthChecks();
  }
  
  private registerHealthChecks(): void {
    this.checks.set('database', this.checkDatabase.bind(this));
    this.checks.set('redis', this.checkRedis.bind(this));
    this.checks.set('whatsapp', this.checkWhatsApp.bind(this));
    this.checks.set('ai_service', this.checkAIService.bind(this));
    this.checks.set('memory', this.checkMemory.bind(this));
    this.checks.set('disk', this.checkDisk.bind(this));
  }
  
  async performHealthCheck(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    checks: HealthCheck[];
    timestamp: Date;
  }> {
    const results: HealthCheck[] = [];
    
    for (const [name, checkFn] of this.checks) {
      const startTime = Date.now();
      try {
        const result = await Promise.race([
          checkFn(),
          new Promise<HealthCheck>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 5000)
          )
        ]);
        
        result.duration = Date.now() - startTime;
        results.push(result);
      } catch (error) {
        results.push({
          name,
          status: 'unhealthy',
          details: { error: error.message },
          duration: Date.now() - startTime
        });
      }
    }
    
    const overallStatus = this.calculateOverallStatus(results);
    
    return {
      status: overallStatus,
      checks: results,
      timestamp: new Date()
    };
  }
  
  private async checkDatabase(): Promise<HealthCheck> {
    try {
      const startTime = Date.now();
      await mongoose.connection.db.admin().ping();
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'database',
        status: responseTime < 100 ? 'healthy' : 'degraded',
        details: {
          responseTime,
          connections: mongoose.connection.readyState,
          database: mongoose.connection.name
        }
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        details: { error: error.message }
      };
    }
  }
  
  private async checkAIService(): Promise<HealthCheck> {
    try {
      const startTime = Date.now();
      const response = await GeminiService.generateResponse(
        'Health check',
        {},
        10
      );
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'ai_service',
        status: responseTime < 2000 ? 'healthy' : 'degraded',
        details: {
          responseTime,
          tokensUsed: response.usage?.totalTokens || 0
        }
      };
    } catch (error) {
      return {
        name: 'ai_service',
        status: 'unhealthy',
        details: { error: error.message }
      };
    }
  }
}

// src/monitoring/alerts.service.ts
class AlertService {
  private webhooks = {
    slack: process.env.SLACK_WEBHOOK_URL,
    pagerduty: process.env.PAGERDUTY_INTEGRATION_KEY,
    email: process.env.SMTP_ENDPOINT
  };
  
  async sendAlert(alert: Alert): Promise<void> {
    const promises = [];
    
    if (alert.severity === 'critical') {
      promises.push(this.sendSlackAlert(alert));
      promises.push(this.sendPagerDutyAlert(alert));
      promises.push(this.sendEmailAlert(alert));
    } else if (alert.severity === 'warning') {
      promises.push(this.sendSlackAlert(alert));
    }
    
    await Promise.allSettled(promises);
  }
  
  private async sendSlackAlert(alert: Alert): Promise<void> {
    const payload = {
      text: `🚨 ${alert.title}`,
      attachments: [
        {
          color: alert.severity === 'critical' ? 'danger' : 'warning',
          fields: [
            {
              title: 'Service',
              value: alert.service,
              short: true
            },
            {
              title: 'Severity',
              value: alert.severity,
              short: true
            },
            {
              title: 'Description',
              value: alert.description
            },
            {
              title: 'Time',
              value: alert.timestamp.toISOString(),
              short: true
            }
          ]
        }
      ]
    };
    
    await fetch(this.webhooks.slack, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }
}
```

This comprehensive deployment and monitoring strategy provides production-ready infrastructure with automated CI/CD, container orchestration, comprehensive monitoring, and intelligent alerting - essential for maintaining a reliable WhatsApp bot service in production.
