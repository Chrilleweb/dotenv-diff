import chalk from 'chalk';
import fs from 'fs';
import { resolveFromCwd } from '../../core/helpers/resolveFromCwd.js';
import type { ScanUsageOptions } from '../../config/types.js';

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

  console.log(''); // Add spacing before message
  if (missing) {
    const msgText = `Missing specified example file: ${opts.examplePath}`;
    if (opts.isCiMode) {
      console.log(chalk.red('❌ ' + msgText));
      return true;
    } else if (!opts.json) {
      console.log(chalk.yellow('⚠️  ' + msgText));
    }
  }

  return false;
}
