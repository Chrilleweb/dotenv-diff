type Pattern = {
  name: 'process.env' | 'import.meta.env' | 'sveltekit';
  regex: RegExp;
  processor?: (match: RegExpExecArray) => string[];
};

/**
 * Framework-specific regex patterns for detecting environment variable usage
 * across different runtimes and frameworks.
 */
export const ENV_PATTERNS: Pattern[] = [
  /**
   * Matches process.env.KEY references in source code.
   * Supports both dot notation and bracket notation.
   *
   * Examples:
   *   process.env.MY_KEY
   *   process.env["MY_KEY"]
   *   process.env['MY_KEY']
   */
  {
    name: 'process.env',
    regex:
      /process\.env\.([A-Z_][A-Z0-9_]*)|process\.env\[['"]([A-Z_][A-Z0-9_]*)['"]]/g,
    processor: (match) => {
      // match[1] covers dot notation: process.env.KEY
      // match[2] covers bracket notation: process.env['KEY']
      const variable = match[1] || match[2];
      return variable ? [variable] : [];
    },
  },

  /**
   * Matches object destructuring from process.env.
   * Captures the full object pattern between braces for further parsing.
   *
   * Example:
   *   const { MY_KEY, OTHER_KEY: alias, THIRD_KEY = "fallback" } = process.env
   */
  {
    name: 'process.env',
    regex: /\{([^}]*)\}\s*=\s*process\.env\b/g,
    processor: (match) => {
      const content = match[1];
      if (!content) return [];

      return content
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          // Handle aliases: MY_KEY: alias
          // Handle defaults: MY_KEY = "value"
          // We want the left-most identifier
          const [key] = part.split(/[:=]/);
          return key ? key.trim() : '';
        })
        .filter((key) => /^[A-Z_][A-Z0-9_]*$/.test(key));
    },
  },

  /**
   * Matches import.meta.env.KEY references in source code.
   * Supports both dot notation and bracket notation.
   *
   * Examples:
   *   import.meta.env.MY_KEY
   *   import.meta.env["MY_KEY"]
   *   import.meta.env['MY_KEY']
   */
  {
    name: 'import.meta.env',
    regex:
      /import\.meta\.env\.([A-Z_][A-Z0-9_]*)|import\.meta\.env\[['"]([A-Z_][A-Z0-9_]*)['"]]/g,
    processor: (match) => {
      const variable = match[1] || match[2];
      return variable ? [variable] : [];
    },
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
