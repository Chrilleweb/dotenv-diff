import chalk from 'chalk';

/**
 * Prints message when dotenv-diff.config.json is successfully loaded.
 * @param path Path to the config file
 */
export function printConfigLoaded(path: string) {
  console.log();
  console.log(`${chalk.cyan('🧩 Loaded config:')} ${chalk.dim(path)}`);
}

/**
 * Prints message when dotenv-diff.config.json fails to parse.
 * @param error The thrown error
 */
export function printConfigLoadError(error: unknown) {
  console.error(chalk.red('❌ Failed to parse dotenv-diff.config.json:'));
  if (error instanceof Error) {
    console.error(chalk.red(`  ${error.message}`));
  } else {
    console.error(chalk.red(String(error)));
  }
}
