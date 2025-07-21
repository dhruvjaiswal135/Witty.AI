import Contact, { IContact } from '../../../models/Contact';
import Context from '../../../models/Context';

interface ContactCreateData {
  whatsappNumber: string;
  name: string;
  relationship: IContact['relationship'];
  relationshipType: string;
  contextId?: string;
  priority?: IContact['priority'];
  notes?: string;
  customContext?: IContact['customContext'];
}

interface ContactUpdateData {
  name?: string;
  relationship?: IContact['relationship'];
  relationshipType?: string;
  contextId?: string;
  priority?: IContact['priority'];
  notes?: string;
  isActive?: boolean;
  customContext?: IContact['customContext'];
  geminiChatId?: string;
}

class DatabaseContactService {
  /**
   * Normalize phone number (remove @c.us suffix)
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    return phoneNumber.replace('@c.us', '');
  }

  /**
   * Add a new contact
   */
  async addContact(data: ContactCreateData): Promise<IContact> {
    const normalizedNumber = this.normalizePhoneNumber(data.whatsappNumber);
    
    // Check if contact already exists
    const existingContact = await Contact.findOne({ whatsappNumber: normalizedNumber });
    if (existingContact) {
      throw new Error(`Contact with number ${normalizedNumber} already exists`);
    }

    // Verify context exists if provided
    if (data.contextId) {
      const context = await Context.findOne({ contextId: data.contextId, isActive: true });
      if (!context) {
        throw new Error(`Context with ID ${data.contextId} not found or inactive`);
      }
    }

    const contact = new Contact({
      whatsappNumber: normalizedNumber,
      name: data.name,
      relationship: data.relationship,
      relationshipType: data.relationshipType,
      contextId: data.contextId || 'default',
      priority: data.priority || 'medium',
      notes: data.notes,
      customContext: data.customContext,
      messageCount: 0
    });

    await contact.save();
    console.log(`Contact added: ${data.name} (${data.relationshipType})`);
    return contact;
  }

  /**
   * Get contact by WhatsApp number
   */
  async getContactByNumber(whatsappNumber: string): Promise<IContact | null> {
    const normalizedNumber = this.normalizePhoneNumber(whatsappNumber);
    return await Contact.findOne({ whatsappNumber: normalizedNumber });
  }

  /**
   * Get contact by ID
   */
  async getContactById(contactId: string): Promise<IContact | null> {
    return await Contact.findById(contactId);
  }

  /**
   * Update contact
   */
  async updateContact(contactId: string, data: ContactUpdateData): Promise<IContact | null> {
    const contact = await Contact.findById(contactId);
    if (!contact) {
      throw new Error(`Contact with ID ${contactId} not found`);
    }

    // Verify context exists if provided
    if (data.contextId) {
      const context = await Context.findOne({ contextId: data.contextId, isActive: true });
      if (!context) {
        throw new Error(`Context with ID ${data.contextId} not found or inactive`);
      }
    }

    Object.assign(contact, data);
    await contact.save();
    
    console.log(`Contact updated: ${contact.name}`);
    return contact;
  }

  /**
   * Update contact by WhatsApp number
   */
  async updateContactByNumber(whatsappNumber: string, data: ContactUpdateData): Promise<IContact | null> {
    const normalizedNumber = this.normalizePhoneNumber(whatsappNumber);
    
    // Verify context exists if provided
    if (data.contextId) {
      const context = await Context.findOne({ contextId: data.contextId, isActive: true });
      if (!context) {
        throw new Error(`Context with ID ${data.contextId} not found or inactive`);
      }
    }

    const contact = await Contact.findOneAndUpdate(
      { whatsappNumber: normalizedNumber },
      { $set: data },
      { new: true }
    );
    
    if (!contact) {
      throw new Error(`Contact with number ${normalizedNumber} not found`);
    }

    console.log(`Contact updated: ${contact.name}`);
    return contact;
  }

  /**
   * Delete contact
   */
  async deleteContact(contactId: string): Promise<boolean> {
    const result = await Contact.findByIdAndDelete(contactId);
    return !!result;
  }

  /**
   * List all contacts with optional filters
   */
  async listContacts(filters: {
    relationship?: IContact['relationship'];
    priority?: IContact['priority'];
    isActive?: boolean;
    contextId?: string;
  } = {}): Promise<IContact[]> {
    const query: any = {};
    
    if (filters.relationship) query.relationship = filters.relationship;
    if (filters.priority) query.priority = filters.priority;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.contextId) query.contextId = filters.contextId;

    return await Contact.find(query).sort({ createdAt: -1 });
  }

  /**
   * Search contacts by name or number
   */
  async searchContacts(searchTerm: string): Promise<IContact[]> {
    const regex = new RegExp(searchTerm, 'i');
    return await Contact.find({
      $or: [
        { name: regex },
        { whatsappNumber: regex },
        { relationshipType: regex }
      ]
    }).sort({ createdAt: -1 });
  }

  /**
   * Update contact interaction
   */
  async updateInteraction(whatsappNumber: string, messageCount: number = 1): Promise<void> {
    const normalizedNumber = this.normalizePhoneNumber(whatsappNumber);
    
    await Contact.updateOne(
      { whatsappNumber: normalizedNumber },
      {
        $inc: { messageCount },
        $set: { lastInteraction: new Date() },
        $setOnInsert: { 
          'metadata.firstMessageDate': new Date(),
          'metadata.lastMessageDate': new Date()
        }
      },
      { upsert: false }
    );
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
    const stats = await Contact.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } },
          inactive: { $sum: { $cond: ['$isActive', 0, 1] } },
          byRelationship: {
            $push: {
              relationship: '$relationship',
              count: 1
            }
          },
          byPriority: {
            $push: {
              priority: '$priority',
              count: 1
            }
          }
        }
      }
    ]);

    if (stats.length === 0) {
      return {
        total: 0,
        byRelationship: {},
        byPriority: {},
        active: 0,
        inactive: 0
      };
    }

    const stat = stats[0];
    const byRelationship: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    stat.byRelationship.forEach((item: any) => {
      byRelationship[item.relationship] = (byRelationship[item.relationship] || 0) + item.count;
    });

    stat.byPriority.forEach((item: any) => {
      byPriority[item.priority] = (byPriority[item.priority] || 0) + item.count;
    });

    return {
      total: stat.total,
      byRelationship,
      byPriority,
      active: stat.active,
      inactive: stat.inactive
    };
  }

  /**
   * Get contacts with recent interactions
   */
  async getRecentContacts(limit: number = 10): Promise<IContact[]> {
    return await Contact.find({ lastInteraction: { $exists: true } })
      .sort({ lastInteraction: -1 })
      .limit(limit);
  }

  /**
   * Get contacts by relationship type
   */
  async getContactsByRelationship(relationship: IContact['relationship']): Promise<IContact[]> {
    return await Contact.find({ relationship, isActive: true }).sort({ name: 1 });
  }
}

export default new DatabaseContactService(); 