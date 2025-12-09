import chalk from 'chalk';
import type { InconsistentNamingWarning } from '../../config/types.js';

/**
 * Prints warnings about inconsistent naming patterns in environment variables.
 * @param warnings Array of inconsistent naming warnings
 * @param isJson Whether to output in JSON format
 * @returns void
 */
export function printInconsistentNamingWarning(
  warnings: InconsistentNamingWarning[],
  isJson: boolean,
) {
  if (isJson || warnings.length === 0) {
    return;
  }

  console.log(chalk.yellow('⚠️  Inconsistent naming found:'));

  for (const warning of warnings) {
    console.log(
      chalk.yellow(
        `   You have both ${chalk.cyan(warning.key1)} and ${chalk.cyan(warning.key2)} (inconsistent naming)`,
      ),
    );
    console.log(chalk.gray(`   ${warning.suggestion}`));
  }

  console.log();
}
