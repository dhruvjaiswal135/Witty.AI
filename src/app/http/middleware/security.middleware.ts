import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import environment from '../../../config/environment';

// Rate limiter configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// CORS configuration
const corsOptions = {
  origin: environment.cors.origin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Sanitize input data
const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  if (req.body) {
    const sanitizeValue = (value: any): any => {
      if (typeof value === 'string') {
        // Basic XSS protection
        return value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
          .replace(/\//g, '&#x2F;');
      }
      if (Array.isArray(value)) {
        return value.map(sanitizeValue);
      }
      if (value && typeof value === 'object') {
        const sanitized: any = {};
        for (const [key, val] of Object.entries(value)) {
          sanitized[key] = sanitizeValue(val);
        }
        return sanitized;
      }
      return value;
    };

    req.body = sanitizeValue(req.body);
  }
  next();
};

// Security middleware handler
const handle = () => [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    xssFilter: true,
    noSniff: true,
    referrerPolicy: { policy: 'same-origin' }
  }),
  cors(corsOptions)
];

export default {
  handle,
  rateLimiter: () => limiter,
  sanitizeInput,
  corsConfig: () => cors(corsOptions)
}; 