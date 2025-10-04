import chalk from 'chalk';

/**
 * Prints a comparison error message.
 * @param message The error message to print
 * @param shouldExit Whether the process should exit
 * @param json Whether to format the output as JSON
 * @returns An object indicating whether the process should exit
 */
export function printComparisonError(
  message: string,
  shouldExit: boolean,
  json: boolean,
): { exit: boolean } {
  const errorMessage = `⚠️  ${message}`;

  if (shouldExit) {
    console.log(chalk.red(errorMessage.replace('⚠️', '❌')));
    return { exit: true };
  }

  if (!json) {
    console.log(chalk.yellow(errorMessage));
  }

  return { exit: false };
}
