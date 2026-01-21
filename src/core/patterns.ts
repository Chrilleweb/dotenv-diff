/**
 * Framework-specific regex patterns for detecting environment variable usage
 * across different runtimes and frameworks.
 */
export const ENV_PATTERNS = [
  // process.env.X
  {
    name: 'process.env' as const,
    regex: /process\.env\.([A-Z_][A-Z0-9_]*)/g,
  },

  // import.meta.env.X
  {
    name: 'import.meta.env' as const,
    regex: /import\.meta\.env\.([A-Z_][A-Z0-9_]*)/g,
  },

  // SvelteKit static named imports
  // import { SECRET } from '$env/static/private';
  // import { PUBLIC_URL } from '$env/static/public';
  {
    name: 'sveltekit' as const,
    regex:
      /import\s*\{\s*([A-Z_][A-Z0-9_]*)\s*\}\s*from\s*['"]\$env\/static\/(?:private|public)['"]/g,
  },

  // SvelteKit dynamic env object
  // env.SECRET (Only matches .env variables accessed via env.VAR syntax)
  {
    name: 'sveltekit' as const,
    regex: /(?<![.\w])env\.([A-Z_][A-Z0-9_]*)/g,
  },

  // named import from dynamic is invalid in SvelteKit
  // import { env } from '$env/dynamic/private';
  {
    name: 'sveltekit' as const,
    regex:
      /import\s*\{\s*([A-Z_][A-Z0-9_]*)\s*\}\s*from\s*['"]\$env\/dynamic\/(?:private|public)['"]/g,
  },

  // default import from any $env module is invalid in SvelteKit
  // import SECRET from '$env/...';
  {
    name: 'sveltekit' as const,
    regex:
      /import\s+([A-Z_][A-Z0-9_]*)\s+from\s+['"]\$env\/(?:static|dynamic)\/(?:private|public)['"]/g,
  },
];

// Default file extensions to include in scans
export const DEFAULT_INCLUDE_EXTENSIONS = [
  '.js',
  '.ts',
  '.jsx',
  '.tsx',
  '.vue',
  '.svelte',
  '.mjs',
  '.cjs',
];

// Default patterns to exclude from scans
export const DEFAULT_EXCLUDE_PATTERNS = [
  'node_modules',
  '.sveltekit',
  '.svelte-kit',
  '_actions',
  'dist',
  'build',
  '.next',
  '.nuxt',
  'coverage',
  '.git',
  '.vscode',
  '.idea',
  '.test.',
  '.spec.',
  '__tests__',
  '__mocks__',
];
