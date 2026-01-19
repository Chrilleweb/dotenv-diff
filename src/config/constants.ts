/**
 * Default name for the primary environment file containing actual values.
 * This file should typically be git-ignored as it may contain secrets.
 * @example '.env'
 */
export const DEFAULT_ENV_FILE = '.env';

/**
 * Default name for the example/template environment file.
 * This file should be committed to version control to document required variables.
 * @example '.env.example'
 */
export const DEFAULT_EXAMPLE_FILE = '.env.example';

/**
 * Name of the git directory used to detect repository root.
 */
export const GIT_DIR = '.git';

/**
 * Name of the gitignore file used to check if env files are properly ignored.
 */
export const GITIGNORE_FILE = '.gitignore';

/**
 * Common environment file variants checked during auto-discovery.
 * Listed in priority order - earlier entries are preferred when multiple exist.
 *
 * @remarks
 * - `.env` - Primary environment file (should be git-ignored)
 * - `.env.example` - Template file (should be committed)
 * - `.env.local` - Local overrides (should be git-ignored)
 * - `.env.production` - Production-specific values (should be git-ignored)
 */
export const DEFAULT_ENV_CANDIDATES = [
  DEFAULT_ENV_FILE,
  DEFAULT_EXAMPLE_FILE,
  '.env.local',
  '.env.production',
] as const;

/**
 * Patterns to check for in .gitignore when validating env file safety.
 * These files should always be git-ignored to prevent committing secrets.
 */
export const DEFAULT_GITIGNORE_ENV_PATTERNS = [DEFAULT_ENV_FILE] as const;

/**
 * Allowed categories for filtering comparison results.
 * These categories can be used to focus on specific types of differences.
 */
export const ALLOWED_CATEGORIES = [
  'missing',
  'extra',
  'empty',
  'mismatch',
  'duplicate',
  'gitignore',
] as const;

/**
 * Reasons for skipping a file pair during comparison in compareMany().
 */
export const SKIP_REASONS = {
  ENV_MISSING: 'env-missing',
  EXAMPLE_MISSING: 'example-missing',
  BOTH_MISSING: 'both-missing',
} as const;