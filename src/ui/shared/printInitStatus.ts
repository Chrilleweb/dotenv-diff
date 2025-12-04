import chalk from 'chalk';

/**
 * Printed when the config file is successfully created
 * @param path - The path to the created config file
 * @returns void
 */
export function printInitSuccess(path: string): void {
  console.log();
  console.log(chalk.green('✅ Created dotenv-diff.config.json'));
  console.log(chalk.dim(`   → ${path}`));
  console.log();
}

/**
 * Printed when config file already exists
 * @param path - The path to the existing config file
 * @returns void
 */
export function printInitExists(path: string): void {
  console.log();
  console.log(chalk.yellow('⚠️  dotenv-diff.config.json already exists.'));
  console.log(chalk.dim(`   → ${path}`));
  console.log();
}
