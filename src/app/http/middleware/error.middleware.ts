import { Request, Response, NextFunction } from 'express';
import { sendErrorResponse } from '../../traits/response.traits';
import environment from '../../../config/environment';

// Not found handler
export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Error handler
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  sendErrorResponse(res, {
    message: err.message,
    stack: environment.app.env === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  }, statusCode);
}; 