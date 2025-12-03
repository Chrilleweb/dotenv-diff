import fs from 'fs';
import path from 'path';
import { type ScanUsageOptions } from '../config/types.js';
import { resolveFromCwd } from './helpers/resolveFromCwd.js';

/**
 * Determines which file to use for comparison based on provided options
 * @param {ScanUsageOptions} opts - Scan configuration options
 * @returns {Object|null} - The comparison file information or undefined if not found
 */
export function determineComparisonFile(
  opts: ScanUsageOptions,
): { path: string; name: string } | undefined {
  // Priority: explicit flags first, then auto-discovery

  if (opts.noCompare) {
    return undefined;
  }
  if (opts.examplePath) {
    const p = resolveFromCwd(opts.cwd, opts.examplePath);
    if (fs.existsSync(p)) {
      return { path: p, name: path.basename(opts.examplePath) };
    }
  }

  if (opts.envPath) {
    const p = resolveFromCwd(opts.cwd, opts.envPath);
    if (fs.existsSync(p)) {
      return { path: p, name: path.basename(opts.envPath) };
    }
  }

  // Auto-discovery: look for common env files relative to cwd
  const candidates = ['.env', '.env.example', '.env.local', '.env.production'];
  for (const candidate of candidates) {
    const fullPath = path.resolve(opts.cwd, candidate);
    if (fs.existsSync(fullPath)) {
      return { path: fullPath, name: candidate };
    }
  }

  return undefined;
}
