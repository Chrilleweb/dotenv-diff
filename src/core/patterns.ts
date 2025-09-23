// Framework-specific patterns for finding environment variable usage
export const ENV_PATTERNS = [
  {
    name: 'process.env' as const,
    regex: /process\.env\.([A-Z_][A-Z0-9_]*)/g,
    frameworks: ['node', 'next', 'general'],
  },
  {
    name: 'import.meta.env' as const,
    regex: /import\.meta\.env\.([A-Z_][A-Z0-9_]*)/g,
    frameworks: ['vite', 'svelte', 'vue'],
  },
  {
    name: 'sveltekit' as const,
    regex: /\$env\/(?:static|dynamic)\/(?:private|public)\/([A-Z_][A-Z0-9_]*)/g,
    frameworks: ['sveltekit'],
  },
  {
    name: 'deno' as const,
    regex: /Deno\.env\.get\(['"`]([A-Z_][A-Z0-9_]*)['"`]\)/g,
    frameworks: ['deno'],
  },
  {
    name: 'next' as const,
    regex: /process\.env\.(NEXT_PUBLIC_[A-Z_][A-Z0-9_]*)/g,
    frameworks: ['next'],
  },
  {
    name: 'nuxt' as const,
    regex: /(?:\$config|useRuntimeConfig\(\))\.([A-Z_][A-Z0-9_]*)/g,
    frameworks: ['nuxt'],
  },
{
  name: 'php' as const,
  regex: /(getenv\(['"`]([A-Z_][A-Z0-9_]*)['"`]\)|\$_ENV\[['"`]([A-Z_][A-Z0-9_]*)['"`]\])/g,
  frameworks: ['php'],
}

];

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