import { Response } from 'express';

interface ErrorResponse {
  message: string;
  stack?: string;
  path?: string;
  method?: string;
  [key: string]: any;
}

interface SuccessResponse {
  message?: string;
  data?: any;
  [key: string]: any;
}

export const sendSuccessResponse = (res: Response, data: SuccessResponse, statusCode: number = 200): void => {
  res.status(statusCode).json({
    status: true,
    ...data
  });
};

export const sendErrorResponse = (res: Response, error: ErrorResponse, statusCode: number = 500): void => {
  res.status(statusCode).json({
    status: false,
    ...error
  });
}; 