import chalk from 'chalk';
import path from 'path';

/**
 * Prints message when dotenv-diff.config.json is successfully loaded.
 * @param filePath The path to the loaded config file
 * @returns void
 */
export function printConfigLoaded(filePath: string): void {
  const fileName = path.basename(filePath);

  console.log();
  console.log(`${chalk.cyan('🧩 Loaded config:')} ${chalk.dim(fileName)}`);
}

/**
 * Prints message when dotenv-diff.config.json fails to parse.
 * @param error The thrown error
 * @returns void
 */
export function printConfigLoadError(error: unknown): void {
  console.error(chalk.red('❌ Failed to parse dotenv-diff.config.json:'));
  if (error instanceof Error) {
    console.error(chalk.red(`  ${error.message}`));
  } else {
    console.error(chalk.red(String(error)));
  }
}
