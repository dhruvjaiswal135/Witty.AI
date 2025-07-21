# AI WhatsApp Bot

An intelligent WhatsApp chatbot powered by Google Gemini AI that provides context-aware, personalized responses based on your personal and organization information. Now with MongoDB database for persistent storage of contacts, messages, and AI contexts.

## 🚀 Features

- **🤖 AI-Powered Responses**: Google Gemini AI integration for intelligent conversations
- **👤 Personal Context**: AI learns about you and your organization
- **🧵 Thread Management**: Maintains conversation history per user
- **⚡ Real-time Processing**: Instant responses to WhatsApp messages
- **🎯 Context Management**: Easy setup and management of AI personality
- **📱 WhatsApp Integration**: Seamless WhatsApp Web integration
- **🔧 RESTful API**: Full API for context and conversation management
- **🗄️ MongoDB Database**: Persistent storage for contacts, messages, and contexts
- **👥 Contact Management**: Personalized AI responses based on relationship types
- **📊 Analytics**: Message statistics and conversation analytics

## 🏗️ Architecture

```
WhatsApp Messages → AI Processor → Google Gemini → Context-Aware Response → WhatsApp Reply
     ↓
MongoDB Database → Contact Management → Message History → Context Storage → Analytics
```

## 🛠️ Tech Stack

- **Backend**: Node.js + TypeScript
- **AI**: Google Gemini Pro
- **WhatsApp**: whatsapp-web.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: Local session management

## 📋 Prerequisites

- Node.js (v16 or higher)
- Google Chrome/Chromium browser
- Google Gemini API key
- WhatsApp account
- MongoDB (local or cloud)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd ai-chatbot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:

```env
# WhatsApp Configuration
ENABLE_WHATSAPP=true

# Google Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/ai-chatbot

# Server Configuration
PORT=3000
NODE_ENV=development

# Optional: Custom context ID (defaults to 'default')
DEFAULT_CONTEXT_ID=default
```

### 4. Setup MongoDB

#### Option A: Local MongoDB
```bash
# Install MongoDB (macOS with Homebrew)
brew install mongodb-community

# Start MongoDB service
brew services start mongodb-community

# Or run manually
mongod --dbpath /usr/local/var/mongodb
```

#### Option B: MongoDB Atlas (Cloud)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get your connection string
4. Update `MONGODB_URI` in your `.env` file

### 5. Get Google Gemini API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key to your `.env` file

### 6. Start the Application
```bash
npm run dev
```

### 7. Connect WhatsApp
1. Visit `http://localhost:3000/v1/config/setup/init?html=true`
2. Scan the QR code with your WhatsApp
3. Wait for authentication to complete

### 8. Set Up Your AI Context
```bash
# Set personal information
curl -X POST http://localhost:3000/v1/ai/context \
  -H "Content-Type: application/json" \
  -d '{
    "contextId": "my_context",
    "personalInfo": {
      "name": "Your Name",
      "role": "Your Role",
      "expertise": ["Skill 1", "Skill 2"],
      "personality": "Your personality description",
      "communicationStyle": "Your communication style",
      "availability": "Your availability"
    }
  }'
```

## 📚 API Documentation

### Context Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/ai/context` | Set personal/organization context |
| GET | `/v1/ai/context` | List all contexts |
| GET | `/v1/ai/context/:contextId` | Get specific context |
| PUT | `/v1/ai/context/:contextId` | Update context |
| DELETE | `/v1/ai/context/:contextId` | Delete context |

### Contact Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/contacts` | Add new contact |
| GET | `/v1/contacts` | List all contacts |
| GET | `/v1/contacts/:id` | Get contact by ID |
| PUT | `/v1/contacts/:id` | Update contact |
| DELETE | `/v1/contacts/:id` | Delete contact |
| GET | `/v1/contacts/search/:query` | Search contacts |
| GET | `/v1/contacts/stats` | Get contact statistics |

### AI Processing
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/ai/processor/initialize` | Initialize AI processor |
| POST | `/v1/ai/processor/message` | Process message with AI |
| GET | `/v1/ai/processor/stats` | Get processing statistics |
| GET | `/v1/ai/processor/threads/active` | Get active conversations |
| GET | `/v1/ai/processor/thread/:whatsappNumber` | Get thread info |
| GET | `/v1/ai/processor/thread/:whatsappNumber/history` | Get conversation history |

### Message Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/messages` | Get recent messages |
| GET | `/v1/messages/:whatsappNumber` | Get conversation history |
| GET | `/v1/messages/stats` | Get message statistics |
| GET | `/v1/messages/search/:query` | Search messages |

### WhatsApp Setup
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/config/setup/init` | Initialize WhatsApp and get QR code |
| GET | `/v1/config/setup/debug` | Get detailed WhatsApp status |

## 🔧 Configuration

### AI Context Structure
```typescript
interface UserContext {
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
}
```

### Contact Structure
```typescript
interface Contact {
  whatsappNumber: string;
  name: string;
  relationship: 'girlfriend' | 'family' | 'friend' | 'colleague' | 'client' | 'potential_customer' | 'other';
  relationshipType: string;
  contextId: string;
  priority: 'high' | 'medium' | 'low';
  customContext?: {
    personality?: string;
    communicationStyle?: string;
    topics?: string[];
    avoidTopics?: string[];
    responseTone?: string;
    specialInstructions?: string;
  };
}
```

## 🧪 Testing

### Test AI Processing
```bash
# Initialize AI processor
curl -X POST http://localhost:3000/v1/ai/processor/initialize

# Test message processing
curl -X POST http://localhost:3000/v1/ai/processor/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, can you tell me about your services?",
    "whatsappNumber": "1234567890"
  }'

# Check processing stats
curl http://localhost:3000/v1/ai/processor/stats
```

### Test Contact Management
```bash
# Add a contact
curl -X POST http://localhost:3000/v1/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "whatsappNumber": "1234567890",
    "name": "John Doe",
    "relationship": "friend",
    "relationshipType": "best friend",
    "contextId": "default",
    "priority": "high"
  }'

# List contacts
curl http://localhost:3000/v1/contacts

# Get contact statistics
curl http://localhost:3000/v1/contacts/stats
```

## 🔍 Monitoring

### Debug Endpoints
- `GET /v1/config/setup/debug` - WhatsApp connection status
- `GET /v1/ai/processor/stats` - AI processing statistics
- `GET /v1/messages/stats` - Message statistics
- `GET /v1/contacts/stats` - Contact statistics

### Logs
The application provides detailed logging for:
- WhatsApp connection events
- AI processing requests
- Message handling
- Database operations
- Error tracking

## 🛡️ Security

- API keys are stored in environment variables
- WhatsApp sessions are stored locally
- No sensitive data is logged
- Rate limiting recommended for production
- MongoDB connection uses authentication

## 🚀 Deployment

### Production Considerations
1. Set `NODE_ENV=production`
2. Use a process manager (PM2, Docker)
3. Set up proper logging
4. Configure rate limiting
5. Use HTTPS
6. Monitor API usage
7. Set up MongoDB authentication
8. Configure MongoDB backup strategy

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/ai-chatbot
    depends_on:
      - mongo
    volumes:
      - ./logs:/app/logs

  mongo:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For detailed setup instructions and troubleshooting, see [AI_SETUP.md](AI_SETUP.md).

## 🔮 Roadmap

- [ ] Media message support (images, documents)
- [ ] Multi-language support
- [ ] Conversation analytics dashboard
- [ ] Advanced context management UI
- [ ] Integration with other AI providers
- [ ] Webhook support for external integrations
- [ ] Real-time notifications
- [ ] Advanced contact analytics
- [ ] Message sentiment analysis
- [ ] Automated contact categorization
