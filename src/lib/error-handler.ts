import { logger } from './logger';
import { AppError } from '@/types';

export class ApplicationError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, any>;
  public readonly timestamp: string;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', details?: Record<string, any>) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  toJSON(): AppError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

export class NetworkError extends ApplicationError {
  constructor(message: string, status?: number, details?: Record<string, any>) {
    super(message, 'NETWORK_ERROR', { status, ...details });
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, field?: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', { field, ...details });
  }
}

export class ConfigurationError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'CONFIGURATION_ERROR', details);
  }
}

// Error handling utilities
export const handleError = (error: unknown, context?: string): AppError => {
  const contextPrefix = context ? `[${context}]` : '';
  
  if (error instanceof ApplicationError) {
    logger.error(`${contextPrefix} Application error:`, error.toJSON());
    return error.toJSON();
  }
  
  if (error instanceof Error) {
    const appError = new ApplicationError(error.message, 'GENERIC_ERROR');
    logger.error(`${contextPrefix} Generic error:`, appError.toJSON());
    return appError.toJSON();
  }
  
  const unknownError = new ApplicationError(
    'An unknown error occurred',
    'UNKNOWN_ERROR',
    { originalError: String(error) }
  );
  
  logger.error(`${contextPrefix} Unknown error:`, unknownError.toJSON());
  return unknownError.toJSON();
};

// Async error wrapper
export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: string
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const appError = handleError(error, context);
      throw new ApplicationError(appError.message, appError.code, appError.details);
    }
  };
};

// React error boundary utility
export const logErrorToBoundary = (error: Error, errorInfo: { componentStack: string }) => {
  logger.error('React Error Boundary caught an error:', {
    error: error.message,
    stack: error.stack,
    componentStack: errorInfo.componentStack,
  });
}; 