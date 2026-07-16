import fs from 'fs';
import path from 'path';
import type { EnvScope } from '../config/types.js';
import { parseEnvFile } from './parseEnvFile.js';
import { shouldExclude } from './fileWalker.js';
import { filterIgnoredKeys } from '../core/helpers/filterIgnoredKeys.js';
import { normalizePath } from '../core/helpers/normalizePath.js';
import { DEFAULT_EXCLUDE_PATTERNS } from '../core/scan/patterns.js';

/**
 * Matches example/template env files that document required keys:
 * `.env.example`, `.env-example`, `.env.sample`, `.env.template` (case-insensitive).
 */
const EXAMPLE_FILE_PATTERN = /^\.env[.-](example|sample|template)$/i;

/**
 * Options for discovering example scopes.
 */
interface DiscoverExampleScopesOptions {
  /** Extra exclude patterns (added to the default scan excludes). */
  exclude?: string[];
  /** Keys to ignore when building each scope's key set. */
  ignore?: string[];
  /** Regex patterns of keys to ignore when building each scope's key set. */
  ignoreRegex?: RegExp[];
}

/**
 * Discovers `.env.example`-style files in subdirectories of `cwd` and returns the
 * documented keys for each, scoped to the directory the file lives in.
 *
 * Files at the root of `cwd` are intentionally skipped: the root is already covered
 * by the primary comparison file, so only nested scopes are returned here. Excluded
 * directories (e.g. `node_modules`) are skipped using the same rules as the code scan.
 *
 * @param cwd - The directory to search from.
 * @param opts - Exclude and ignore configuration.
 * @returns One scope per discovered nested example file, sorted by directory depth (deepest first).
 */
export function discoverExampleScopes(
  cwd: string,
  opts: DiscoverExampleScopesOptions = {},
): EnvScope[] {
  const excludePatterns = [
    ...DEFAULT_EXCLUDE_PATTERNS,
    ...(opts.exclude ?? []),
  ];
  const ignore = opts.ignore ?? [];
  const ignoreRegex = opts.ignoreRegex ?? [];

  const scopes: EnvScope[] = [];

  const walk = (absDir: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(absDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const abs = path.join(absDir, entry.name);
      const rel = normalizePath(path.relative(cwd, abs));

      if (entry.isDirectory()) {
        if (shouldExclude(entry.name, rel, excludePatterns)) continue;
        walk(abs);
        continue;
      }

      if (!entry.isFile() || !EXAMPLE_FILE_PATTERN.test(entry.name)) continue;

      const relDir = normalizePath(path.relative(cwd, absDir));
      // Root example files are already handled by the primary comparison file.
      if (relDir === '' || relDir === '.') continue;

      const keys = filterIgnoredKeys(
        Object.keys(parseEnvFile(abs)),
        ignore,
        ignoreRegex,
      );
      scopes.push({ dir: relDir, keys: new Set(keys) });
    }
  };

  walk(cwd);

  // Deepest scopes first so "nearest wins" callers can short-circuit naturally.
  return scopes.sort((a, b) => depth(b.dir) - depth(a.dir));
}

/**
 * Counts the directory depth of a forward-slashed relative path.
 * @param dir - The relative directory path.
 * @returns The number of path segments.
 */
function depth(dir: string): number {
  return dir.split('/').length;
}
