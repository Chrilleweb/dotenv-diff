import chalk from 'chalk';

/**
 * Printed when the config file is successfully created
 */
export function printInitSuccess(path: string) {
  console.log();
  console.log(chalk.green('✅ Created dotenv-diff.config.json'));
  console.log(chalk.dim(`   → ${path}`));
  console.log();
}

/**
 * Printed when config file already exists
 */
export function printInitExists(path: string) {
  console.log();
  console.log(chalk.yellow('⚠️  dotenv-diff.config.json already exists.'));
  console.log(chalk.dim(`   → ${path}`));
  console.log();
}
