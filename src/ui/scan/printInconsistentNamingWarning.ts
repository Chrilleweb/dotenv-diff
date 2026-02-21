import chalk from 'chalk';
import type { InconsistentNamingWarning } from '../../config/types.js';

/**
 * Prints warnings about inconsistent naming patterns in environment variables.
 * @param warnings Array of inconsistent naming warnings
 * @returns void
 */
export function printInconsistentNamingWarning(
  warnings: InconsistentNamingWarning[],
) {
  if (warnings.length === 0) {
    return;
  }

  console.log(chalk.yellow('⚠️  Inconsistent naming found:'));

  for (const { key1, key2, suggestion } of warnings) {
    console.log(chalk.yellow(`   - ${chalk.cyan(key1)} ↔ ${chalk.cyan(key2)}`));
    console.log(chalk.gray(`     Suggested name: ${suggestion}`));
  }

  console.log();
}
