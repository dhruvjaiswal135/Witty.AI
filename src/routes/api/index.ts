import { Router } from 'express';
import config from './config';
import aiRoutes from './ai';

const router: Router = Router();

router.use('/', config);
router.use('/ai', aiRoutes);

export default router;