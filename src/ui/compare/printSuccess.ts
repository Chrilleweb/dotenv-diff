import chalk from 'chalk';

/**
 * Prints a success message when all keys match.
 * @param json Whether to output in JSON format.
 */
export function printSuccess(json: boolean) {
  if (json) return;
  
  console.log(chalk.green('✅ All keys match.'));
  console.log();
}