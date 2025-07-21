import { Request, Response } from 'express';
import ContactService from '../../../services/ai/contact.service';

class ContactController {
  /**
   * Add a new contact
   */
  async addContact(req: Request, res: Response): Promise<void> {
    try {
      const { 
        whatsappNumber, 
        name, 
        relationship, 
        relationshipType, 
        contextId, 
        priority, 
        notes 
      } = req.body;

      if (!whatsappNumber || !name || !relationship || !relationshipType) {
        res.status(400).json({
          success: false,
          message: 'WhatsApp number, name, relationship, and relationship type are required'
        });
        return;
      }

      const contact = await ContactService.addContact(
        whatsappNumber,
        name,
        relationship,
        relationshipType,
        contextId || 'default',
        priority || 'medium',
        notes
      );

      res.status(201).json({
        success: true,
        message: 'Contact added successfully',
        data: contact
      });
    } catch (error: any) {
      console.error('Error adding contact:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add contact',
        error: error.message
      });
    }
  }

  /**
   * Get contact by WhatsApp number
   */
  async getContactByNumber(req: Request, res: Response): Promise<void> {
    try {
      const { whatsappNumber } = req.params;

      if (!whatsappNumber) {
        res.status(400).json({
          success: false,
          message: 'WhatsApp number is required'
        });
        return;
      }

      const contact = ContactService.getContactByNumber(whatsappNumber);

      if (!contact) {
        res.status(404).json({
          success: false,
          message: 'Contact not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: contact
      });
    } catch (error: any) {
      console.error('Error getting contact:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get contact',
        error: error.message
      });
    }
  }

  /**
   * Update contact
   */
  async updateContact(req: Request, res: Response): Promise<void> {
    try {
      const { contactId } = req.params;
      const updates = req.body;

      if (!contactId) {
        res.status(400).json({
          success: false,
          message: 'Contact ID is required'
        });
        return;
      }

      const updatedContact = await ContactService.updateContact(contactId, updates);

      if (!updatedContact) {
        res.status(404).json({
          success: false,
          message: 'Contact not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Contact updated successfully',
        data: updatedContact
      });
    } catch (error: any) {
      console.error('Error updating contact:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update contact',
        error: error.message
      });
    }
  }

  /**
   * Delete contact
   */
  async deleteContact(req: Request, res: Response): Promise<void> {
    try {
      const { contactId } = req.params;

      if (!contactId) {
        res.status(400).json({
          success: false,
          message: 'Contact ID is required'
        });
        return;
      }

      const deleted = ContactService.deleteContact(contactId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Contact not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Contact deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting contact:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete contact',
        error: error.message
      });
    }
  }

  /**
   * List all contacts
   */
  async listContacts(req: Request, res: Response): Promise<void> {
    try {
      const contacts = await ContactService.listContacts();
      res.status(200).json({
        success: true,
        data: {
          count: contacts.length,
          contacts
        }
      });
    } catch (error: any) {
      console.error('Error listing contacts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list contacts',
        error: error.message
      });
    }
  }

  /**
   * Get contacts by relationship
   */
  async getContactsByRelationship(req: Request, res: Response): Promise<void> {
    try {
      const { relationship } = req.params;
      if (!relationship) {
        res.status(400).json({
          success: false,
          message: 'Relationship is required'
        });
        return;
      }
      const contacts = await ContactService.getContactsByRelationship(relationship as any);
      res.status(200).json({
        success: true,
        data: {
          relationship,
          count: contacts.length,
          contacts
        }
      });
    } catch (error: any) {
      console.error('Error getting contacts by relationship:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get contacts by relationship',
        error: error.message
      });
    }
  }

  /**
   * Search contacts
   */
  async searchContacts(req: Request, res: Response): Promise<void> {
    try {
      const { query } = req.query;
      if (!query) {
        res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
        return;
      }
      const contacts = await ContactService.searchContacts(query as string);
      res.status(200).json({
        success: true,
        data: {
          query,
          count: contacts.length,
          contacts
        }
      });
    } catch (error: any) {
      console.error('Error searching contacts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search contacts',
        error: error.message
      });
    }
  }

  /**
   * Get contact statistics
   */
  async getContactStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await ContactService.getContactStats();
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Error getting contact stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get contact stats',
        error: error.message
      });
    }
  }

  /**
   * Get personalized context for a contact
   */
  async getPersonalizedContext(req: Request, res: Response): Promise<void> {
    try {
      const { whatsappNumber } = req.params;
      if (!whatsappNumber) {
        res.status(400).json({
          success: false,
          message: 'WhatsApp number is required'
        });
        return;
      }
      const context = await ContactService.getPersonalizedContext(whatsappNumber);
      const contact = await ContactService.getContactByNumber(whatsappNumber);
      res.status(200).json({
        success: true,
        data: {
          whatsappNumber,
          contact: contact ? {
            id: contact.id,
            name: contact.name,
            relationship: contact.relationship,
            relationshipType: contact.relationshipType
          } : null,
          context
        }
      });
    } catch (error: any) {
      console.error('Error getting personalized context:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get personalized context',
        error: error.message
      });
    }
  }
}

export default new ContactController(); 