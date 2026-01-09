/**
 * Constants used across the application
 */
export const DEFAULT_ENV_FILE = '.env';
export const DEFAULT_EXAMPLE_FILE = '.env.example';
export const GIT_DIR = '.git';
export const GITIGNORE_FILE = '.gitignore';

/**
 * Common default candidates for environment files
 */
export const DEFAULT_ENV_CANDIDATES = [
  DEFAULT_ENV_FILE,
  DEFAULT_EXAMPLE_FILE,
  '.env.local',
  '.env.production',
] as const;

/**
 * Gitignore patterns for env files
 */
export const DEFAULT_GITIGNORE_ENV_PATTERNS = [DEFAULT_ENV_FILE] as const;
