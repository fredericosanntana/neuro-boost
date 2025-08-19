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
  // Log the error
  logger.error('Express error handler', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Handle validation errors
  if (error instanceof ValidationError) {
    res.status(400).json({
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.errors,
        statusCode: 400,
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

  // Handle unknown errors
  res.status(500).json({
    error: {
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message,
      code: 'INTERNAL_SERVER_ERROR',
      statusCode: 500,
    },
    success: false,
    timestamp: new Date().toISOString(),
  });
};