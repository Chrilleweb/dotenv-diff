import chalk from 'chalk';

/**
 * Prints the unique environment variables found in the codebase.
 * @param variables Array of unique environment variable names
 * @returns void
 */
export function printUniqueVariables(variables: number): void {
  if (variables === 0) {
    return;
  }

  console.log(
    chalk.blue(`🌐 Found ${variables} unique environment variables in use`),
  );
  console.log();
}
