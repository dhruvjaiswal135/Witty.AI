# 🏗️ AI WhatsApp Bot - Architecture Diagram

## 📊 System Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │    │                 │
│   WhatsApp      │    │   Node.js       │    │   Gemini AI     │    │   MongoDB       │
│   Client        │    │   Backend       │    │   Service       │    │   Database      │
│                 │    │                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔄 Detailed Message Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                             WhatsApp Ecosystem                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                          │
│  │  User's     │────▶│ WhatsApp    │────▶│ WhatsApp    │                          │
│  │  Phone      │     │ Servers     │     │ Web Client  │                          │
│  │             │◀────│             │◀────│ (Puppeteer) │                          │
│  └─────────────┘     └─────────────┘     └─────────────┘                          │
└─────────────────────────────────────────────────────┬───────────────────────────────┘
                                                        │
                                                        │ whatsapp-web.js
                                                        │ WebSocket Connection
                                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              Node.js Backend                                       │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                        Express.js Application                               │   │
│  │                                                                             │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │   │
│  │  │ Security    │  │ CORS        │  │ Rate        │  │ Body        │       │   │
│  │  │ Middleware  │─▶│ Middleware  │─▶│ Limiter     │─▶│ Parser      │       │   │
│  │  │ (Helmet)    │  │             │  │             │  │             │       │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                        │                                           │
│                                        ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                     WhatsApp Service Layer                                 │   │
│  │                                                                             │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                        │   │
│  │  │ WhatsApp    │  │ QR Code     │  │ Session     │                        │   │
│  │  │ Client      │  │ Generator   │  │ Manager     │                        │   │
│  │  │ (Puppeteer) │  │             │  │ (LocalAuth) │                        │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                        │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                        │                                           │
│                                        ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                    Message Processing Layer                                │   │
│  │                                                                             │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │   │
│  │  │ Message     │─▶│ Contact     │─▶│ Context     │─▶│ Thread      │       │   │
│  │  │ Processor   │  │ Service     │  │ Service     │  │ Service     │       │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                        │                                           │
│                                        ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                      Database Layer                                        │   │
│  │                                                                             │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                        │   │
│  │  │ Contact     │  │ Message     │  │ Context     │                        │   │
│  │  │ Service     │  │ Service     │  │ Service     │                        │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                        │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┬───────────────────────────────┘
                                                        │
                                                        │ HTTP API Calls
                                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           Google Gemini AI                                         │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                                │
│  │ Gemini      │  │ Context     │  │ Response    │                                │
│  │ 2.5 Flash   │  │ Processing  │  │ Generation  │                                │
│  │ Model       │  │             │  │             │                                │
│  └─────────────┘  └─────────────┘  └─────────────┘                                │
└─────────────────────────────────────────────────────┬───────────────────────────────┘
                                                        │
                                                        │ Persistent Storage
                                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                             MongoDB Database                                       │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │ Contacts    │  │ Messages    │  │ Contexts    │  │ Analytics   │               │
│  │ Collection  │  │ Collection  │  │ Collection  │  │ Data        │               │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘               │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## 🔀 Message Flow Sequence Diagram

```
User          WhatsApp       Node.js         Contact       Context       Thread        Gemini        MongoDB
 │              Client        Backend        Service       Service       Service        AI           Database
 │                │             │              │             │             │             │             │
 │──────────────▶│             │              │             │             │             │             │
 │  Send Message │             │              │             │             │             │             │
 │               │             │              │             │             │             │             │
 │               │──────────▶ │              │             │             │             │             │
 │               │ 'message'   │              │             │             │             │             │
 │               │ event       │              │             │             │             │             │
 │               │             │              │             │             │             │             │
 │               │             │─────────────▶│             │             │             │             │
 │               │             │ updateInteraction()        │             │             │             │
 │               │             │              │             │             │             │             │
 │               │             │              │────────────▶│             │             │             │
 │               │             │              │ getPersonalizedContext()   │             │             │
 │               │             │              │             │             │             │             │
 │               │             │              │             │─────────────▶│             │             │
 │               │             │              │             │ getFormattedContext()      │             │
 │               │             │              │             │             │             │             │
 │               │             │              │             │             │────────────▶│             │
 │               │             │              │             │             │ addMessage() │             │
 │               │             │              │             │             │             │             │
 │               │             │──────────────────────────────────────────────────────▶│             │
 │               │             │ generateResponse(message, context, history)           │             │
 │               │             │                                                       │             │
 │               │             │◀──────────────────────────────────────────────────────│             │
 │               │             │ { text, confidence, context }                        │             │
 │               │             │                                                       │             │
 │               │             │────────────────────────────────────────────────────────────────────▶│
 │               │             │ Store message (inbound + outbound)                                  │
 │               │             │                                                                      │
 │               │             │◀────────────────────────────────────────────────────────────────────│
 │               │             │ Message saved                                                       │
 │               │             │                                                                      │
 │               │◀───────────│                                                                      │
 │               │ AI Response │                                                                      │
 │               │             │                                                                      │
 │◀──────────────│             │                                                                      │
 │ AI Response   │             │                                                                      │
 │               │             │                                                                      │
```

## 📋 Detailed Component Breakdown

### 1. **WhatsApp Integration Layer**
```typescript
// File: src/app/services/whatsapp/index.ts
┌─────────────────────────────────────────┐
│           WhatsApp Service              │
├─────────────────────────────────────────┤
│ • Client Initialization                 │
│ • QR Code Generation                    │
│ • Session Management (LocalAuth)       │
│ • Message Event Handling               │
│ • Reconnection Logic                    │
│ • Status Management                     │
└─────────────────────────────────────────┘
```

### 2. **Message Processing Pipeline**
```typescript
// File: src/app/services/ai/message.processor.ts
┌─────────────────────────────────────────┐
│         Message Processor               │
├─────────────────────────────────────────┤
│ 1. Receive WhatsApp Message            │
│ 2. Store Inbound Message               │
│ 3. Update Contact Interaction          │
│ 4. Get Contact Information             │
│ 5. Retrieve/Build Context              │
│ 6. Add to Thread History               │
│ 7. Generate AI Response                │
│ 8. Store Outbound Message              │
│ 9. Send Response to WhatsApp           │
└─────────────────────────────────────────┘
```

### 3. **Context Management System**
```typescript
// File: src/app/services/ai/context.service.ts
┌─────────────────────────────────────────┐
│          Context Service                │
├─────────────────────────────────────────┤
│ • Personal Information                  │
│ • Organization Details                  │
│ • AI Instructions                       │
│ • Communication Preferences            │
│ • Context Formatting for AI            │
└─────────────────────────────────────────┘
```

### 4. **AI Integration Layer**
```typescript
// File: src/app/services/ai/gemini.service.ts
┌─────────────────────────────────────────┐
│           Gemini Service                │
├─────────────────────────────────────────┤
│ • API Key Management                    │
│ • Model Initialization                  │
│ • Prompt Building                       │
│ • Response Generation                   │
│ • Error Handling                        │
└─────────────────────────────────────────┘
```

### 5. **Database Layer**
```typescript
// Files: src/app/services/database/*.service.ts
┌─────────────────────────────────────────┐
│        Database Services                │
├─────────────────────────────────────────┤
│ • Contact Management                    │
│ • Message Storage                       │
│ • Context Persistence                   │
│ • Conversation History                  │
│ • Analytics Data                        │
└─────────────────────────────────────────┘
```

## 🚀 API Flow Architecture

```
┌─────────────────────────────────────────┐
│              REST API                   │
├─────────────────────────────────────────┤
│                                         │
│  GET  /v1/ai/processor/stats           │
│  POST /v1/ai/processor/message         │
│  GET  /v1/ai/context/:id               │
│  POST /v1/contacts                     │
│  GET  /v1/messages/:whatsappNumber     │
│                                         │
│  ┌─────────────┐  ┌─────────────┐      │
│  │ Controllers │─▶│ Services    │      │
│  │             │  │             │      │
│  │ • Context   │  │ • AI        │      │
│  │ • Processor │  │ • Database  │      │
│  │ • Contact   │  │ • WhatsApp  │      │
│  └─────────────┘  └─────────────┘      │
└─────────────────────────────────────────┘
```

## 🔄 Real-time Event Flow

```
WhatsApp Event ─▶ Message Processor ─▶ Context Builder ─▶ AI Service ─▶ Response Handler
     │                    │                   │              │              │
     │                    ▼                   ▼              ▼              ▼
     │            Database Storage    Thread Management  API Call      WhatsApp Client
     │                    │                   │              │              │
     └────────────────────┴───────────────────┴──────────────┴──────────────┘
                                    Persistent Storage & Analytics
```

## 📊 Data Models & Relationships

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Contact   │────▶│   Message   │◀────│   Context   │
│             │     │             │     │             │
│ • number    │     │ • content   │     │ • personal  │
│ • name      │     │ • direction │     │ • org info  │
│ • relation  │     │ • ai_response│     │ • ai_rules  │
│ • priority  │     │ • timestamp │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                   ┌─────────────┐
                   │   Thread    │
                   │             │
                   │ • threadId  │
                   │ • messages  │
                   │ • context   │
                   │ • metadata  │
                   └─────────────┘
```

## 🔧 Configuration & Environment

```
┌─────────────────────────────────────────┐
│          Environment Setup              │
├─────────────────────────────────────────┤
│                                         │
│  GEMINI_API_KEY=your_api_key           │
│  MONGODB_URI=mongodb://localhost...    │
│  ENABLE_WHATSAPP=true                  │
│  NODE_ENV=development                   │
│  PORT=3000                             │
│                                         │
│  ┌─────────────┐  ┌─────────────┐      │
│  │ Security    │  │ Database    │      │
│  │ Config      │  │ Config      │      │
│  │             │  │             │      │
│  │ • CORS      │  │ • Connection│      │
│  │ • Helmet    │  │ • Pooling   │      │
│  │ • Rate Lmt  │  │ • Timeout   │      │
│  └─────────────┘  └─────────────┘      │
└─────────────────────────────────────────┘
```

This architecture shows how your AI WhatsApp bot processes messages through multiple layers, from WhatsApp integration to AI processing and database storage, providing a scalable and maintainable system for automated WhatsApp responses.
