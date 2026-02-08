import chalk from 'chalk';

/**
 * Result of the auto-fix operation to be printed to the user.
 */
interface AutoFixResult {
  /** List of duplicate keys removed from the environment file */
  removedDuplicates: string[];
  /** List of missing keys added to the environment file */
  addedEnv: string[];
}

/**
 * Prints the result of the auto-fix operation.
 * @param changed - Whether any changes were made.
 * @param result - The result of the auto-fix operation.
 * @param envName - The name of the environment file.
 * @param exampleName - The name of the example file.
 * @param json - Whether to output in JSON format.
 * @returns void
 */
export function printAutoFix(
  changed: boolean,
  result: AutoFixResult,
  envName: string,
  exampleName: string,
  json: boolean,
  gitignoreUpdated: boolean,
): void {
  if (json) return;

  if (changed) {
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
    if (gitignoreUpdated) {
      console.log(chalk.green(`  - Added ${envName} to .gitignore`));
    }
  } else {
    console.log(chalk.green('✅ Auto-fix applied: no changes needed.'));
  }
  console.log();
}
