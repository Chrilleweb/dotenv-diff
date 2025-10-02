import chalk from 'chalk';

/**
 * Prints the header for the scanning output.
 * @returns void
 */
export function printHeader(){
    console.log();
    console.log(
      chalk.blue('🔍 Scanning codebase for environment variable usage...'),
    );
    console.log();
}