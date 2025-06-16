import { logger } from './logger';

interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  NEXT_PUBLIC_APP_VERSION: string;
  NEXT_PUBLIC_APP_NAME: string;
}

const DEFAULT_VALUES: Partial<EnvironmentConfig> = {
  NEXT_PUBLIC_APP_VERSION: '1.0.0',
  NEXT_PUBLIC_APP_NAME: 'A2A UI',
};

function validateEnvironment(): EnvironmentConfig {
  const env = process.env;

  const config: EnvironmentConfig = {
    NODE_ENV: (env.NODE_ENV as EnvironmentConfig['NODE_ENV']) || 'development',
    NEXT_PUBLIC_APP_VERSION: env.NEXT_PUBLIC_APP_VERSION || DEFAULT_VALUES.NEXT_PUBLIC_APP_VERSION!,
    NEXT_PUBLIC_APP_NAME: env.NEXT_PUBLIC_APP_NAME || DEFAULT_VALUES.NEXT_PUBLIC_APP_NAME!,
  };

  // Validate NODE_ENV
  if (!['development', 'production', 'test'].includes(config.NODE_ENV)) {
    throw new Error(`Invalid NODE_ENV: ${config.NODE_ENV}`);
  }

  // Log configuration in development
  if (config.NODE_ENV === 'development') {
    logger.info('Environment configuration loaded:', config);
  }

  return config;
}

export const ENV = validateEnvironment();

// Helper functions
export const isDevelopment = ENV.NODE_ENV === 'development';
export const isProduction = ENV.NODE_ENV === 'production';
export const isTest = ENV.NODE_ENV === 'test'; 