import express, { Express, Request, Response } from 'express';
import bodyParser from 'body-parser';
import compression from 'compression';
import path from 'path';
import { sendErrorResponse } from './app/traits/response.traits';
import securityMiddleware from './app/http/middleware/security.middleware';
import { notFound, errorHandler } from './app/http/middleware/error.middleware';
import { loggingMiddleware } from './app/http/middleware/logging.middleware';
import routeService from './app/providers/route.provider';

const app: Express = express();

// Security middleware
app.use(securityMiddleware.handle());
app.use(securityMiddleware.rateLimiter());
app.use(securityMiddleware.sanitizeInput);

// Basic middleware
app.use(compression());
app.use(loggingMiddleware.requestLogger);

// Body parsing middleware with error handling
app.use(bodyParser.json({
  verify: (req: Request, res: Response, buf: Buffer) => {
    try {
      if (buf.length) JSON.parse(buf.toString());
    } catch (e) {
      sendErrorResponse(res, { message: "Invalid JSON payload" }, 400);
    }
  }
}));
app.use(bodyParser.urlencoded({ extended: true }));

// WhatsApp integration - initialize and log status
// (Initialization now handled in index.ts after DB connection)

// Routes
app.use(routeService);

// Static files (after routes to avoid conflicts)
app.use(express.static(path.join(__dirname, 'public')));

// Error handling
app.use(notFound);
app.use(loggingMiddleware.errorLogger);
app.use(errorHandler);

export default app; 