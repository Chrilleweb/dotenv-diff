import chalk from 'chalk';

/**
 * Prints the header for the comparison output.
 * @param envName The name of the environment file.
 * @param exampleName The name of the example file.
 * @param json Whether to output in JSON format.
 * @param skipping Whether the comparison is being skipped.
 * @returns void
 */
export function printHeader(
  envName: string,
  exampleName: string,
  json: boolean,
): void {
  if (json) return;
  console.log();
  console.log(chalk.blue(`🔍 Comparing ${envName} ↔ ${exampleName}...`));
  console.log();
}
