import chalk from 'chalk';
import { type Options } from '../../config/types.js';

/**
 * @param opts - Options containing noColor flag
 * @returns void
 */
export function setupGlobalConfig(opts: Options): void {
  if (opts.noColor) {
    chalk.level = 0; // disable colors globally
  }
}
