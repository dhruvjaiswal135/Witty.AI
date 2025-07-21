import { Client, Message, MessageMedia } from 'whatsapp-web.js';
import MessageProcessor from '../ai/message.processor';

export interface WhatsAppMessage {
  to: string;
  message: string;
  media?: string;
}

export class WhatsAppService {
  private client: Client | null;
  private clientReady: boolean = false;
  private aiProcessorReady: boolean = false;

  constructor(client: Client | null) {
    this.client = client;
    this.setupStatusListeners();
    this.setupMessageListener();
    this.initializeAIProcessor();
  }

  /**
   * Initialize AI processor
   */
  private async initializeAIProcessor(): Promise<void> {
    try {
      this.aiProcessorReady = await MessageProcessor.initialize();
      console.log('AI processor initialized:', this.aiProcessorReady);
    } catch (error) {
      console.error('Failed to initialize AI processor:', error);
      this.aiProcessorReady = false;
    }
  }

  /**
   * Setup status listeners to track client state
   */
  private setupStatusListeners(): void {
    if (!this.client) return;

    this.client.on('ready', () => {
      console.log('WhatsApp client ready state detected');
      this.clientReady = true;
    });

    this.client.on('disconnected', () => {
      console.log('WhatsApp client disconnected - resetting ready state');
      this.clientReady = false;
    });

    this.client.on('auth_failure', () => {
      console.log('WhatsApp auth failure - resetting ready state');
      this.clientReady = false;
    });
  }

  /**
   * Setup message listener for incoming messages
   */
  private setupMessageListener(): void {
    if (!this.client) return;

    this.client.on('message', async (message: Message) => {
      try {
        // Only process messages from others (not from self)
        if (message.fromMe) {
          return;
        }

        // Only process text messages for now
        if (!message.body || message.body.trim() === '') {
          return;
        }

        // Process message with AI if processor is ready
        if (this.aiProcessorReady && MessageProcessor.isReady()) {
          await this.processMessageWithAI(message);
        } else {
          console.log('AI processor not ready, skipping message processing');
        }

      } catch (error) {
        console.error('Error processing incoming message:', error);
      }
    });
  }

  /**
   * Process incoming message with AI and send response
   */
  private async processMessageWithAI(message: Message): Promise<void> {
    try {
      const whatsappNumber = message.from.replace('@c.us', '');
      const userName = undefined; // We'll get this from contact info later if needed
      const messageContent = message.body;

      // Process message with AI
      const processedMessage = await MessageProcessor.processMessage(
        messageContent,
        whatsappNumber,
        userName
      );

      // Send AI response back to the user
      const sent = await this.sendMessage(whatsappNumber, processedMessage.aiResponse);

      if (sent) {
        console.log(`AI response sent successfully to ${whatsappNumber}@c.us`);
      } else {
        console.error(`Failed to send AI response to ${whatsappNumber}`);
      }

    } catch (error) {
      console.error('Error in AI message processing:', error);
      
      // Send a fallback message if AI processing fails
      try {
        const whatsappNumber = message.from.replace('@c.us', '');
        await this.sendMessage(whatsappNumber, 'Sorry, I\'m having trouble processing your message right now. Please try again later.');
      } catch (fallbackError) {
        console.error('Failed to send fallback message:', fallbackError);
      }
    }
  }

  /**
   * Check if WhatsApp client is ready and authenticated
   */
  isClientReady(): boolean {
    return this.client !== null && this.clientReady;
  }

  /**
   * Check if AI processor is ready
   */
  isAIReady(): boolean {
    return this.aiProcessorReady && MessageProcessor.isReady();
  }

  /**
   * Send a text message
   */
  async sendMessage(to: string, message: string): Promise<boolean> {
    if (!this.isClientReady()) {
      console.error('WhatsApp client is not ready');
      return false;
    }

    try {
      // Format phone number (remove + and add country code if needed)
      const formattedNumber = this.formatPhoneNumber(to);
      
      await this.client!.sendMessage(formattedNumber, message);
      console.log(`Message sent to ${formattedNumber}`);
      return true;
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error);
      return false;
    }
  }

  /**
   * Send a media message
   */
  async sendMedia(to: string, mediaPath: string, caption?: string): Promise<boolean> {
    if (!this.isClientReady()) {
      console.error('WhatsApp client is not ready');
      return false;
    }

    try {
      const formattedNumber = this.formatPhoneNumber(to);
      const media = MessageMedia.fromFilePath(mediaPath);
      
      await this.client!.sendMessage(formattedNumber, media, { caption });
      console.log(`Media message sent to ${formattedNumber}`);
      return true;
    } catch (error) {
      console.error('Failed to send WhatsApp media message:', error);
      return false;
    }
  }

  /**
   * Format phone number for WhatsApp
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // If it starts with 0, replace with country code (assuming India +91)
    if (cleaned.startsWith('0')) {
      cleaned = '91' + cleaned.substring(1);
    }
    
    // If it doesn't start with country code, add +91 (India)
    if (!cleaned.startsWith('91') && cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    
    return cleaned + '@c.us';
  }

  /**
   * Get client status
   */
  getStatus(): string {
    if (!this.client) {
      return 'DISABLED';
    }
    
    // Check if client is properly initialized
    if (!this.client.pupPage) {
      return 'INITIALIZING';
    }
    
    // Check if client is ready
    if (this.clientReady) {
      return 'READY';
    }
    
    // If not ready
    return 'DISABLED';
  }

  /**
   * Get detailed status information
   */
  getDetailedStatus(): {
    status: string;
    isReady: boolean;
    hasClient: boolean;
    hasPupPage: boolean;
    aiReady: boolean;
  } {
    return {
      status: this.getStatus(),
      isReady: this.clientReady,
      hasClient: this.client !== null,
      hasPupPage: this.client?.pupPage !== null,
      aiReady: this.isAIReady()
    };
  }

  /**
   * Get AI processing statistics
   */
  getAIStats(): any {
    if (!this.aiProcessorReady) {
      return { ready: false, message: 'AI processor not initialized' };
    }
    return MessageProcessor.getProcessingStats();
  }

  /**
   * Public getter for the underlying WhatsApp client
   */
  public get clientInstance(): Client | null {
    return this.client;
  }
} 