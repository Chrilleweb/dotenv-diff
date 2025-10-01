import chalk from 'chalk';
import path from 'path';

/**
 * Prints error messages if env/example files are missing.
 * @param envExists Whether the env file exists
 * @param exExists Whether the example file exists
 * @param envFlag The path to the env file
 * @param exampleFlag The path to the example file
 */
export function printErrorNotFound(
  envExists: boolean,
  exExists: boolean,
  envFlag: string,
  exampleFlag: string,
): void {
  if (!envExists) {
    console.error(
      chalk.red(`❌ Error: --env file not found: ${path.basename(envFlag)}`),
    );
  }
  if (!exExists) {
    console.error(
      chalk.red(`❌ Error: --example file not found: ${path.basename(exampleFlag)}`),
    );
  }
}
