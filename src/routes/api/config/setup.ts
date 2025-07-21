import { Router } from 'express';
import WhatsAppConfigController from '../../../app/http/controllers/whatsapp/config.controller';

const router: Router = Router();

router.route('/init').get(WhatsAppConfigController.init);
router.route('/debug').get(WhatsAppConfigController.debug);

export default router;