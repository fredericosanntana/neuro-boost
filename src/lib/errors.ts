import { logError } from './logger';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden access') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request') {
    super(message, 400, 'BAD_REQUEST');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

export const handleError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    logError(error);
    return new AppError(
      process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : error.message
    );
  }

  logError(new Error('Unknown error occurred'), { error });
  return new AppError('An unexpected error occurred');
};

export const createErrorResponse = (error: AppError) => ({
  error: {
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
  },
  success: false,
  timestamp: new Date().toISOString(),
});