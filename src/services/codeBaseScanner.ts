import fs from 'fs/promises';
import path from 'path';

export interface EnvUsage {
  variable: string;
  file: string;
  line: number;
  column: number;
  pattern:
    | 'process.env'
    | 'import.meta.env'
    | 'sveltekit'
    | 'deno'
    | 'next'
    | 'nuxt';
  context: string; // The actual line content
}

export interface ScanOptions {
  cwd: string;
  include: string[];
  exclude: string[];
  ignore: string[];
  ignoreRegex: RegExp[];
}

export interface ScanResult {
  used: EnvUsage[];
  missing: string[];
  unused: string[];
  stats: {
    filesScanned: number;
    totalUsages: number;
    uniqueVariables: number;
  };
}

// Framework-specific patterns for finding environment variable usage
const ENV_PATTERNS = [
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
];

const DEFAULT_INCLUDE_EXTENSIONS = [
  '.js',
  '.ts',
  '.jsx',
  '.tsx',
  '.vue',
  '.svelte',
  '.mjs',
  '.cjs',
];

const DEFAULT_EXCLUDE_PATTERNS = [
  'node_modules',
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

/**
 * Scans the codebase for environment variable usage based on the provided options.
 * @param opts - Options for scanning the codebase.
 * @returns A promise that resolves to the scan result containing used, missing, and unused variables.
 */
export async function scanCodebase(opts: ScanOptions): Promise<ScanResult> {
  const files = await findFiles(opts.cwd, {
    include: opts.include,
    exclude: [...DEFAULT_EXCLUDE_PATTERNS, ...opts.exclude],
  });

  const allUsages: EnvUsage[] = [];
  let filesScanned = 0;

  for (const filePath of files) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const fileUsages = await scanFile(filePath, content, opts);
      allUsages.push(...fileUsages);
      filesScanned++;
    } catch {
      // Skip files we can't read (binary, permissions, etc.)
      continue;
    }
  }

  // Filter out ignored variables
  const filteredUsages = allUsages.filter(
    (usage) =>
      !opts.ignore.includes(usage.variable) &&
      !opts.ignoreRegex.some((regex) => regex.test(usage.variable)),
  );

  const uniqueVariables = [...new Set(filteredUsages.map((u) => u.variable))];

  return {
    used: filteredUsages,
    missing: [],
    unused: [],
    stats: {
      filesScanned,
      totalUsages: filteredUsages.length,
      uniqueVariables: uniqueVariables.length,
    },
  };
}

/**
 * Recursively finds all files in the given directory matching the include patterns,
 * while excluding files and directories that match the exclude patterns.
 * @param rootDir The root directory to start searching from.
 * @param opts Options for include and exclude patterns.
 * @returns A promise that resolves to an array of file paths.
 */
async function findFiles(
  rootDir: string,
  opts: { include: string[]; exclude: string[] },
): Promise<string[]> {
  const files: string[] = [];

  async function walk(currentDir: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      // Skip directories we can't read (permissions, etc.)
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(rootDir, fullPath);

      // Check if should be excluded (directory or file)
      if (shouldExclude(entry.name, relativePath, opts.exclude)) {
        continue;
      }

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (
        entry.isFile() &&
        shouldInclude(entry.name, relativePath, opts.include)
      ) {
        files.push(fullPath);
      }
    }
  }

  await walk(rootDir);
  return files;
}

/**
 * Check if a file should be included based on its name, path, and include patterns.
 * @param fileName The name of the file.
 * @param relativePath The relative path of the file.
 * @param patterns The include patterns to match against.
 * @returns True if the file should be included, false otherwise.
 */
function shouldInclude(
  fileName: string,
  relativePath: string,
  patterns: string[],
): boolean {
  // If no include patterns specified, use default extensions
  if (!patterns.length) {
    return DEFAULT_INCLUDE_EXTENSIONS.some((ext) => fileName.endsWith(ext));
  }

  return patterns.some((pattern) => {
    if (pattern.startsWith('**')) {
      // Handle **/*.ext patterns
      const ext = pattern.substring(pattern.lastIndexOf('.'));
      return fileName.endsWith(ext);
    } else if (pattern.includes('*')) {
      // Simple glob pattern matching
      return matchesGlobPattern(relativePath, pattern);
    } else {
      // Exact match or extension
      return relativePath.includes(pattern) || fileName.endsWith(pattern);
    }
  });
}

function shouldExclude(
  fileName: string,
  relativePath: string,
  patterns: string[],
): boolean {
  // Check if filename or any part of the path should be excluded
  return patterns.some((pattern) => {
    // Direct name match (like 'node_modules')
    if (fileName === pattern) return true;

    // Path contains pattern
    if (relativePath.includes(pattern)) return true;

    // Pattern matching for extensions and wildcards
    if (pattern.includes('*')) {
      return matchesGlobPattern(relativePath, pattern);
    }

    // Special case for test files
    if (pattern.includes('.test.') && fileName.includes('.test.')) return true;
    if (pattern.includes('.spec.') && fileName.includes('.spec.')) return true;

    return false;
  });
}

function matchesGlobPattern(filePath: string, pattern: string): boolean {
  // Convert simple glob patterns to regex
  // This handles basic cases like *.js, **/*.ts, etc.
  const regexPattern = pattern
    .replace(/\*\*/g, '.*') // ** matches any path
    .replace(/\*/g, '[^/]*') // * matches any filename chars (not path separators)
    .replace(/\./g, '\\.') // Escape dots
    .replace(/\//g, '[/\\\\]'); // Handle both forward and back slashes

  const regex = new RegExp(`^${regexPattern}$`, 'i'); // Case insensitive
  return regex.test(filePath.replace(/\\/g, '/')); // Normalize path separators
}

async function scanFile(
  filePath: string,
  content: string,
  opts: ScanOptions,
): Promise<EnvUsage[]> {
  const usages: EnvUsage[] = [];
  const lines = content.split('\n');
  const relativePath = path.relative(opts.cwd, filePath);

  for (const pattern of ENV_PATTERNS) {
    let match;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);

    while ((match = regex.exec(content)) !== null) {
      const variable = match[1];
      const matchIndex = match.index;

      // Find line and column
      const beforeMatch = content.substring(0, matchIndex);
      const lineNumber = beforeMatch.split('\n').length;
      const lastNewlineIndex = beforeMatch.lastIndexOf('\n');
      const column = matchIndex - lastNewlineIndex;

      // Get the context (the actual line)
      const contextLine = lines[lineNumber - 1]?.trim() || '';

      usages.push({
        variable,
        file: relativePath,
        line: lineNumber,
        column,
        pattern: pattern.name,
        context: contextLine,
      });
    }
  }

  return usages;
}

export function compareWithEnvFiles(
  scanResult: ScanResult,
  envVariables: Record<string, string | undefined>,
): ScanResult {
  const usedVariables = new Set(scanResult.used.map((u) => u.variable));
  const envKeys = new Set(Object.keys(envVariables));

  const missing = [...usedVariables].filter((v) => !envKeys.has(v));
  const unused = [...envKeys].filter((v) => !usedVariables.has(v));

  return {
    ...scanResult,
    missing,
    unused,
  };
}
