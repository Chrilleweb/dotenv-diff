import chalk from 'chalk';
import type { FixContext } from '../../config/types.js';

/**
 * Prints the result of the auto-fix operation.
 * @param result - The result of the auto-fix operation.
 * @param envName - The name of the environment file.
 * @param json - Whether to output in JSON format.
 * @returns void
 */
export function printAutoFix(
  result: FixContext,
  envName: string,
  json: boolean,
): void {
  if (json) return;

  if (result.fixApplied) {
    console.log(chalk.green('✅ Auto-fix applied:'));
    if (result.removedDuplicates.length) {
      console.log(
        chalk.green(
          `  - Removed ${result.removedDuplicates.length} duplicate keys from ${envName}: ${result.removedDuplicates.join(', ')}`,
        ),
      );
    }
    if (result.addedEnv.length) {
      console.log(
        chalk.green(
          `  - Added ${result.addedEnv.length} missing keys to ${envName}: ${result.addedEnv.join(', ')}`,
        ),
      );
    }
    if (result.gitignoreUpdated) {
      console.log(chalk.green(`  - Added ${envName} to .gitignore`));
    }
  } else {
    console.log(chalk.green('✅ Auto-fix applied: no changes needed.'));
  }
  console.log();
}
