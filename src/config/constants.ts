/**
 * Constants used across the application
 */
export const DEFAULT_ENV_FILE = '.env';
export const DEFAULT_EXAMPLE_FILE = '.env.example';

/**
 * Common default candidates for environment files
 */
export const DEFAULT_ENV_CANDIDATES = [
  DEFAULT_ENV_FILE,
  DEFAULT_EXAMPLE_FILE,
  '.env.local',
  '.env.production',
] as const;