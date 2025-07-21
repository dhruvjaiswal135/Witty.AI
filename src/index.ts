import cluster from 'cluster';
import os from 'os';
import http from 'http';
import { connectDatabase } from './config/database';
import app from './app';
import { initializeWhatsAppService, whatsappService } from './app/services';
import environment from './config/environment';

const isProduction = environment.app.env === 'production';
const numCPUs = os.cpus().length;
const port: number = environment.app.port;

// Create HTTP server
const server = http.createServer(app);

if (isProduction && cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);
  console.log(`Forking for ${numCPUs} CPUs`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  // Initialize database connection
  const initializeApp = async () => {
    try {
      // Connect to MongoDB
      await connectDatabase();

      // Initialize WhatsApp service (after DB is ready)
      await initializeWhatsAppService();
      if (whatsappService) {
        const status = whatsappService.getStatus();
        console.log(`WhatsApp service initialized. Status: ${status}`);
      } else {
        console.log('WhatsApp service is not available or disabled.');
      }

      // Start server
      server.listen(port, () => {
        console.log(`Worker ${process.pid} started at http://127.0.0.1:${port}`);
        console.log('✅ Application initialized successfully');
      });
    } catch (error) {
      console.error('❌ Failed to initialize application:', error);
      process.exit(1);
    }
  };

  initializeApp();

  // Handle server errors
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.syscall !== 'listen') {
      throw error;
    }

    const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

    // Handle specific listen errors with friendly messages
    switch (error.code) {
      case 'EACCES':
        console.error(bind + ' requires elevated privileges');
        process.exit(1);
      case 'EADDRINUSE':
        console.error(bind + ' is already in use');
        process.exit(1);
      default:
        throw error;
    }
  });
} 