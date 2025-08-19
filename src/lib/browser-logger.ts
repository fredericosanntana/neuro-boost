const isDevelopment = process.env.NODE_ENV !== 'production';

interface LogMeta {
  [key: string]: unknown;
}

class BrowserLogger {
  private serviceName = 'neuro-boost';
  private environment = process.env.NODE_ENV || 'development';

  private formatMessage(level: string, message: string, meta?: LogMeta): string {
    const timestamp = new Date().toISOString();
    const baseData = {
      timestamp,
      level,
      message,
      service: this.serviceName,
      environment: this.environment,
      ...meta,
    };
    return JSON.stringify(baseData, null, isDevelopment ? 2 : 0);
  }

  error(message: string, meta?: LogMeta): void {
    console.error(this.formatMessage('error', message, meta));
  }

  warn(message: string, meta?: LogMeta): void {
    console.warn(this.formatMessage('warn', message, meta));
  }

  info(message: string, meta?: LogMeta): void {
    if (isDevelopment) {
      console.info(this.formatMessage('info', message, meta));
    }
  }

  debug(message: string, meta?: LogMeta): void {
    if (isDevelopment) {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }
}

export const logger = new BrowserLogger();

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