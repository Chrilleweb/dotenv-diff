import fs from 'fs';
import path from 'path';
import type { ScanUsageOptions, ComparisonFile } from '../../config/types.js';
import { resolveFromCwd } from '../helpers/resolveFromCwd.js';
import { DEFAULT_ENV_CANDIDATES } from '../../config/constants.js';
import { normalizePath } from '../helpers/normalizePath.js';

/**
 * Result of determining the comparison file, either found with details or none
 */
type ComparisonResolution =
  | { type: 'found'; file: ComparisonFile }
  | { type: 'none' };

/**
 * Determines which file to use for comparison based on provided options
 * @param {ScanUsageOptions} opts - Scan configuration options
 * @returns Comparison file info with absolute path and basename, or undefined if not found
 */
export async function determineComparisonFile(
  opts: ScanUsageOptions,
): Promise<ComparisonResolution> {
  // Priority: explicit flags first, then auto-discovery

  if (opts.examplePath) {
    const p = resolveFromCwd(opts.cwd, opts.examplePath);
    if (fs.existsSync(p)) {
      return {
        type: 'found',
        file: { path: normalizePath(p), name: path.basename(opts.examplePath) },
      };
    }
  }

  if (opts.envPath) {
    const p = resolveFromCwd(opts.cwd, opts.envPath);
    if (fs.existsSync(p)) {
      return {
        type: 'found',
        file: { path: normalizePath(p), name: path.basename(opts.envPath) },
      };
    }
  }

  // Auto-discovery: look for common env files relative to cwd
  for (const candidate of DEFAULT_ENV_CANDIDATES) {
    const fullPath = path.resolve(opts.cwd, candidate);
    if (fs.existsSync(fullPath)) {
      return {
        type: 'found',
        file: { path: normalizePath(fullPath), name: candidate },
      };
    }
  }

  return { type: 'none' };
}
