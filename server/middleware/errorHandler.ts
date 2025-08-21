import { Request, Response, NextFunction } from 'express';
import { AppError, createErrorResponse } from '../../src/lib/errors';
import { ValidationError } from '../../src/lib/validation';
import { logger } from '../../src/lib/logger';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Generate unique error ID for tracking
  const errorId = Math.random().toString(36).substr(2, 9);
  
  // Log detailed error information (server-side only)
  logger.error('Express error handler', {
    errorId,
    error: error.message,
    stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestBody: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
  });

  // Handle validation errors
  if (error instanceof ValidationError) {
    res.status(400).json({
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.errors,
        statusCode: 400,
        errorId: process.env.NODE_ENV !== 'production' ? errorId : undefined
      },
      success: false,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle custom app errors
  if (error instanceof AppError) {
    res.status(error.statusCode).json(createErrorResponse(error));
    return;
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({
      error: {
        message: 'Invalid token',
        code: 'INVALID_TOKEN',
        statusCode: 401,
      },
      success: false,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle database errors
  if (error.name === 'QueryFailedError' || error.code) {
    res.status(500).json({
      error: {
        message: 'Database error occurred',
        code: 'DATABASE_ERROR',
        statusCode: 500,
      },
      success: false,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle unknown errors (sanitized for production)
  res.status(500).json({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
      statusCode: 500,
      errorId: process.env.NODE_ENV !== 'production' ? errorId : undefined,
      ...(process.env.NODE_ENV !== 'production' && {
        details: error.message,
        stack: error.stack
      })
    },
    success: false,
    timestamp: new Date().toISOString(),
  });
};