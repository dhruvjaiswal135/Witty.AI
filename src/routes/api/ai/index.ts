import { Router } from 'express';
import ContextController from '../../../app/http/controllers/ai/context.controller';
import ProcessorController from '../../../app/http/controllers/ai/processor.controller';
import ContactController from '../../../app/http/controllers/ai/contact.controller';

const router = Router();

// AI Processor Routes
router.post('/processor/initialize', ProcessorController.initialize.bind(ProcessorController));
router.post('/processor/message', ProcessorController.processMessage.bind(ProcessorController));
router.post('/processor/message/custom', ProcessorController.processMessageWithCustomContext.bind(ProcessorController));
router.get('/processor/stats', ProcessorController.getStats.bind(ProcessorController));
router.get('/processor/threads/active', ProcessorController.getActiveThreads.bind(ProcessorController));
router.get('/processor/threads/search', ProcessorController.searchConversations.bind(ProcessorController));
router.get('/processor/thread/:whatsappNumber', ProcessorController.getThreadInfo.bind(ProcessorController));
router.get('/processor/thread/:whatsappNumber/history', ProcessorController.getConversationHistory.bind(ProcessorController));
router.delete('/processor/thread/:whatsappNumber', ProcessorController.clearConversation.bind(ProcessorController));
router.put('/processor/context', ProcessorController.updateContext.bind(ProcessorController));

// Context Management Routes
router.post('/context', ContextController.setContext.bind(ContextController));
router.get('/context', ContextController.listContexts.bind(ContextController));
router.get('/context/:contextId', ContextController.getContext.bind(ContextController));
router.get('/context/:contextId/formatted', ContextController.getFormattedContext.bind(ContextController));
router.get('/context/:contextId/summary', ContextController.getContextSummary.bind(ContextController));
router.put('/context/:contextId', ContextController.updateContext.bind(ContextController));
router.delete('/context/:contextId', ContextController.deleteContext.bind(ContextController));

// Contact Management Routes
router.post('/contacts', ContactController.addContact.bind(ContactController));
router.get('/contacts', ContactController.listContacts.bind(ContactController));
router.get('/contacts/search', ContactController.searchContacts.bind(ContactController));
router.get('/contacts/stats', ContactController.getContactStats.bind(ContactController));
router.get('/contacts/relationship/:relationship', ContactController.getContactsByRelationship.bind(ContactController));
router.get('/contacts/number/:whatsappNumber', ContactController.getContactByNumber.bind(ContactController));
router.get('/contacts/number/:whatsappNumber/context', ContactController.getPersonalizedContext.bind(ContactController));
router.put('/contacts/:contactId', ContactController.updateContact.bind(ContactController));
router.delete('/contacts/:contactId', ContactController.deleteContact.bind(ContactController));

export default router; 