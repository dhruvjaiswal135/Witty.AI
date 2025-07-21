import { Router, Request, Response, NextFunction } from 'express';
import { sendSuccessResponse } from '../traits/response.traits';
import configRoutes from './../../routes/api/config'
import aiRoutes from './../../routes/api';
import environment from '../../config/environment';

const router = Router();
const version: string = 'v1';

// Root route
router.get('/', (req: Request, res: Response) => {
  return sendSuccessResponse(res, {
    message: 'Welcome to AI-CHATBOT',
    version: '1.0.0',
    status: 'running',
    environment: environment.app.env || 'development',
    timestamp: new Date().toISOString()
  });
});

// Health check route
router.get('/health', (req: Request, res: Response) => {
  return sendSuccessResponse(res, {
    status: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

router.use(`/${version}`, configRoutes);
router.use(`/${version}`, aiRoutes);

export default router; 