import chalk from 'chalk';
import type { T3EnvWarning } from '../../config/types.js';

/**
 * Prints t3-env validation warnings to the console.
 * @param warnings - List of t3-env validation warnings
 * @param json - Whether to output in JSON format
 */
export function printT3EnvWarnings(
  warnings: T3EnvWarning[],
  json: boolean,
): void {
  if (!warnings || warnings.length === 0) return;

  if (json) {
    console.log(JSON.stringify({ t3EnvWarnings: warnings }, null, 2));
    return;
  }

  console.log(chalk.yellow('⚠️  T3-env validation issues:'));

  for (const w of warnings) {
    console.log(
      chalk.yellow(`   - ${w.variable} (${w.file}:${w.line}) → ${w.reason}`),
    );
  }

  console.log();
}
