import winston from 'winston';

const isDevelopment = process.env.NODE_ENV !== 'production';

export const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'neuro-boost',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    }),
  ],
});

if (isDevelopment) {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

export const logError = (error: Error, context?: Record<string, unknown>) => {
  logger.error('Application error', {
    message: error.message,
    stack: error.stack,
    ...context,
  });
};

export const logInfo = (message: string, meta?: Record<string, unknown>) => {
  logger.info(message, meta);
};

export const logWarning = (message: string, meta?: Record<string, unknown>) => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: Record<string, unknown>) => {
  logger.debug(message, meta);
};