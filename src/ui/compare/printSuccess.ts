import chalk from 'chalk';

/**
 * Prints success messages when everything is OK.
 *
 * @param json - Whether to output in JSON format.
 * @param mode - "compare" or "scan" mode.
 * @param comparedAgainst - Name of env/example file (optional).
 * @param unused - List of unused variables (optional, only for scan).
 * @param showUnused - Whether to print unused success info.
 */
export function printSuccess(
  json: boolean,
  mode: 'compare' | 'scan' = 'compare',
  comparedAgainst?: string,
  unused: string[] = [],
  showUnused = false,
): void {
  if (json) return;

  if (mode === 'compare') {
    console.log(chalk.green('✅ All keys match.'));
    console.log();
    return;
  }

  if (mode === 'scan' && comparedAgainst) {
    console.log(
      chalk.green(
        `✅ All used environment variables are defined in ${comparedAgainst}`,
      ),
    );

    if (showUnused && unused.length === 0) {
      console.log(chalk.green('✅ No unused environment variables found'));
    }
    console.log();
  }
}
