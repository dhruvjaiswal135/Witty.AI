import DatabaseContactService from '../database/contact.service';
import DatabaseContextService from '../database/context.service';
import { IContact } from '../../../models/Contact';

interface Contact extends IContact {
  id: string;
}

interface RelationshipContext {
  relationship: Contact['relationship'];
  personality: string;
  communicationStyle: string;
  topics: string[];
  avoidTopics: string[];
  responseTone: string;
  specialInstructions: string;
}

class ContactService {
  private relationshipContexts: Map<Contact['relationship'], RelationshipContext>;

  constructor() {
    this.relationshipContexts = new Map();
    this.initializeDefaultRelationshipContexts();
  }

  /**
   * Initialize default relationship contexts
   */
  private initializeDefaultRelationshipContexts(): void {
    const defaultContexts: RelationshipContext[] = [
      {
        relationship: 'girlfriend',
        personality: 'Loving, caring, romantic, and attentive boyfriend',
        communicationStyle: 'Warm, affectionate, and emotionally connected',
        topics: ['daily life', 'feelings', 'future plans', 'romance', 'support', 'care'],
        avoidTopics: ['work stress', 'negative news', 'controversial topics'],
        responseTone: 'romantic',
        specialInstructions: 'Always be loving and supportive. Use affectionate language, emojis, and show genuine care. Make her feel special and valued. Be romantic but not overly cheesy. Show interest in her day and feelings.'
      },
      {
        relationship: 'family',
        personality: 'Caring, responsible, and supportive family member',
        communicationStyle: 'Warm, respectful, and family-oriented',
        topics: ['family updates', 'health', 'well-being', 'support', 'care'],
        avoidTopics: ['personal problems', 'work stress', 'negative topics'],
        responseTone: 'caring',
        specialInstructions: 'Be caring and supportive. Show genuine concern for their well-being. Use respectful and warm language. Be helpful and offer support when needed.'
      },
      {
        relationship: 'friend',
        personality: 'Fun, supportive, and reliable friend',
        communicationStyle: 'Casual, friendly, and relaxed',
        topics: ['daily life', 'hobbies', 'support', 'fun activities', 'advice'],
        avoidTopics: ['sensitive personal issues', 'controversial topics'],
        responseTone: 'friendly',
        specialInstructions: 'Be friendly and supportive. Use casual language and emojis. Show interest in their life and be helpful when needed.'
      },
      {
        relationship: 'colleague',
        personality: 'Professional, collaborative, and respectful coworker',
        communicationStyle: 'Professional, clear, and cooperative',
        topics: ['work projects', 'professional development', 'team collaboration', 'work-related support'],
        avoidTopics: ['personal issues', 'office gossip', 'sensitive topics'],
        responseTone: 'professional',
        specialInstructions: 'Maintain professional boundaries. Be helpful with work-related matters. Use appropriate business language. Show respect for their expertise and contributions.'
      },
      {
        relationship: 'client',
        personality: 'Professional, helpful, and customer-focused service provider',
        communicationStyle: 'Professional, clear, and solution-oriented',
        topics: ['services', 'solutions', 'support', 'professional advice', 'business matters'],
        avoidTopics: ['personal issues', 'confidential information', 'negative topics'],
        responseTone: 'professional',
        specialInstructions: 'Be professional and helpful. Focus on providing value and solutions. Use clear and respectful language. Show expertise and reliability.'
      },
      {
        relationship: 'potential_customer',
        personality: 'Helpful, informative, and conversion-focused professional',
        communicationStyle: 'Professional, engaging, and informative',
        topics: ['services', 'benefits', 'solutions', 'value proposition', 'next steps'],
        avoidTopics: ['aggressive sales tactics', 'personal issues', 'negative topics'],
        responseTone: 'professional',
        specialInstructions: 'Be informative and helpful. Focus on understanding their needs and providing value. Use engaging but professional language. Guide them toward solutions without being pushy.'
      }
    ];

    defaultContexts.forEach(context => {
      this.relationshipContexts.set(context.relationship, context);
    });
  }

  /**
   * Generate contact ID
   */
  private generateContactId(whatsappNumber: string): string {
    return `contact_${whatsappNumber.replace('@c.us', '')}`;
  }

  /**
   * Add a new contact
   */
  async addContact(
    whatsappNumber: string,
    name: string,
    relationship: Contact['relationship'],
    relationshipType: string,
    contextId: string,
    priority: Contact['priority'] = 'medium',
    notes?: string
  ): Promise<Contact> {
    const contact = await DatabaseContactService.addContact({
      whatsappNumber,
      name,
      relationship,
      relationshipType,
      contextId,
      priority,
      notes
    });
    return contact as Contact;
  }

  /**
   * Get contact by WhatsApp number
   */
  async getContactByNumber(whatsappNumber: string): Promise<Contact | null> {
    const contact = await DatabaseContactService.getContactByNumber(whatsappNumber);
    return contact as Contact | null;
  }

  /**
   * Get contact by ID
   */
  async getContactById(contactId: string): Promise<Contact | null> {
    const contact = await DatabaseContactService.getContactById(contactId);
    return contact as Contact | null;
  }

  /**
   * Update contact
   */
  async updateContact(contactId: string, data: Partial<Contact>): Promise<Contact | null> {
    const contact = await DatabaseContactService.updateContact(contactId, data);
    return contact as Contact | null;
  }

  /**
   * Update contact by WhatsApp number
   */
  async updateContactByNumber(whatsappNumber: string, data: Partial<Contact>): Promise<Contact | null> {
    const contact = await DatabaseContactService.updateContactByNumber(whatsappNumber, data);
    return contact as Contact | null;
  }

  /**
   * Delete contact
   */
  async deleteContact(contactId: string): Promise<boolean> {
    return await DatabaseContactService.deleteContact(contactId);
  }

  /**
   * List all contacts
   */
  async listContacts(): Promise<Contact[]> {
    const contacts = await DatabaseContactService.listContacts();
    return contacts as Contact[];
  }

  /**
   * Search contacts
   */
  async searchContacts(searchTerm: string): Promise<Contact[]> {
    const contacts = await DatabaseContactService.searchContacts(searchTerm);
    return contacts as Contact[];
  }

  /**
   * Get relationship context for a contact
   */
  getRelationshipContext(relationship: Contact['relationship']): RelationshipContext | undefined {
    return this.relationshipContexts.get(relationship);
  }

  /**
   * Get personalized context for a contact
   */
  async getPersonalizedContext(whatsappNumber: string): Promise<{
    contact: Contact | null;
    relationshipContext: RelationshipContext | undefined;
    customContext?: Contact['customContext'];
  }> {
    const contact = await this.getContactByNumber(whatsappNumber);
    
    if (!contact) {
      return {
        contact: null,
        relationshipContext: undefined
      };
    }

    const relationshipContext = this.getRelationshipContext(contact.relationship);

    return {
      contact,
      relationshipContext,
      customContext: contact.customContext
    };
  }

  /**
   * Update contact interaction
   */
  async updateInteraction(whatsappNumber: string): Promise<void> {
    await DatabaseContactService.updateInteraction(whatsappNumber);
  }

  /**
   * Get contact statistics
   */
  async getContactStats(): Promise<{
    total: number;
    byRelationship: Record<string, number>;
    byPriority: Record<string, number>;
    active: number;
    inactive: number;
  }> {
    return await DatabaseContactService.getContactStats();
  }

  /**
   * Get recent contacts
   */
  async getRecentContacts(limit: number = 10): Promise<Contact[]> {
    const contacts = await DatabaseContactService.getRecentContacts(limit);
    return contacts as Contact[];
  }

  /**
   * Get contacts by relationship
   */
  async getContactsByRelationship(relationship: Contact['relationship']): Promise<Contact[]> {
    const contacts = await DatabaseContactService.getContactsByRelationship(relationship);
    return contacts as Contact[];
  }
}

export default new ContactService(); 