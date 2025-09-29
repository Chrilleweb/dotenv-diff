import chalk from 'chalk';

export interface AutoFixResult {
  removedDuplicates: string[];
  addedEnv: string[];
  addedExample: string[];
}

export function printAutoFix(
  changed: boolean,
  result: AutoFixResult,
  envName: string,
  exampleName: string,
  json: boolean | undefined,
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
    if (result.addedExample.length) {
      console.log(
        chalk.green(
          `  - Synced ${result.addedExample.length} keys to ${exampleName}: ${result.addedExample.join(', ')}`,
        ),
      );
    }
  } else {
    console.log(chalk.green('✅ Auto-fix applied: no changes needed.'));
  }
  console.log();
}
