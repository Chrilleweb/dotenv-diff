import chalk from 'chalk';

/**
 * Prints the header for the scanning output.
 * @param comparedAgainst Optional string indicating what the codebase is being compared against.
 * @returns void
 */
export function printHeader(comparedAgainst?: string): void {
  if (comparedAgainst) {
    console.log();
    console.log(
      chalk.magenta(`📋 Comparing codebase usage against: ${comparedAgainst}`),
    );
  }
}
