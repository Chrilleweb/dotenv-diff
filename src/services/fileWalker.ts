import fs from 'fs/promises';
import path from 'path';
import fsSync from 'fs';
import {
  DEFAULT_INCLUDE_EXTENSIONS,
  DEFAULT_EXCLUDE_PATTERNS,
} from '../core/patterns.js';

/**
 * Options for finding files
 */
interface FindFilesOptions {
  /** Include patterns for files to find */
  include?: string[];
  /** Exclude patterns for files to skip */
  exclude?: string[];
  /** Specific files to include (overrides include/exclude) */
  files?: string[];
}

/**
 * Recursively finds all files in the given directory matching the include patterns,
 * while excluding files and directories that match the exclude patterns.
 * @param rootDir The root directory to start searching from.
 * @param opts Options for include, exclude patterns and files override.
 * @returns A promise that resolves to an array of file paths.
 */
export async function findFiles(
  rootDir: string,
  opts: FindFilesOptions,
): Promise<string[]> {
  // If --files provided, keep existing replacement behavior
  if (opts.files && opts.files.length > 0) {
    return findFilesByPatterns(rootDir, opts.files);
  }

  const defaultPatterns = getDefaultPatterns();
  const rawInclude =
    opts.include && opts.include.length > 0
      ? [...defaultPatterns, ...opts.include]
      : defaultPatterns;
  const includePatterns = rawInclude.flatMap(expandBraceSets);

  const files: string[] = [];
  const walked = new Set<string>();

  // Compute additional roots for include patterns that point outside cwd or are absolute
  const extraRoots = new Set<string>();
  for (const p of includePatterns) {
    const hasParentEscape = p.includes('..') || path.isAbsolute(p);
    if (!hasParentEscape) continue;
    const dir = getPatternBaseDir(rootDir, p);
    if (dir && !dir.startsWith(rootDir)) {
      extraRoots.add(dir);
    }
  }

  /**
   * Walks the directory tree starting from startDir
   * @param startDir The directory to start walking from
   * @returns void
   */
  async function walk(startDir: string): Promise<void> {
    // prevent duplicate subtree walks
    const key = path.resolve(startDir);
    if (walked.has(key)) return;
    walked.add(key);

    let entries;
    try {
      entries = await fs.readdir(startDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(startDir, entry.name);
      const relativeToRoot = path.relative(rootDir, fullPath);

      // Exclude checks should use path relative to *rootDir* (keeps existing semantics)
      if (
        shouldExclude(entry.name, relativeToRoot, [
          ...DEFAULT_EXCLUDE_PATTERNS,
          ...(opts.exclude ?? []),
        ])
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (
        entry.isFile() &&
        shouldInclude(entry.name, relativeToRoot, includePatterns)
      ) {
        files.push(fullPath);
      }
    }
  }

  // Walk root first (current behavior)
  await walk(rootDir);

  // Walk any extra roots (e.g., ../../packages/…)
  for (const r of extraRoots) {
    await walk(r);
  }

  return files;
}

/**
 * Expands brace sets in a glob pattern.
 * @param pattern - The glob pattern to expand.
 * @returns An array of expanded glob patterns.
 */
export function expandBraceSets(pattern: string): string[] {
  // Single-level brace expansion: **/*.{js,ts,svelte} -> [**/*.js, **/*.ts, **/*.svelte]
  const m = pattern.match(/\{([^}]+)\}/);
  if (!m || m[1] === undefined) return [pattern];
  const variants = m[1]
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const prefix = pattern.slice(0, m.index!);
  const suffix = pattern.slice((m.index as number) + m[0].length);
  return variants.flatMap((v) => expandBraceSets(`${prefix}${v}${suffix}`));
}

/**
 * Gets the base directory for a glob pattern.
 * @param rootDir The root directory to resolve against.
 * @param pattern The glob pattern to analyze.
 * @returns The base directory for the pattern, or null if not found.
 */
export function getPatternBaseDir(
  rootDir: string,
  pattern: string,
): string | null {
  // Stop at first glob char — DO NOT include '/' here
  const idx = pattern.search(/[*?\[\]{}]/); // <— removed '/'
  const raw = idx === -1 ? pattern : pattern.slice(0, idx);
  const base = path.isAbsolute(raw) ? raw : path.resolve(rootDir, raw);

  try {
    const st = fsSync.statSync(base);
    if (st.isDirectory()) return base;
    if (st.isFile()) return path.dirname(base);
  } catch {
    const dir = path.dirname(base);
    try {
      const st2 = fsSync.statSync(dir);
      if (st2.isDirectory()) return dir;
    } catch {}
  }
  return null;
}

/**
 * Find files using the --files patterns (complete replacement mode)
 * @param rootDir The root directory to search within.
 * @param patterns The glob patterns to match files against.
 * @returns A promise that resolves to an array of matching file paths.
 */
export async function findFilesByPatterns(
  rootDir: string,
  patterns: string[],
): Promise<string[]> {
  const expanded = patterns.flatMap(expandBraceSets);
  const files: string[] = [];

  async function walk(currentDir: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(rootDir, fullPath);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (
        entry.isFile() &&
        shouldInclude(entry.name, relativePath, expanded)
      ) {
        files.push(fullPath);
      }
    }
  }

  await walk(rootDir);
  return files;
}

/**
 * Generate default patterns from extensions
 * @returns An array of default glob patterns.
 */
export function getDefaultPatterns(): string[] {
  return DEFAULT_INCLUDE_EXTENSIONS.map((ext) => `**/*${ext}`);
}

/**
 * Check if a file should be included based on its name, path, and include patterns.
 * @param fileName The name of the file.
 * @param relativePath The relative path of the file.
 * @param patterns The include patterns to match against.
 * @returns True if the file should be included, false otherwise.
 */
export function shouldInclude(
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
      return relativePath.endsWith(pattern) || fileName.endsWith(pattern);
    }
  });
}

/**
 * Checks if a file should be excluded based on its name, path, and exclude patterns.
 * @param fileName The name of the file.
 * @param relativePath The relative path of the file.
 * @param patterns The exclude patterns to match against.
 * @returns True if the file should be excluded, false otherwise.
 */
export function shouldExclude(
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

    return false;
  });
}

/**
 * Checks if a file path matches a glob pattern.
 * A glob pattern is a string that may contain special characters like '*', '**', and '?' to represent wildcards and variable parts of the path.
 * @param filePath The path of the file to check.
 * @param pattern The glob pattern to match against.
 * @returns True if the file path matches the pattern, false otherwise.
 */
export function matchesGlobPattern(filePath: string, pattern: string): boolean {
  const hasSep = /[\/\\]/.test(pattern);
  const subject = hasSep ? filePath : path.basename(filePath);

  const normalized = subject.replace(/\\/g, '/');
  let normalizedPattern = pattern.replace(/\\/g, '/');

  let regexPattern = normalizedPattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '___DOUBLESTAR___')
    .replace(/\*/g, '[^/]*')
    .replace(/___DOUBLESTAR___/g, '.*')
    .replace(/\?/g, '[^/]');

  const re = new RegExp(`^${regexPattern}$`, 'i');
  return re.test(normalized);
}
