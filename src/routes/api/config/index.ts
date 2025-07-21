import { Router } from 'express';
import setupRoutes from './setup';

const router: Router = Router();

router.use('/setup', setupRoutes);

export default router;