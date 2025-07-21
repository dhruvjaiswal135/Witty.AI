import environment from '../../../config/environment';
import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';

// Request logger
const requestLogger = morgan('dev');

// Error logger
const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  const timestamp = new Date().toISOString();
  const errorDetails = {
    timestamp,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  };

  if (environment.app.env === 'development') {
    console.error(`[${timestamp}] Error:`, errorDetails);
  } else {
    console.error(`[${timestamp}] Error: ${err.message}`);
  }

  next(err);
};

export const loggingMiddleware = {
  requestLogger,
  errorLogger
}; 