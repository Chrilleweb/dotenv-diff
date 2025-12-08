import chalk from 'chalk';
import type { UppercaseWarning } from '../../config/types.js';

/**
 * Print warnings for environment variable keys that are not uppercase.
 *
 * @param warnings - List of non-uppercase env keys
 * @param comparedAgainst - The .env file name being checked
 * @param json - Whether JSON output is enabled
 */
export function printUppercaseWarning(
  warnings: UppercaseWarning[],
  comparedAgainst: string,
  json: boolean,
): void {
  if (json || warnings.length === 0) return;

  console.log(
    chalk.yellow(
      `⚠️  Variables not using uppercase naming (${comparedAgainst}):`,
    ),
  );

  warnings.forEach((w) => {
    console.log(chalk.yellow(`   - ${w.key}`));
    console.log(chalk.yellow.dim(`     Consider naming it: ${w.suggestion}`));
  });

  console.log();
}
