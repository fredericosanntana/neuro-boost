import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { logger } from '../src/lib/logger';
import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks';
import userRoutes from './routes/users';
import focusRoutes from './routes/focus';
import { errorHandler } from './middleware/errorHandler';
import { connectDatabase } from './config/database';
import { securityHeaders, apiRateLimit, authRateLimit, corsOptions } from './middleware/security';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for accurate IP addresses behind load balancer
app.set('trust proxy', 1);

// Security middleware
app.use(securityHeaders);
app.use(helmet({
  contentSecurityPolicy: false, // We handle CSP in securityHeaders
  crossOriginEmbedderPolicy: false
}));
app.use(cors(corsOptions));

// Logging middleware
app.use(morgan('combined', {
  stream: { write: (message: string) => logger.info(message.trim()) },
  skip: (req) => req.url === '/health' // Skip health check logs
}));

// Rate limiting middleware
app.use('/api', apiRateLimit);
app.use('/api/auth', authRateLimit);

// Body parsing middleware
app.use(express.json({ 
  limit: '1mb', // Reduced from 10mb for security
  type: ['application/json', 'application/vnd.api+json']
}));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/focus', focusRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const startServer = async () => {
  try {
    // Validate required environment variables
    const requiredEnvVars = ['JWT_SECRET', 'DB_PASSWORD'];
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    }

    // Connect to database
    await connectDatabase();
    logger.info('✅ Database connected successfully');

    // Start server
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info('🚀 Neuro-Boost Server Started');
      logger.info(`📡 Port: ${PORT}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔒 Security headers: enabled`);
      logger.info(`🛡️  Rate limiting: enabled`);
      logger.info(`📊 Health endpoint: /health`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      server.close(() => {
        logger.info('✅ HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();