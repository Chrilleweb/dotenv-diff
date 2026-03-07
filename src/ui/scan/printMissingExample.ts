import fs from 'fs';
import path from 'path';
import { resolveFromCwd } from '../../core/helpers/resolveFromCwd.js';
import type { ScanUsageOptions } from '../../config/types.js';
import { label, error, warning, divider, header } from '../theme.js';

/**
 * Print message if the specified example file is missing.
 * Handles CI vs interactive mode output.
 * @param opts Scan options
 * @returns true if missing and in CI mode (should exit), false otherwise
 */
export function printMissingExample(opts: ScanUsageOptions): boolean {
  if (!opts.examplePath) return false;

  const exampleAbs = resolveFromCwd(opts.cwd, opts.examplePath);
  const missing = !fs.existsSync(exampleAbs);

  if (!missing) return false;

  const fileName = path.basename(opts.examplePath);
  const indicator = opts.isCiMode ? error('▸') : warning('▸');

  console.log();
  console.log(`${indicator} ${header('Missing example file')}`);
  console.log(`${divider}`);
  console.log(
    `${label('File'.padEnd(26))}${(opts.isCiMode ? error : warning)(fileName)}`,
  );
  console.log(`${divider}`);

  return opts.isCiMode ?? false;
}
