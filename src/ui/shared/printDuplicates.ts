import chalk from 'chalk';

/**
 * Prints duplicate keys found in the environment and example files.
 * @param envName The name of the environment file.
 * @param exampleName The name of the example file.
 * @param dEnv Array of duplicate keys in the environment file with their counts.
 * @param dEx Array of duplicate keys in the example file with their counts.
 * @param json Whether to output in JSON format.
 * @returns void
 */
export function printDuplicates(
  envName: string,
  exampleName: string,
  dEnv: Array<{ key: string; count: number }>,
  dEx: Array<{ key: string; count: number }>,
  json: boolean,
) {
  if (json) return;
  if (dEnv.length) {
    console.log(
      chalk.yellow(`⚠️  Duplicate keys in ${envName} (last occurrence wins):`),
    );
    dEnv.forEach(({ key, count }) =>
      console.log(chalk.yellow(`    - ${key} (${count} occurrences)`)),
    );
    console.log();
  }
  if (dEx.length) {
    console.log(
      chalk.yellow(
        `⚠️  Duplicate keys in ${exampleName} (last occurrence wins):`,
      ),
    );
    dEx.forEach(({ key, count }) =>
      console.log(chalk.yellow(`   - ${key} (${count} occurrences)`)),
    );
    console.log();
  }
}