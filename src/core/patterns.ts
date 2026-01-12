// Framework-specific patterns for finding environment variable usage
export const ENV_PATTERNS = [
  {
    name: 'process.env' as const,
    regex: /process\.env\.([A-Z_][A-Z0-9_]*)/g,
  },
  {
    name: 'import.meta.env' as const,
    regex: /import\.meta\.env\.([A-Z_][A-Z0-9_]*)/g,
  },
  {
    name: 'sveltekit' as const,
    regex: /\$env\/(?:static|dynamic)\/(?:private|public)\/([A-Z_][A-Z0-9_]*)/g,
  },
  {
    name: 'sveltekit' as const,
    // matches import { SECRET }  from '$env/dynamic/private';
    regex:
      /import\s*\{\s*([A-Z_][A-Z0-9_]*)\s*\}\s*from\s*['"]\$env\/(?:static|dynamic)\/(?:private|public)['"]/g,
  },
  {
    name: 'sveltekit' as const,
    // matches: import SECRET from '$env/dynamic/private';
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
